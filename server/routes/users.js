const express = require('express');
const bcrypt = require('bcryptjs');
const { body, param, query } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, requireRole, logUserAction } = require('../middleware/auth');
const { commonValidations, validate, validatePagination } = require('../utils/validation');

const router = express.Router();

// Get all users (Super Admin only)
router.get('/', [
  authenticateToken,
  requireRole(['super_admin']),
  validatePagination
], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const role = req.query.role;
    const search = req.query.search;

    let query = `
      SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.phone, 
             u.is_active, u.created_at, u.last_login,
             s.id as assigned_site_id, s.name as assigned_site_name
      FROM users u
      LEFT JOIN sites s ON s.assigned_supervisor_id = u.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCount = 0;

    if (role) {
      paramCount++;
      query += ` AND u.role = $${paramCount}`;
      queryParams.push(role);
    }

    if (search) {
      paramCount++;
      query += ` AND (u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    query += ` ORDER BY u.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM users u WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;

    if (role) {
      countParamCount++;
      countQuery += ` AND u.role = $${countParamCount}`;
      countParams.push(role);
    }

    if (search) {
      countParamCount++;
      countQuery += ` AND (u.first_name ILIKE $${countParamCount} OR u.last_name ILIKE $${countParamCount} OR u.email ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        users: result.rows.map(user => ({
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          phone: user.phone,
          isActive: user.is_active,
          createdAt: user.created_at,
          lastLogin: user.last_login,
          assignedSite: user.assigned_site_id ? {
            id: user.assigned_site_id,
            name: user.assigned_site_name
          } : null
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// Get user by ID
router.get('/:id', [
  authenticateToken,
  requireRole(['super_admin', 'site_admin']),
  param('id').isUUID(),
  validate
], async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.phone, 
              u.is_active, u.created_at, u.last_login,
              s.id as assigned_site_id, s.name as assigned_site_name, s.location as assigned_site_location
       FROM users u
       LEFT JOIN sites s ON s.assigned_supervisor_id = u.id
       WHERE u.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        phone: user.phone,
        isActive: user.is_active,
        createdAt: user.created_at,
        lastLogin: user.last_login,
        assignedSite: user.assigned_site_id ? {
          id: user.assigned_site_id,
          name: user.assigned_site_name,
          location: user.assigned_site_location
        } : null
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user'
    });
  }
});

// Create new user
router.post('/', [
  authenticateToken,
  requireRole(['super_admin']),
  commonValidations.email,
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').trim().isLength({ min: 2, max: 100 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 2, max: 100 }).withMessage('Last name is required'),
  body('role').isIn(['super_admin', 'site_admin', 'supervisor']).withMessage('Valid role is required'),
  commonValidations.phone,
  validate,
  logUserAction('CREATE_USER', 'users')
], async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, phone } = req.body;

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, first_name, last_name, role, phone, is_active, created_at`,
      [email, hashedPassword, firstName, lastName, role, phone]
    );

    const user = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        phone: user.phone,
        isActive: user.is_active,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }
});

// Update user
router.put('/:id', [
  authenticateToken,
  requireRole(['super_admin']),
  param('id').isUUID(),
  body('firstName').optional().trim().isLength({ min: 2, max: 100 }),
  body('lastName').optional().trim().isLength({ min: 2, max: 100 }),
  body('role').optional().isIn(['super_admin', 'site_admin', 'supervisor']),
  body('phone').optional().isMobilePhone('any'),
  body('isActive').optional().isBoolean(),
  validate,
  logUserAction('UPDATE_USER', 'users')
], async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, role, phone, isActive } = req.body;

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [id]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 0;

    if (firstName !== undefined) {
      paramCount++;
      updates.push(`first_name = $${paramCount}`);
      values.push(firstName);
    }

    if (lastName !== undefined) {
      paramCount++;
      updates.push(`last_name = $${paramCount}`);
      values.push(lastName);
    }

    if (role !== undefined) {
      paramCount++;
      updates.push(`role = $${paramCount}`);
      values.push(role);
    }

    if (phone !== undefined) {
      paramCount++;
      updates.push(`phone = $${paramCount}`);
      values.push(phone);
    }

    if (isActive !== undefined) {
      paramCount++;
      updates.push(`is_active = $${paramCount}`);
      values.push(isActive);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    paramCount++;
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);

    const user = result.rows[0];

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        phone: user.phone,
        isActive: user.is_active,
        updatedAt: user.updated_at
      }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
});

// Delete user (soft delete by deactivating)
router.delete('/:id', [
  authenticateToken,
  requireRole(['super_admin']),
  param('id').isUUID(),
  validate,
  logUserAction('DELETE_USER', 'users')
], async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id, role FROM users WHERE id = $1',
      [id]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting super admin
    if (existingUser.rows[0].role === 'super_admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete super admin user'
      });
    }

    // Soft delete by deactivating
    await pool.query(
      'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
});

// Get user performance (for supervisors)
router.get('/:id/performance', [
  authenticateToken,
  requireRole(['super_admin', 'site_admin']),
  param('id').isUUID(),
  validate
], async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    let query = `
      SELECT sp.work_date, sp.corrections_count, sp.last_correction_at, sp.performance_notes,
             s.name as site_name, s.location as site_location
      FROM supervisor_performance sp
      JOIN sites s ON s.id = sp.site_id
      WHERE sp.supervisor_id = $1
    `;
    
    const queryParams = [id];
    let paramCount = 1;

    if (startDate) {
      paramCount++;
      query += ` AND sp.work_date >= $${paramCount}`;
      queryParams.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND sp.work_date <= $${paramCount}`;
      queryParams.push(endDate);
    }

    query += ` ORDER BY sp.work_date DESC`;

    const result = await pool.query(query, queryParams);

    res.json({
      success: true,
      data: result.rows.map(perf => ({
        workDate: perf.work_date,
        correctionsCount: perf.corrections_count,
        lastCorrectionAt: perf.last_correction_at,
        performanceNotes: perf.performance_notes,
        site: {
          name: perf.site_name,
          location: perf.site_location
        }
      }))
    });

  } catch (error) {
    console.error('Get user performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user performance'
    });
  }
});

module.exports = router;