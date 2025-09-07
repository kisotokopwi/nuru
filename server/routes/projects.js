const express = require('express');
const { body, param, query } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, requireRole, logUserAction } = require('../middleware/auth');
const { commonValidations, validate, validatePagination } = require('../utils/validation');

const router = express.Router();

// Get all projects
router.get('/', [
  authenticateToken,
  requireRole(['super_admin', 'site_admin']),
  validatePagination
], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const companyId = req.query.companyId;
    const status = req.query.status;
    const search = req.query.search;

    let query = `
      SELECT p.id, p.name, p.description, p.company_id, p.start_date, p.end_date, p.status, p.created_at, p.updated_at,
             c.name as company_name, c.contact_person as company_contact,
             COUNT(s.id) as site_count,
             u.first_name as created_by_name, u.last_name as created_by_lastname
      FROM projects p
      JOIN companies c ON c.id = p.company_id
      LEFT JOIN sites s ON s.project_id = p.id
      LEFT JOIN users u ON u.id = p.created_by
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCount = 0;

    if (companyId) {
      paramCount++;
      query += ` AND p.company_id = $${paramCount}`;
      queryParams.push(companyId);
    }

    if (status) {
      paramCount++;
      query += ` AND p.status = $${paramCount}`;
      queryParams.push(status);
    }

    if (search) {
      paramCount++;
      query += ` AND (p.name ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    query += ` GROUP BY p.id, c.name, c.contact_person, u.first_name, u.last_name 
               ORDER BY p.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) FROM projects p
      JOIN companies c ON c.id = p.company_id
      WHERE 1=1
    `;
    const countParams = [];
    let countParamCount = 0;

    if (companyId) {
      countParamCount++;
      countQuery += ` AND p.company_id = $${countParamCount}`;
      countParams.push(companyId);
    }

    if (status) {
      countParamCount++;
      countQuery += ` AND p.status = $${countParamCount}`;
      countParams.push(status);
    }

    if (search) {
      countParamCount++;
      countQuery += ` AND (p.name ILIKE $${countParamCount} OR p.description ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        projects: result.rows.map(project => ({
          id: project.id,
          name: project.name,
          description: project.description,
          companyId: project.company_id,
          companyName: project.company_name,
          companyContact: project.company_contact,
          startDate: project.start_date,
          endDate: project.end_date,
          status: project.status,
          siteCount: parseInt(project.site_count),
          createdBy: project.created_by_name ? `${project.created_by_name} ${project.created_by_lastname}` : null,
          createdAt: project.created_at,
          updatedAt: project.updated_at
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
    console.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch projects'
    });
  }
});

// Get project by ID
router.get('/:id', [
  authenticateToken,
  requireRole(['super_admin', 'site_admin']),
  param('id').isUUID(),
  validate
], async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT p.id, p.name, p.description, p.company_id, p.start_date, p.end_date, p.status, p.created_at, p.updated_at,
              c.name as company_name, c.contact_person as company_contact, c.email as company_email,
              u.first_name as created_by_name, u.last_name as created_by_lastname
       FROM projects p
       JOIN companies c ON c.id = p.company_id
       LEFT JOIN users u ON u.id = p.created_by
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const project = result.rows[0];

    // Get sites for this project
    const sitesResult = await pool.query(
      `SELECT s.id, s.name, s.location, s.description, s.status, s.assigned_supervisor_id,
              u.first_name as supervisor_name, u.last_name as supervisor_lastname,
              COUNT(wt.id) as worker_type_count
       FROM sites s
       LEFT JOIN users u ON u.id = s.assigned_supervisor_id
       LEFT JOIN worker_types wt ON wt.site_id = s.id
       WHERE s.project_id = $1
       GROUP BY s.id, u.first_name, u.last_name
       ORDER BY s.created_at DESC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        id: project.id,
        name: project.name,
        description: project.description,
        companyId: project.company_id,
        companyName: project.company_name,
        companyContact: project.company_contact,
        companyEmail: project.company_email,
        startDate: project.start_date,
        endDate: project.end_date,
        status: project.status,
        createdBy: project.created_by_name ? `${project.created_by_name} ${project.created_by_lastname}` : null,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
        sites: sitesResult.rows.map(site => ({
          id: site.id,
          name: site.name,
          location: site.location,
          description: site.description,
          status: site.status,
          assignedSupervisorId: site.assigned_supervisor_id,
          supervisorName: site.supervisor_name ? `${site.supervisor_name} ${site.supervisor_lastname}` : null,
          workerTypeCount: parseInt(site.worker_type_count)
        }))
      }
    });

  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project'
    });
  }
});

// Create new project
router.post('/', [
  authenticateToken,
  requireRole(['super_admin']),
  body('name').trim().isLength({ min: 2, max: 255 }).withMessage('Project name is required'),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('companyId').isUUID().withMessage('Valid company ID is required'),
  body('startDate').optional().isISO8601().withMessage('Valid start date is required'),
  body('endDate').optional().isISO8601().withMessage('Valid end date is required'),
  body('status').optional().isIn(['active', 'completed', 'suspended']).withMessage('Valid status is required'),
  validate,
  logUserAction('CREATE_PROJECT', 'projects')
], async (req, res) => {
  try {
    const { name, description, companyId, startDate, endDate, status = 'active' } = req.body;

    // Verify company exists
    const companyResult = await pool.query(
      'SELECT id FROM companies WHERE id = $1 AND is_active = true',
      [companyId]
    );

    if (companyResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Company not found or inactive'
      });
    }

    // Check if project name already exists for this company
    const existingProject = await pool.query(
      'SELECT id FROM projects WHERE name = $1 AND company_id = $2',
      [name, companyId]
    );

    if (existingProject.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Project with this name already exists for this company'
      });
    }

    // Create project
    const result = await pool.query(
      `INSERT INTO projects (name, description, company_id, start_date, end_date, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, description, company_id, start_date, end_date, status, created_at`,
      [name, description, companyId, startDate, endDate, status, req.user.id]
    );

    const project = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: {
        id: project.id,
        name: project.name,
        description: project.description,
        companyId: project.company_id,
        startDate: project.start_date,
        endDate: project.end_date,
        status: project.status,
        createdAt: project.created_at
      }
    });

  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create project'
    });
  }
});

// Update project
router.put('/:id', [
  authenticateToken,
  requireRole(['super_admin']),
  param('id').isUUID(),
  body('name').optional().trim().isLength({ min: 2, max: 255 }),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601(),
  body('status').optional().isIn(['active', 'completed', 'suspended']),
  validate,
  logUserAction('UPDATE_PROJECT', 'projects')
], async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, startDate, endDate, status } = req.body;

    // Check if project exists
    const existingProject = await pool.query(
      'SELECT id, company_id FROM projects WHERE id = $1',
      [id]
    );

    if (existingProject.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if name is being changed and if it conflicts
    if (name) {
      const nameConflict = await pool.query(
        'SELECT id FROM projects WHERE name = $1 AND company_id = $2 AND id != $3',
        [name, existingProject.rows[0].company_id, id]
      );

      if (nameConflict.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Project with this name already exists for this company'
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

    if (description !== undefined) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      values.push(description);
    }

    if (startDate !== undefined) {
      paramCount++;
      updates.push(`start_date = $${paramCount}`);
      values.push(startDate);
    }

    if (endDate !== undefined) {
      paramCount++;
      updates.push(`end_date = $${paramCount}`);
      values.push(endDate);
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

    const query = `UPDATE projects SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);

    const project = result.rows[0];

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: {
        id: project.id,
        name: project.name,
        description: project.description,
        companyId: project.company_id,
        startDate: project.start_date,
        endDate: project.end_date,
        status: project.status,
        updatedAt: project.updated_at
      }
    });

  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update project'
    });
  }
});

// Delete project
router.delete('/:id', [
  authenticateToken,
  requireRole(['super_admin']),
  param('id').isUUID(),
  validate,
  logUserAction('DELETE_PROJECT', 'projects')
], async (req, res) => {
  try {
    const { id } = req.params;

    // Check if project exists
    const existingProject = await pool.query(
      'SELECT id, status FROM projects WHERE id = $1',
      [id]
    );

    if (existingProject.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if project has active sites
    const activeSites = await pool.query(
      'SELECT COUNT(*) FROM sites WHERE project_id = $1 AND status = $2',
      [id, 'active']
    );

    if (parseInt(activeSites.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete project with active sites'
      });
    }

    // Delete project (cascade will handle related records)
    await pool.query('DELETE FROM projects WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });

  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete project'
    });
  }
});

// Get project statistics
router.get('/:id/statistics', [
  authenticateToken,
  requireRole(['super_admin', 'site_admin']),
  param('id').isUUID(),
  validate
], async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    // Get basic project info
    const projectResult = await pool.query(
      'SELECT name, status FROM projects WHERE id = $1',
      [id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Build date filter
    let dateFilter = '';
    const queryParams = [id];
    let paramCount = 1;

    if (startDate && endDate) {
      paramCount++;
      dateFilter = `AND dr.work_date >= $${paramCount}`;
      queryParams.push(startDate);
      paramCount++;
      dateFilter += ` AND dr.work_date <= $${paramCount}`;
      queryParams.push(endDate);
    }

    // Get site count
    const siteCountResult = await pool.query(
      'SELECT COUNT(*) FROM sites WHERE project_id = $1',
      [id]
    );

    // Get total workers and payments
    const workerStatsResult = await pool.query(
      `SELECT 
         SUM(wa.worker_count) as total_workers,
         SUM(wa.amount_paid) as total_payments,
         COUNT(DISTINCT dr.work_date) as work_days,
         COUNT(DISTINCT s.id) as active_sites
       FROM worker_attendance wa
       JOIN daily_records dr ON dr.id = wa.daily_record_id
       JOIN sites s ON s.id = dr.site_id
       WHERE s.project_id = $1 ${dateFilter}`,
      queryParams
    );

    // Get site-wise statistics
    const siteStatsResult = await pool.query(
      `SELECT s.id, s.name, s.location,
              SUM(wa.worker_count) as total_workers,
              SUM(wa.amount_paid) as total_payments,
              COUNT(DISTINCT dr.work_date) as work_days
       FROM sites s
       LEFT JOIN daily_records dr ON dr.site_id = s.id ${dateFilter.replace('AND', 'AND')}
       LEFT JOIN worker_attendance wa ON wa.daily_record_id = dr.id
       WHERE s.project_id = $1
       GROUP BY s.id, s.name, s.location
       ORDER BY total_workers DESC`,
      queryParams
    );

    const stats = workerStatsResult.rows[0];

    res.json({
      success: true,
      data: {
        projectName: projectResult.rows[0].name,
        projectStatus: projectResult.rows[0].status,
        siteCount: parseInt(siteCountResult.rows[0].count),
        totalWorkers: parseInt(stats.total_workers) || 0,
        totalPayments: parseFloat(stats.total_payments) || 0,
        workDays: parseInt(stats.work_days) || 0,
        activeSites: parseInt(stats.active_sites) || 0,
        siteStatistics: siteStatsResult.rows.map(site => ({
          id: site.id,
          name: site.name,
          location: site.location,
          totalWorkers: parseInt(site.total_workers) || 0,
          totalPayments: parseFloat(site.total_payments) || 0,
          workDays: parseInt(site.work_days) || 0
        }))
      }
    });

  } catch (error) {
    console.error('Get project statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project statistics'
    });
  }
});

module.exports = router;