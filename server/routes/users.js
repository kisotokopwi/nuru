const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken, requireSuperAdmin } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all users
router.get('/', [
  requireSuperAdmin
], async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      role = '',
      status = 'all'
    } = req.query;
    
    const offset = (page - 1) * limit;

    let whereClause = '';
    let queryParams = [];
    let paramCount = 1;

    // Build search condition
    if (search) {
      whereClause += `WHERE (u.username ILIKE $${paramCount} OR u.full_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
      paramCount++;
    }

    // Build role filter
    if (role) {
      whereClause += whereClause ? ` AND u.role = $${paramCount}` : `WHERE u.role = $${paramCount}`;
      queryParams.push(role);
      paramCount++;
    }

    // Build status condition
    if (status === 'active') {
      whereClause += whereClause ? ` AND u.is_active = true` : `WHERE u.is_active = true`;
    } else if (status === 'inactive') {
      whereClause += whereClause ? ` AND u.is_active = false` : `WHERE u.is_active = false`;
    }

    // Get users with site assignment info
    const usersResult = await query(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.role,
        u.full_name,
        u.phone,
        u.is_active,
        u.created_at,
        u.updated_at,
        ss.site_id,
        s.name as assigned_site_name,
        s.client_company as assigned_site_client
      FROM users u
      LEFT JOIN site_supervisors ss ON u.id = ss.supervisor_id AND ss.is_active = true
      LEFT JOIN sites s ON ss.site_id = s.id
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `, [...queryParams, limit, offset]);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM users u
      ${whereClause}
    `, queryParams);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      users: usersResult.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single user
router.get('/:id', [
  requireSuperAdmin
], async (req, res) => {
  try {
    const { id } = req.params;

    const userResult = await query(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.role,
        u.full_name,
        u.phone,
        u.is_active,
        u.created_at,
        u.updated_at
      FROM users u
      WHERE u.id = $1
    `, [id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get site assignments for supervisors
    let siteAssignments = [];
    if (userResult.rows[0].role === 'supervisor') {
      const assignmentsResult = await query(`
        SELECT 
          ss.*,
          s.name as site_name,
          s.location as site_location,
          s.client_company,
          p.name as project_name,
          assigner.full_name as assigned_by_name
        FROM site_supervisors ss
        JOIN sites s ON ss.site_id = s.id
        JOIN projects p ON s.project_id = p.id
        LEFT JOIN users assigner ON ss.assigned_by = assigner.id
        WHERE ss.supervisor_id = $1
        ORDER BY ss.assigned_at DESC
      `, [id]);

      siteAssignments = assignmentsResult.rows;
    }

    // Get user activity summary
    const activityResult = await query(`
      SELECT 
        COUNT(CASE WHEN u.role = 'supervisor' THEN dr.id END) as daily_records_created,
        COUNT(CASE WHEN u.role = 'supervisor' THEN sdc.id END) as corrections_made,
        COUNT(CASE WHEN u.role = 'supervisor' THEN i.id END) as invoices_generated,
        COUNT(at.id) as audit_actions
      FROM users u
      LEFT JOIN daily_records dr ON u.id = dr.supervisor_id
      LEFT JOIN same_day_corrections sdc ON u.id = sdc.corrected_by
      LEFT JOIN invoices i ON u.id = i.generated_by
      LEFT JOIN audit_trail at ON u.id = at.user_id
      WHERE u.id = $1
      GROUP BY u.id
    `, [id]);

    const user = userResult.rows[0];
    user.site_assignments = siteAssignments;
    user.activity_summary = activityResult.rows[0] || {
      daily_records_created: 0,
      corrections_made: 0,
      invoices_generated: 0,
      audit_actions: 0
    };

    res.json({ user });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user
router.put('/:id', [
  requireSuperAdmin,
  body('username').optional().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('role').optional().isIn(['super_admin', 'site_admin', 'supervisor']).withMessage('Invalid role'),
  body('full_name').optional().notEmpty().withMessage('Full name cannot be empty'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean')
], auditMiddleware('users'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { id } = req.params;
    const { username, email, role, full_name, phone, is_active } = req.body;

    // Check if user exists
    const existingUser = await query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if new username conflicts with existing users
    if (username && username !== existingUser.rows[0].username) {
      const usernameConflict = await query(
        'SELECT id FROM users WHERE username = $1 AND id != $2',
        [username, id]
      );

      if (usernameConflict.rows.length > 0) {
        return res.status(400).json({ error: 'Username already exists' });
      }
    }

    // Check if new email conflicts with existing users
    if (email && email !== existingUser.rows[0].email) {
      const emailConflict = await query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, id]
      );

      if (emailConflict.rows.length > 0) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (username !== undefined) {
      updates.push(`username = $${paramCount++}`);
      values.push(username);
    }

    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }

    if (role !== undefined) {
      updates.push(`role = $${paramCount++}`);
      values.push(role);
    }

    if (full_name !== undefined) {
      updates.push(`full_name = $${paramCount++}`);
      values.push(full_name);
    }

    if (phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(phone);
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const userResult = await query(`
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, username, email, role, full_name, phone, is_active, updated_at
    `, values);

    res.json({
      message: 'User updated successfully',
      user: userResult.rows[0]
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Deactivate user
router.put('/:id/deactivate', [
  requireSuperAdmin
], auditMiddleware('users'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is already inactive
    if (!existingUser.rows[0].is_active) {
      return res.status(400).json({ error: 'User is already inactive' });
    }

    // Deactivate user
    await query(
      'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    // If user is a supervisor, deactivate their site assignments
    if (existingUser.rows[0].role === 'supervisor') {
      await query(
        'UPDATE site_supervisors SET is_active = false WHERE supervisor_id = $1',
        [id]
      );
    }

    res.json({ message: 'User deactivated successfully' });

  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Activate user
router.put('/:id/activate', [
  requireSuperAdmin
], auditMiddleware('users'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is already active
    if (existingUser.rows[0].is_active) {
      return res.status(400).json({ error: 'User is already active' });
    }

    // Activate user
    await query(
      'UPDATE users SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    res.json({ message: 'User activated successfully' });

  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset user password
router.put('/:id/reset-password', [
  requireSuperAdmin,
  body('new_password').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { id } = req.params;
    const { new_password } = req.body;

    // Check if user exists
    const existingUser = await query(
      'SELECT id FROM users WHERE id = $1',
      [id]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash new password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, id]
    );

    res.json({ message: 'Password reset successfully' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user statistics
router.get('/statistics/summary', [
  requireSuperAdmin
], async (req, res) => {
  try {
    // Get user counts by role
    const roleStats = await query(`
      SELECT 
        role,
        COUNT(*) as count,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_count
      FROM users
      GROUP BY role
      ORDER BY role
    `);

    // Get user activity statistics
    const activityStats = await query(`
      SELECT 
        u.role,
        COUNT(DISTINCT dr.supervisor_id) as supervisors_with_records,
        COUNT(dr.id) as total_records_created,
        COUNT(DISTINCT sdc.corrected_by) as users_with_corrections,
        COUNT(sdc.id) as total_corrections,
        COUNT(DISTINCT i.generated_by) as users_generated_invoices,
        COUNT(i.id) as total_invoices_generated
      FROM users u
      LEFT JOIN daily_records dr ON u.id = dr.supervisor_id
      LEFT JOIN same_day_corrections sdc ON u.id = sdc.corrected_by
      LEFT JOIN invoices i ON u.id = i.generated_by
      GROUP BY u.role
    `);

    // Get recent user activity
    const recentActivity = await query(`
      SELECT 
        u.username,
        u.full_name,
        u.role,
        u.created_at as user_created_at,
        MAX(dr.created_at) as last_record_created,
        MAX(sdc.corrected_at) as last_correction_made,
        MAX(i.generated_at) as last_invoice_generated
      FROM users u
      LEFT JOIN daily_records dr ON u.id = dr.supervisor_id
      LEFT JOIN same_day_corrections sdc ON u.id = sdc.corrected_by
      LEFT JOIN invoices i ON u.id = i.generated_by
      WHERE u.is_active = true
      GROUP BY u.id, u.username, u.full_name, u.role, u.created_at
      ORDER BY u.created_at DESC
      LIMIT 10
    `);

    res.json({
      by_role: roleStats.rows,
      activity: activityStats.rows,
      recent_users: recentActivity.rows
    });

  } catch (error) {
    console.error('Get user statistics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;