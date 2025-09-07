const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { authenticateToken, requireSiteAdmin } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all projects
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = 'all' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let queryParams = [];
    let paramCount = 1;

    // Build search condition
    if (search) {
      whereClause += `WHERE (p.name ILIKE $${paramCount} OR p.client_company ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
      paramCount++;
    }

    // Build status condition
    if (status === 'active') {
      whereClause += whereClause ? ` AND p.is_active = true` : `WHERE p.is_active = true`;
    } else if (status === 'inactive') {
      whereClause += whereClause ? ` AND p.is_active = false` : `WHERE p.is_active = false`;
    }

    // Get projects with site count
    const projectsResult = await query(`
      SELECT 
        p.*,
        u.full_name as created_by_name,
        COUNT(s.id) as site_count
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN sites s ON p.id = s.project_id AND s.is_active = true
      ${whereClause}
      GROUP BY p.id, u.full_name
      ORDER BY p.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `, [...queryParams, limit, offset]);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM projects p
      ${whereClause}
    `, queryParams);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      projects: projectsResult.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single project
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const projectResult = await query(`
      SELECT 
        p.*,
        u.full_name as created_by_name,
        COUNT(s.id) as site_count
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN sites s ON p.id = s.project_id AND s.is_active = true
      WHERE p.id = $1
      GROUP BY p.id, u.full_name
    `, [id]);

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get sites for this project
    const sitesResult = await query(`
      SELECT 
        s.*,
        u.full_name as created_by_name,
        ss.supervisor_id,
        su.full_name as supervisor_name
      FROM sites s
      LEFT JOIN users u ON s.created_by = u.id
      LEFT JOIN site_supervisors ss ON s.id = ss.site_id AND ss.is_active = true
      LEFT JOIN users su ON ss.supervisor_id = su.id
      WHERE s.project_id = $1
      ORDER BY s.created_at DESC
    `, [id]);

    const project = projectResult.rows[0];
    project.sites = sitesResult.rows;

    res.json({ project });

  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new project
router.post('/', [
  requireSiteAdmin,
  body('name').notEmpty().withMessage('Project name is required'),
  body('client_company').notEmpty().withMessage('Client company is required'),
  body('description').optional(),
  body('invoice_template').optional().isObject().withMessage('Invoice template must be an object')
], auditMiddleware('projects', (req) => req.body.id), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { name, client_company, description, invoice_template } = req.body;

    // Check if project name already exists
    const existingProject = await query(
      'SELECT id FROM projects WHERE name = $1',
      [name]
    );

    if (existingProject.rows.length > 0) {
      return res.status(400).json({ error: 'Project name already exists' });
    }

    const projectResult = await query(`
      INSERT INTO projects (name, client_company, description, invoice_template, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name, client_company, description, JSON.stringify(invoice_template || {}), req.user.id]);

    res.status(201).json({
      message: 'Project created successfully',
      project: projectResult.rows[0]
    });

  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update project
router.put('/:id', [
  requireSiteAdmin,
  body('name').optional().notEmpty().withMessage('Project name cannot be empty'),
  body('client_company').optional().notEmpty().withMessage('Client company cannot be empty'),
  body('description').optional(),
  body('invoice_template').optional().isObject().withMessage('Invoice template must be an object'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean')
], auditMiddleware('projects'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { id } = req.params;
    const { name, client_company, description, invoice_template, is_active } = req.body;

    // Check if project exists
    const existingProject = await query(
      'SELECT * FROM projects WHERE id = $1',
      [id]
    );

    if (existingProject.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if new name conflicts with existing projects
    if (name && name !== existingProject.rows[0].name) {
      const nameConflict = await query(
        'SELECT id FROM projects WHERE name = $1 AND id != $2',
        [name, id]
      );

      if (nameConflict.rows.length > 0) {
        return res.status(400).json({ error: 'Project name already exists' });
      }
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }

    if (client_company !== undefined) {
      updates.push(`client_company = $${paramCount++}`);
      values.push(client_company);
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }

    if (invoice_template !== undefined) {
      updates.push(`invoice_template = $${paramCount++}`);
      values.push(JSON.stringify(invoice_template));
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

    const projectResult = await query(`
      UPDATE projects 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    res.json({
      message: 'Project updated successfully',
      project: projectResult.rows[0]
    });

  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete project (soft delete)
router.delete('/:id', [
  requireSiteAdmin
], auditMiddleware('projects'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if project exists
    const existingProject = await query(
      'SELECT * FROM projects WHERE id = $1',
      [id]
    );

    if (existingProject.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if project has active sites
    const activeSites = await query(
      'SELECT COUNT(*) as count FROM sites WHERE project_id = $1 AND is_active = true',
      [id]
    );

    if (parseInt(activeSites.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete project with active sites. Please deactivate all sites first.' 
      });
    }

    // Soft delete project
    await query(
      'UPDATE projects SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    res.json({ message: 'Project deleted successfully' });

  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get project statistics
router.get('/:id/statistics', async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;

    // Check if project exists
    const projectExists = await query(
      'SELECT id FROM projects WHERE id = $1',
      [id]
    );

    if (projectExists.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    let dateFilter = '';
    let queryParams = [id];
    let paramCount = 2;

    if (start_date && end_date) {
      dateFilter = `AND dr.record_date BETWEEN $${paramCount} AND $${paramCount + 1}`;
      queryParams.push(start_date, end_date);
    }

    // Get project statistics
    const statsResult = await query(`
      SELECT 
        COUNT(DISTINCT s.id) as total_sites,
        COUNT(DISTINCT dr.id) as total_records,
        COALESCE(SUM((dr.worker_counts->>'total')::int), 0) as total_workers,
        COALESCE(SUM((dr.payments_made->>'total')::decimal), 0) as total_payments,
        COALESCE(AVG((dr.production_data->>'tons_produced')::decimal), 0) as avg_production
      FROM projects p
      LEFT JOIN sites s ON p.id = s.project_id AND s.is_active = true
      LEFT JOIN daily_records dr ON s.id = dr.site_id ${dateFilter}
      WHERE p.id = $1
    `, queryParams);

    // Get recent activity
    const recentActivity = await query(`
      SELECT 
        dr.record_date,
        s.name as site_name,
        dr.worker_counts,
        dr.payments_made,
        dr.production_data
      FROM daily_records dr
      JOIN sites s ON dr.site_id = s.id
      WHERE s.project_id = $1 ${dateFilter}
      ORDER BY dr.record_date DESC
      LIMIT 10
    `, queryParams);

    res.json({
      statistics: statsResult.rows[0],
      recent_activity: recentActivity.rows
    });

  } catch (error) {
    console.error('Get project statistics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;