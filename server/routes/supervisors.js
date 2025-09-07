const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { authenticateToken, requireSiteAdmin } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all supervisors
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = 'all',
      site_id = ''
    } = req.query;
    
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE u.role = \'supervisor\'';
    let queryParams = [];
    let paramCount = 1;

    // Build search condition
    if (search) {
      whereClause += ` AND (u.username ILIKE $${paramCount} OR u.full_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
      paramCount++;
    }

    // Build site filter
    if (site_id) {
      whereClause += ` AND ss.site_id = $${paramCount}`;
      queryParams.push(site_id);
      paramCount++;
    }

    // Build status condition
    if (status === 'active') {
      whereClause += ' AND u.is_active = true';
    } else if (status === 'inactive') {
      whereClause += ' AND u.is_active = false';
    }

    // Get supervisors with site assignments
    const supervisorsResult = await query(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.full_name,
        u.phone,
        u.is_active,
        u.created_at,
        ss.site_id,
        s.name as site_name,
        s.location as site_location,
        p.name as project_name,
        ss.assigned_at,
        ss.assigned_by,
        assigner.full_name as assigned_by_name
      FROM users u
      LEFT JOIN site_supervisors ss ON u.id = ss.supervisor_id AND ss.is_active = true
      LEFT JOIN sites s ON ss.site_id = s.id
      LEFT JOIN projects p ON s.project_id = p.id
      LEFT JOIN users assigner ON ss.assigned_by = assigner.id
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `, [...queryParams, limit, offset]);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM users u
      LEFT JOIN site_supervisors ss ON u.id = ss.supervisor_id AND ss.is_active = true
      ${whereClause}
    `, queryParams);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      supervisors: supervisorsResult.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get supervisors error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single supervisor
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const supervisorResult = await query(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.full_name,
        u.phone,
        u.is_active,
        u.created_at,
        u.updated_at
      FROM users u
      WHERE u.id = $1 AND u.role = 'supervisor'
    `, [id]);

    if (supervisorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Supervisor not found' });
    }

    // Get current site assignment
    const siteAssignmentResult = await query(`
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
      WHERE ss.supervisor_id = $1 AND ss.is_active = true
    `, [id]);

    // Get assignment history
    const assignmentHistoryResult = await query(`
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

    // Get recent daily records
    const recentRecordsResult = await query(`
      SELECT 
        dr.*,
        s.name as site_name,
        s.location as site_location
      FROM daily_records dr
      JOIN sites s ON dr.site_id = s.id
      WHERE dr.supervisor_id = $1
      ORDER BY dr.record_date DESC
      LIMIT 10
    `, [id]);

    const supervisor = supervisorResult.rows[0];
    supervisor.current_assignment = siteAssignmentResult.rows[0] || null;
    supervisor.assignment_history = assignmentHistoryResult.rows;
    supervisor.recent_records = recentRecordsResult.rows;

    res.json({ supervisor });

  } catch (error) {
    console.error('Get supervisor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Assign supervisor to site
router.post('/:id/assign', [
  requireSiteAdmin,
  body('site_id').isInt().withMessage('Valid site ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { id: supervisorId } = req.params;
    const { site_id } = req.body;

    // Check if supervisor exists and is active
    const supervisorResult = await query(
      'SELECT id FROM users WHERE id = $1 AND role = \'supervisor\' AND is_active = true',
      [supervisorId]
    );

    if (supervisorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Supervisor not found or inactive' });
    }

    // Check if site exists and is active
    const siteResult = await query(
      'SELECT id FROM sites WHERE id = $1 AND is_active = true',
      [site_id]
    );

    if (siteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Site not found or inactive' });
    }

    // Check if supervisor is already assigned to this site
    const existingAssignment = await query(
      'SELECT id FROM site_supervisors WHERE supervisor_id = $1 AND site_id = $2 AND is_active = true',
      [supervisorId, site_id]
    );

    if (existingAssignment.rows.length > 0) {
      return res.status(400).json({ error: 'Supervisor is already assigned to this site' });
    }

    // Check if site already has an active supervisor
    const siteHasSupervisor = await query(
      'SELECT id FROM site_supervisors WHERE site_id = $1 AND is_active = true',
      [site_id]
    );

    if (siteHasSupervisor.rows.length > 0) {
      return res.status(400).json({ error: 'Site already has an active supervisor' });
    }

    // Assign supervisor to site
    const assignmentResult = await query(`
      INSERT INTO site_supervisors (site_id, supervisor_id, assigned_by)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [site_id, supervisorId, req.user.id]);

    res.status(201).json({
      message: 'Supervisor assigned to site successfully',
      assignment: assignmentResult.rows[0]
    });

  } catch (error) {
    console.error('Assign supervisor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unassign supervisor from site
router.delete('/:id/unassign', [
  requireSiteAdmin
], async (req, res) => {
  try {
    const { id: supervisorId } = req.params;

    // Check if supervisor has an active assignment
    const assignmentResult = await query(
      'SELECT * FROM site_supervisors WHERE supervisor_id = $1 AND is_active = true',
      [supervisorId]
    );

    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'No active assignment found for this supervisor' });
    }

    // Deactivate assignment
    await query(
      'UPDATE site_supervisors SET is_active = false WHERE supervisor_id = $1 AND is_active = true',
      [supervisorId]
    );

    res.json({ message: 'Supervisor unassigned from site successfully' });

  } catch (error) {
    console.error('Unassign supervisor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Transfer supervisor to different site
router.put('/:id/transfer', [
  requireSiteAdmin,
  body('new_site_id').isInt().withMessage('Valid new site ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { id: supervisorId } = req.params;
    const { new_site_id } = req.body;

    // Check if supervisor exists and is active
    const supervisorResult = await query(
      'SELECT id FROM users WHERE id = $1 AND role = \'supervisor\' AND is_active = true',
      [supervisorId]
    );

    if (supervisorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Supervisor not found or inactive' });
    }

    // Check if new site exists and is active
    const siteResult = await query(
      'SELECT id FROM sites WHERE id = $1 AND is_active = true',
      [new_site_id]
    );

    if (siteResult.rows.length === 0) {
      return res.status(404).json({ error: 'New site not found or inactive' });
    }

    // Check if new site already has an active supervisor
    const siteHasSupervisor = await query(
      'SELECT id FROM site_supervisors WHERE site_id = $1 AND is_active = true',
      [new_site_id]
    );

    if (siteHasSupervisor.rows.length > 0) {
      return res.status(400).json({ error: 'New site already has an active supervisor' });
    }

    // Use transaction to ensure atomicity
    const result = await transaction(async (client) => {
      // Deactivate current assignment
      await client.query(
        'UPDATE site_supervisors SET is_active = false WHERE supervisor_id = $1 AND is_active = true',
        [supervisorId]
      );

      // Create new assignment
      const assignmentResult = await client.query(`
        INSERT INTO site_supervisors (site_id, supervisor_id, assigned_by)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [new_site_id, supervisorId, req.user.id]);

      return assignmentResult.rows[0];
    });

    res.json({
      message: 'Supervisor transferred successfully',
      assignment: result
    });

  } catch (error) {
    console.error('Transfer supervisor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get supervisor statistics
router.get('/:id/statistics', async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;

    // Check if supervisor exists
    const supervisorExists = await query(
      'SELECT id FROM users WHERE id = $1 AND role = \'supervisor\'',
      [id]
    );

    if (supervisorExists.rows.length === 0) {
      return res.status(404).json({ error: 'Supervisor not found' });
    }

    let dateFilter = '';
    let queryParams = [id];
    let paramCount = 2;

    if (start_date && end_date) {
      dateFilter = `AND dr.record_date BETWEEN $${paramCount} AND $${paramCount + 1}`;
      queryParams.push(start_date, end_date);
    }

    // Get supervisor statistics
    const statsResult = await query(`
      SELECT 
        COUNT(dr.id) as total_records,
        COUNT(DISTINCT dr.site_id) as sites_managed,
        COALESCE(SUM((dr.worker_counts->>'total')::int), 0) as total_workers_managed,
        COALESCE(SUM((dr.payments_made->>'total')::decimal), 0) as total_payments_managed,
        MIN(dr.record_date) as first_record_date,
        MAX(dr.record_date) as last_record_date
      FROM daily_records dr
      WHERE dr.supervisor_id = $1 ${dateFilter}
    `, queryParams);

    // Get correction statistics
    const correctionStatsResult = await query(`
      SELECT 
        COUNT(sdc.id) as total_corrections,
        COUNT(DISTINCT sdc.daily_record_id) as records_corrected
      FROM same_day_corrections sdc
      JOIN daily_records dr ON sdc.daily_record_id = dr.id
      WHERE dr.supervisor_id = $1 ${dateFilter}
    `, queryParams);

    // Get recent activity
    const recentActivityResult = await query(`
      SELECT 
        dr.record_date,
        s.name as site_name,
        dr.worker_counts,
        dr.payments_made,
        dr.production_data,
        COUNT(sdc.id) as corrections_count
      FROM daily_records dr
      JOIN sites s ON dr.site_id = s.id
      LEFT JOIN same_day_corrections sdc ON dr.id = sdc.daily_record_id
      WHERE dr.supervisor_id = $1 ${dateFilter}
      GROUP BY dr.id, s.name
      ORDER BY dr.record_date DESC
      LIMIT 10
    `, queryParams);

    res.json({
      statistics: {
        ...statsResult.rows[0],
        ...correctionStatsResult.rows[0]
      },
      recent_activity: recentActivityResult.rows
    });

  } catch (error) {
    console.error('Get supervisor statistics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;