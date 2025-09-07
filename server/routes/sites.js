const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { authenticateToken, requireSiteAdmin } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all sites
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      project_id = '', 
      status = 'all',
      client_company = ''
    } = req.query;
    
    const offset = (page - 1) * limit;

    let whereClause = '';
    let queryParams = [];
    let paramCount = 1;

    // Build search condition
    if (search) {
      whereClause += `WHERE (s.name ILIKE $${paramCount} OR s.location ILIKE $${paramCount} OR s.client_company ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
      paramCount++;
    }

    // Build project filter
    if (project_id) {
      whereClause += whereClause ? ` AND s.project_id = $${paramCount}` : `WHERE s.project_id = $${paramCount}`;
      queryParams.push(project_id);
      paramCount++;
    }

    // Build client company filter
    if (client_company) {
      whereClause += whereClause ? ` AND s.client_company ILIKE $${paramCount}` : `WHERE s.client_company ILIKE $${paramCount}`;
      queryParams.push(`%${client_company}%`);
      paramCount++;
    }

    // Build status condition
    if (status === 'active') {
      whereClause += whereClause ? ` AND s.is_active = true` : `WHERE s.is_active = true`;
    } else if (status === 'inactive') {
      whereClause += whereClause ? ` AND s.is_active = false` : `WHERE s.is_active = false`;
    }

    // Get sites with project and supervisor info
    const sitesResult = await query(`
      SELECT 
        s.*,
        p.name as project_name,
        p.client_company as project_client,
        u.full_name as created_by_name,
        ss.supervisor_id,
        su.full_name as supervisor_name,
        su.username as supervisor_username,
        COUNT(wt.id) as worker_type_count
      FROM sites s
      LEFT JOIN projects p ON s.project_id = p.id
      LEFT JOIN users u ON s.created_by = u.id
      LEFT JOIN site_supervisors ss ON s.id = ss.site_id AND ss.is_active = true
      LEFT JOIN users su ON ss.supervisor_id = su.id
      LEFT JOIN worker_types wt ON s.id = wt.site_id AND wt.is_active = true
      ${whereClause}
      GROUP BY s.id, p.name, p.client_company, u.full_name, ss.supervisor_id, su.full_name, su.username
      ORDER BY s.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `, [...queryParams, limit, offset]);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM sites s
      ${whereClause}
    `, queryParams);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      sites: sitesResult.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get sites error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single site
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const siteResult = await query(`
      SELECT 
        s.*,
        p.name as project_name,
        p.client_company as project_client,
        u.full_name as created_by_name,
        ss.supervisor_id,
        su.full_name as supervisor_name,
        su.username as supervisor_username
      FROM sites s
      LEFT JOIN projects p ON s.project_id = p.id
      LEFT JOIN users u ON s.created_by = u.id
      LEFT JOIN site_supervisors ss ON s.id = ss.site_id AND ss.is_active = true
      LEFT JOIN users su ON ss.supervisor_id = su.id
      WHERE s.id = $1
    `, [id]);

    if (siteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }

    // Get worker types for this site
    const workerTypesResult = await query(`
      SELECT * FROM worker_types 
      WHERE site_id = $1 AND is_active = true
      ORDER BY name
    `, [id]);

    // Get recent daily records
    const recentRecordsResult = await query(`
      SELECT 
        dr.*,
        u.full_name as supervisor_name
      FROM daily_records dr
      LEFT JOIN users u ON dr.supervisor_id = u.id
      WHERE dr.site_id = $1
      ORDER BY dr.record_date DESC
      LIMIT 10
    `, [id]);

    const site = siteResult.rows[0];
    site.worker_types = workerTypesResult.rows;
    site.recent_records = recentRecordsResult.rows;

    res.json({ site });

  } catch (error) {
    console.error('Get site error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new site
router.post('/', [
  requireSiteAdmin,
  body('project_id').isInt().withMessage('Valid project ID is required'),
  body('name').notEmpty().withMessage('Site name is required'),
  body('location').notEmpty().withMessage('Location is required'),
  body('client_company').notEmpty().withMessage('Client company is required'),
  body('description').optional()
], auditMiddleware('sites', (req) => req.body.id), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { project_id, name, location, client_company, description } = req.body;

    // Check if project exists and is active
    const projectResult = await query(
      'SELECT id FROM projects WHERE id = $1 AND is_active = true',
      [project_id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(400).json({ error: 'Project not found or inactive' });
    }

    // Check if site name already exists in this project
    const existingSite = await query(
      'SELECT id FROM sites WHERE project_id = $1 AND name = $2',
      [project_id, name]
    );

    if (existingSite.rows.length > 0) {
      return res.status(400).json({ error: 'Site name already exists in this project' });
    }

    const siteResult = await query(`
      INSERT INTO sites (project_id, name, location, client_company, description, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [project_id, name, location, client_company, description, req.user.id]);

    res.status(201).json({
      message: 'Site created successfully',
      site: siteResult.rows[0]
    });

  } catch (error) {
    console.error('Create site error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update site
router.put('/:id', [
  requireSiteAdmin,
  body('name').optional().notEmpty().withMessage('Site name cannot be empty'),
  body('location').optional().notEmpty().withMessage('Location cannot be empty'),
  body('client_company').optional().notEmpty().withMessage('Client company cannot be empty'),
  body('description').optional(),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean')
], auditMiddleware('sites'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { id } = req.params;
    const { name, location, client_company, description, is_active } = req.body;

    // Check if site exists
    const existingSite = await query(
      'SELECT * FROM sites WHERE id = $1',
      [id]
    );

    if (existingSite.rows.length === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }

    // Check if new name conflicts with existing sites in the same project
    if (name && name !== existingSite.rows[0].name) {
      const nameConflict = await query(
        'SELECT id FROM sites WHERE project_id = $1 AND name = $2 AND id != $3',
        [existingSite.rows[0].project_id, name, id]
      );

      if (nameConflict.rows.length > 0) {
        return res.status(400).json({ error: 'Site name already exists in this project' });
      }
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }

    if (location !== undefined) {
      updates.push(`location = $${paramCount++}`);
      values.push(location);
    }

    if (client_company !== undefined) {
      updates.push(`client_company = $${paramCount++}`);
      values.push(client_company);
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
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

    const siteResult = await query(`
      UPDATE sites 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    res.json({
      message: 'Site updated successfully',
      site: siteResult.rows[0]
    });

  } catch (error) {
    console.error('Update site error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete site (soft delete)
router.delete('/:id', [
  requireSiteAdmin
], auditMiddleware('sites'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if site exists
    const existingSite = await query(
      'SELECT * FROM sites WHERE id = $1',
      [id]
    );

    if (existingSite.rows.length === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }

    // Check if site has daily records
    const hasRecords = await query(
      'SELECT COUNT(*) as count FROM daily_records WHERE site_id = $1',
      [id]
    );

    if (parseInt(hasRecords.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete site with existing records. Please deactivate the site instead.' 
      });
    }

    // Soft delete site
    await query(
      'UPDATE sites SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    res.json({ message: 'Site deleted successfully' });

  } catch (error) {
    console.error('Delete site error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get site statistics
router.get('/:id/statistics', async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;

    // Check if site exists
    const siteExists = await query(
      'SELECT id FROM sites WHERE id = $1',
      [id]
    );

    if (siteExists.rows.length === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }

    let dateFilter = '';
    let queryParams = [id];
    let paramCount = 2;

    if (start_date && end_date) {
      dateFilter = `AND dr.record_date BETWEEN $${paramCount} AND $${paramCount + 1}`;
      queryParams.push(start_date, end_date);
    }

    // Get site statistics
    const statsResult = await query(`
      SELECT 
        COUNT(dr.id) as total_records,
        COALESCE(SUM((dr.worker_counts->>'total')::int), 0) as total_workers,
        COALESCE(SUM((dr.payments_made->>'total')::decimal), 0) as total_payments,
        COALESCE(AVG((dr.production_data->>'tons_produced')::decimal), 0) as avg_production,
        MIN(dr.record_date) as first_record_date,
        MAX(dr.record_date) as last_record_date
      FROM daily_records dr
      WHERE dr.site_id = $1 ${dateFilter}
    `, queryParams);

    // Get worker type statistics
    const workerStatsResult = await query(`
      SELECT 
        wt.name as worker_type,
        wt.daily_rate,
        COALESCE(SUM((dr.worker_counts->>wt.id::text)::int), 0) as total_workers,
        COALESCE(SUM((dr.payments_made->>wt.id::text)::decimal), 0) as total_payments
      FROM worker_types wt
      LEFT JOIN daily_records dr ON wt.site_id = dr.site_id ${dateFilter}
      WHERE wt.site_id = $1 AND wt.is_active = true
      GROUP BY wt.id, wt.name, wt.daily_rate
      ORDER BY wt.name
    `, queryParams);

    res.json({
      statistics: statsResult.rows[0],
      worker_statistics: workerStatsResult.rows
    });

  } catch (error) {
    console.error('Get site statistics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;