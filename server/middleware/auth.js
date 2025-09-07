const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify user still exists and is active
    const userResult = await pool.query(
      'SELECT id, email, first_name, last_name, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const user = userResult.rows[0];
    
    if (!user.is_active) {
      return res.status(401).json({ 
        success: false, 
        message: 'User account is deactivated' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired' 
      });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Authentication error' 
    });
  }
};

// Middleware to check user roles
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }

    next();
  };
};

// Middleware to check if user is supervisor of specific site
const requireSiteAccess = async (req, res, next) => {
  try {
    if (req.user.role === 'super_admin' || req.user.role === 'site_admin') {
      return next(); // Super admins and site admins have access to all sites
    }

    if (req.user.role !== 'supervisor') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    const siteId = req.params.siteId || req.body.siteId || req.query.siteId;
    
    if (!siteId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Site ID required' 
      });
    }

    // Check if supervisor is assigned to this site
    const siteResult = await pool.query(
      'SELECT id FROM sites WHERE id = $1 AND assigned_supervisor_id = $2',
      [siteId, req.user.id]
    );

    if (siteResult.rows.length === 0) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied to this site' 
      });
    }

    next();
  } catch (error) {
    console.error('Site access middleware error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Authorization error' 
    });
  }
};

// Middleware to log user actions for audit trail
const logUserAction = (action, tableName = null) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log the action after response is sent
      if (req.user && res.statusCode < 400) {
        logAction(req, action, tableName, data);
      }
      originalSend.call(this, data);
    };
    
    next();
  };
};

async function logAction(req, action, tableName, responseData) {
  try {
    const recordId = req.params.id || req.body.id || null;
    const oldValues = req.oldValues || null;
    const newValues = req.body || null;
    
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        req.user.id,
        action,
        tableName,
        recordId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        req.ip || req.connection.remoteAddress,
        req.get('User-Agent')
      ]
    );
  } catch (error) {
    console.error('Failed to log user action:', error);
  }
}

module.exports = {
  authenticateToken,
  requireRole,
  requireSiteAccess,
  logUserAction
};