const express = require('express');
const { body, param, query } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, requireRole, logUserAction } = require('../middleware/auth');
const { commonValidations, validate, validatePagination } = require('../utils/validation');

const router = express.Router();

// Get all sites
router.get('/', [
  authenticateToken,
  requireRole(['super_admin', 'site_admin']),
  validatePagination
], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const projectId = req.query.projectId;
    const status = req.query.status;
    const search = req.query.search;

    let query = `
      SELECT s.id, s.name, s.project_id, s.location, s.description, s.status, s.assigned_supervisor_id, s.created_at, s.updated_at,
             p.name as project_name, p.company_id,
             c.name as company_name,
             u.first_name as supervisor_name, u.last_name as supervisor_lastname,
             COUNT(wt.id) as worker_type_count
      FROM sites s
      JOIN projects p ON p.id = s.project_id
      JOIN companies c ON c.id = p.company_id
      LEFT JOIN users u ON u.id = s.assigned_supervisor_id
      LEFT JOIN worker_types wt ON wt.site_id = s.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCount = 0;

    if (projectId) {
      paramCount++;
      query += ` AND s.project_id = $${paramCount}`;
      queryParams.push(projectId);
    }

    if (status) {
      paramCount++;
      query += ` AND s.status = $${paramCount}`;
      queryParams.push(status);
    }

    if (search) {
      paramCount++;
      query += ` AND (s.name ILIKE $${paramCount} OR s.location ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    query += ` GROUP BY s.id, p.name, p.company_id, c.name, u.first_name, u.last_name 
               ORDER BY s.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) FROM sites s
      JOIN projects p ON p.id = s.project_id
      WHERE 1=1
    `;
    const countParams = [];
    let countParamCount = 0;

    if (projectId) {
      countParamCount++;
      countQuery += ` AND s.project_id = $${countParamCount}`;
      countParams.push(projectId);
    }

    if (status) {
      countParamCount++;
      countQuery += ` AND s.status = $${countParamCount}`;
      countParams.push(status);
    }

    if (search) {
      countParamCount++;
      countQuery += ` AND (s.name ILIKE $${countParamCount} OR s.location ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        sites: result.rows.map(site => ({
          id: site.id,
          name: site.name,
          projectId: site.project_id,
          projectName: site.project_name,
          companyId: site.company_id,
          companyName: site.company_name,
          location: site.location,
          description: site.description,
          status: site.status,
          assignedSupervisorId: site.assigned_supervisor_id,
          supervisorName: site.supervisor_name ? `${site.supervisor_name} ${site.supervisor_lastname}` : null,
          workerTypeCount: parseInt(site.worker_type_count),
          createdAt: site.created_at,
          updatedAt: site.updated_at
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
    console.error('Get sites error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sites'
    });
  }
});

// Get site by ID
router.get('/:id', [
  authenticateToken,
  requireRole(['super_admin', 'site_admin']),
  param('id').isUUID(),
  validate
], async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT s.id, s.name, s.project_id, s.location, s.description, s.status, s.assigned_supervisor_id, s.created_at, s.updated_at,
              p.name as project_name, p.company_id,
              c.name as company_name, c.contact_person as company_contact,
              u.first_name as supervisor_name, u.last_name as supervisor_lastname, u.email as supervisor_email
       FROM sites s
       JOIN projects p ON p.id = s.project_id
       JOIN companies c ON c.id = p.company_id
       LEFT JOIN users u ON u.id = s.assigned_supervisor_id
       WHERE s.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }

    const site = result.rows[0];

    // Get worker types for this site
    const workerTypesResult = await pool.query(
      `SELECT wt.id, wt.name, wt.daily_rate, wt.description, wt.minimum_tasks, wt.is_active
       FROM worker_types wt
       WHERE wt.site_id = $1
       ORDER BY wt.created_at ASC`,
      [id]
    );

    // Get recent daily records
    const dailyRecordsResult = await pool.query(
      `SELECT dr.id, dr.work_date, dr.weather_condition, dr.notes, dr.is_locked,
              u.first_name as supervisor_name, u.last_name as supervisor_lastname,
              COUNT(wa.id) as attendance_records
       FROM daily_records dr
       LEFT JOIN users u ON u.id = dr.supervisor_id
       LEFT JOIN worker_attendance wa ON wa.daily_record_id = dr.id
       WHERE dr.site_id = $1
       GROUP BY dr.id, u.first_name, u.last_name
       ORDER BY dr.work_date DESC
       LIMIT 10`,
      [id]
    );

    res.json({
      success: true,
      data: {
        id: site.id,
        name: site.name,
        projectId: site.project_id,
        projectName: site.project_name,
        companyId: site.company_id,
        companyName: site.company_name,
        companyContact: site.company_contact,
        location: site.location,
        description: site.description,
        status: site.status,
        assignedSupervisorId: site.assigned_supervisor_id,
        supervisorName: site.supervisor_name ? `${site.supervisor_name} ${site.supervisor_lastname}` : null,
        supervisorEmail: site.supervisor_email,
        createdAt: site.created_at,
        updatedAt: site.updated_at,
        workerTypes: workerTypesResult.rows.map(wt => ({
          id: wt.id,
          name: wt.name,
          dailyRate: parseFloat(wt.daily_rate),
          description: wt.description,
          minimumTasks: wt.minimum_tasks,
          isActive: wt.is_active
        })),
        recentDailyRecords: dailyRecordsResult.rows.map(dr => ({
          id: dr.id,
          workDate: dr.work_date,
          weatherCondition: dr.weather_condition,
          notes: dr.notes,
          isLocked: dr.is_locked,
          supervisorName: dr.supervisor_name ? `${dr.supervisor_name} ${dr.supervisor_lastname}` : null,
          attendanceRecords: parseInt(dr.attendance_records)
        }))
      }
    });

  } catch (error) {
    console.error('Get site error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch site'
    });
  }
});

// Create new site
router.post('/', [
  authenticateToken,
  requireRole(['super_admin']),
  body('name').trim().isLength({ min: 2, max: 255 }).withMessage('Site name is required'),
  body('projectId').isUUID().withMessage('Valid project ID is required'),
  body('location').trim().isLength({ min: 2, max: 255 }).withMessage('Location is required'),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('status').optional().isIn(['active', 'inactive', 'completed']).withMessage('Valid status is required'),
  validate,
  logUserAction('CREATE_SITE', 'sites')
], async (req, res) => {
  try {
    const { name, projectId, location, description, status = 'active' } = req.body;

    // Verify project exists
    const projectResult = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND status = $2',
      [projectId, 'active']
    );

    if (projectResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Project not found or inactive'
      });
    }

    // Check if site name already exists for this project
    const existingSite = await pool.query(
      'SELECT id FROM sites WHERE name = $1 AND project_id = $2',
      [name, projectId]
    );

    if (existingSite.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Site with this name already exists for this project'
      });
    }

    // Create site
    const result = await pool.query(
      `INSERT INTO sites (name, project_id, location, description, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, project_id, location, description, status, created_at`,
      [name, projectId, location, description, status, req.user.id]
    );

    const site = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'Site created successfully',
      data: {
        id: site.id,
        name: site.name,
        projectId: site.project_id,
        location: site.location,
        description: site.description,
        status: site.status,
        createdAt: site.created_at
      }
    });

  } catch (error) {
    console.error('Create site error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create site'
    });
  }
});

// Update site
router.put('/:id', [
  authenticateToken,
  requireRole(['super_admin']),
  param('id').isUUID(),
  body('name').optional().trim().isLength({ min: 2, max: 255 }),
  body('location').optional().trim().isLength({ min: 2, max: 255 }),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('status').optional().isIn(['active', 'inactive', 'completed']),
  validate,
  logUserAction('UPDATE_SITE', 'sites')
], async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, description, status } = req.body;

    // Check if site exists
    const existingSite = await pool.query(
      'SELECT id, project_id FROM sites WHERE id = $1',
      [id]
    );

    if (existingSite.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }

    // Check if name is being changed and if it conflicts
    if (name) {
      const nameConflict = await pool.query(
        'SELECT id FROM sites WHERE name = $1 AND project_id = $2 AND id != $3',
        [name, existingSite.rows[0].project_id, id]
      );

      if (nameConflict.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Site with this name already exists for this project'
        });
      }
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 0;

    if (name !== undefined) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      values.push(name);
    }

    if (location !== undefined) {
      paramCount++;
      updates.push(`location = $${paramCount}`);
      values.push(location);
    }

    if (description !== undefined) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      values.push(description);
    }

    if (status !== undefined) {
      paramCount++;
      updates.push(`status = $${paramCount}`);
      values.push(status);
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

    const query = `UPDATE sites SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);

    const site = result.rows[0];

    res.json({
      success: true,
      message: 'Site updated successfully',
      data: {
        id: site.id,
        name: site.name,
        projectId: site.project_id,
        location: site.location,
        description: site.description,
        status: site.status,
        updatedAt: site.updated_at
      }
    });

  } catch (error) {
    console.error('Update site error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update site'
    });
  }
});

// Assign supervisor to site
router.post('/:id/assign-supervisor', [
  authenticateToken,
  requireRole(['super_admin']),
  param('id').isUUID(),
  body('supervisorId').isUUID().withMessage('Valid supervisor ID is required'),
  validate,
  logUserAction('ASSIGN_SUPERVISOR', 'sites')
], async (req, res) => {
  try {
    const { id } = req.params;
    const { supervisorId } = req.body;

    // Check if site exists
    const siteResult = await pool.query(
      'SELECT id, name FROM sites WHERE id = $1',
      [id]
    );

    if (siteResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }

    // Check if supervisor exists and has supervisor role
    const supervisorResult = await pool.query(
      'SELECT id, first_name, last_name FROM users WHERE id = $1 AND role = $2 AND is_active = true',
      [supervisorId, 'supervisor']
    );

    if (supervisorResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Supervisor not found or inactive'
      });
    }

    // Check if supervisor is already assigned to another site
    const existingAssignment = await pool.query(
      'SELECT id, name FROM sites WHERE assigned_supervisor_id = $1 AND id != $2',
      [supervisorId, id]
    );

    if (existingAssignment.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Supervisor is already assigned to site: ${existingAssignment.rows[0].name}`
      });
    }

    // Assign supervisor
    await pool.query(
      'UPDATE sites SET assigned_supervisor_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [supervisorId, id]
    );

    const supervisor = supervisorResult.rows[0];

    res.json({
      success: true,
      message: 'Supervisor assigned successfully',
      data: {
        siteId: id,
        siteName: siteResult.rows[0].name,
        supervisorId: supervisorId,
        supervisorName: `${supervisor.first_name} ${supervisor.last_name}`
      }
    });

  } catch (error) {
    console.error('Assign supervisor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign supervisor'
    });
  }
});

// Remove supervisor from site
router.delete('/:id/remove-supervisor', [
  authenticateToken,
  requireRole(['super_admin']),
  param('id').isUUID(),
  validate,
  logUserAction('REMOVE_SUPERVISOR', 'sites')
], async (req, res) => {
  try {
    const { id } = req.params;

    // Check if site exists
    const siteResult = await pool.query(
      'SELECT id, name, assigned_supervisor_id FROM sites WHERE id = $1',
      [id]
    );

    if (siteResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }

    if (!siteResult.rows[0].assigned_supervisor_id) {
      return res.status(400).json({
        success: false,
        message: 'No supervisor assigned to this site'
      });
    }

    // Remove supervisor assignment
    await pool.query(
      'UPDATE sites SET assigned_supervisor_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    res.json({
      success: true,
      message: 'Supervisor removed successfully',
      data: {
        siteId: id,
        siteName: siteResult.rows[0].name
      }
    });

  } catch (error) {
    console.error('Remove supervisor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove supervisor'
    });
  }
});

// Delete site
router.delete('/:id', [
  authenticateToken,
  requireRole(['super_admin']),
  param('id').isUUID(),
  validate,
  logUserAction('DELETE_SITE', 'sites')
], async (req, res) => {
  try {
    const { id } = req.params;

    // Check if site exists
    const existingSite = await pool.query(
      'SELECT id, status FROM sites WHERE id = $1',
      [id]
    );

    if (existingSite.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }

    // Check if site has daily records
    const dailyRecords = await pool.query(
      'SELECT COUNT(*) FROM daily_records WHERE site_id = $1',
      [id]
    );

    if (parseInt(dailyRecords.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete site with existing daily records'
      });
    }

    // Delete site (cascade will handle related records)
    await pool.query('DELETE FROM sites WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Site deleted successfully'
    });

  } catch (error) {
    console.error('Delete site error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete site'
    });
  }
});

module.exports = router;