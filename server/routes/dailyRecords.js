const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { authenticateToken, requireSupervisor } = require('../middleware/auth');
const { createAuditLog } = require('../middleware/audit');
const moment = require('moment');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get daily records with advanced filtering
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      site_id = '', 
      supervisor_id = '',
      start_date = '', 
      end_date = '',
      project_id = '',
      client_company = ''
    } = req.query;
    
    const offset = (page - 1) * limit;

    let whereClause = '';
    let queryParams = [];
    let paramCount = 1;

    // Build date filter
    if (start_date && end_date) {
      whereClause += `WHERE dr.record_date BETWEEN $${paramCount} AND $${paramCount + 1}`;
      queryParams.push(start_date, end_date);
      paramCount += 2;
    } else if (start_date) {
      whereClause += `WHERE dr.record_date >= $${paramCount}`;
      queryParams.push(start_date);
      paramCount++;
    } else if (end_date) {
      whereClause += `WHERE dr.record_date <= $${paramCount}`;
      queryParams.push(end_date);
      paramCount++;
    }

    // Build site filter
    if (site_id) {
      whereClause += whereClause ? ` AND dr.site_id = $${paramCount}` : `WHERE dr.site_id = $${paramCount}`;
      queryParams.push(site_id);
      paramCount++;
    }

    // Build supervisor filter
    if (supervisor_id) {
      whereClause += whereClause ? ` AND dr.supervisor_id = $${paramCount}` : `WHERE dr.supervisor_id = $${paramCount}`;
      queryParams.push(supervisor_id);
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

    // Restrict supervisors to their assigned sites only
    if (req.user.role === 'supervisor') {
      whereClause += whereClause ? ` AND dr.supervisor_id = $${paramCount}` : `WHERE dr.supervisor_id = $${paramCount}`;
      queryParams.push(req.user.id);
      paramCount++;
    }

    // Get daily records with related data
    const recordsResult = await query(`
      SELECT 
        dr.*,
        s.name as site_name,
        s.location as site_location,
        s.client_company,
        p.name as project_name,
        u.full_name as supervisor_name,
        COUNT(sdc.id) as corrections_count
      FROM daily_records dr
      LEFT JOIN sites s ON dr.site_id = s.id
      LEFT JOIN projects p ON s.project_id = p.id
      LEFT JOIN users u ON dr.supervisor_id = u.id
      LEFT JOIN same_day_corrections sdc ON dr.id = sdc.daily_record_id
      ${whereClause}
      GROUP BY dr.id, s.name, s.location, s.client_company, p.name, u.full_name
      ORDER BY dr.record_date DESC, dr.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `, [...queryParams, limit, offset]);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM daily_records dr
      LEFT JOIN sites s ON dr.site_id = s.id
      ${whereClause}
    `, queryParams);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      records: recordsResult.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get daily records error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single daily record
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const recordResult = await query(`
      SELECT 
        dr.*,
        s.name as site_name,
        s.location as site_location,
        s.client_company,
        p.name as project_name,
        u.full_name as supervisor_name
      FROM daily_records dr
      LEFT JOIN sites s ON dr.site_id = s.id
      LEFT JOIN projects p ON s.project_id = p.id
      LEFT JOIN users u ON dr.supervisor_id = u.id
      WHERE dr.id = $1
    `, [id]);

    if (recordResult.rows.length === 0) {
      return res.status(404).json({ error: 'Daily record not found' });
    }

    // Check if supervisor can access this record
    if (req.user.role === 'supervisor' && recordResult.rows[0].supervisor_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get corrections for this record
    const correctionsResult = await query(`
      SELECT 
        sdc.*,
        u.full_name as corrected_by_name
      FROM same_day_corrections sdc
      LEFT JOIN users u ON sdc.corrected_by = u.id
      WHERE sdc.daily_record_id = $1
      ORDER BY sdc.corrected_at DESC
    `, [id]);

    const record = recordResult.rows[0];
    record.corrections = correctionsResult.rows;

    res.json({ record });

  } catch (error) {
    console.error('Get daily record error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new daily record
router.post('/', [
  requireSupervisor,
  body('site_id').isInt().withMessage('Valid site ID is required'),
  body('record_date').isISO8601().withMessage('Valid record date is required'),
  body('worker_counts').isObject().withMessage('Worker counts must be an object'),
  body('payments_made').isObject().withMessage('Payments made must be an object'),
  body('production_data').optional().isObject().withMessage('Production data must be an object'),
  body('worker_names').optional().isObject().withMessage('Worker names must be an object'),
  body('notes').optional().isString().withMessage('Notes must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { 
      site_id, 
      record_date, 
      worker_counts, 
      payments_made, 
      production_data, 
      worker_names, 
      notes 
    } = req.body;

    // Check if supervisor is assigned to this site
    if (req.user.role === 'supervisor') {
      const assignmentResult = await query(
        'SELECT id FROM site_supervisors WHERE supervisor_id = $1 AND site_id = $2 AND is_active = true',
        [req.user.id, site_id]
      );

      if (assignmentResult.rows.length === 0) {
        return res.status(403).json({ error: 'You are not assigned to this site' });
      }
    }

    // Check if site exists and is active
    const siteResult = await query(
      'SELECT id FROM sites WHERE id = $1 AND is_active = true',
      [site_id]
    );

    if (siteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Site not found or inactive' });
    }

    // Check if record already exists for this site and date
    const existingRecord = await query(
      'SELECT id FROM daily_records WHERE site_id = $1 AND record_date = $2',
      [site_id, record_date]
    );

    if (existingRecord.rows.length > 0) {
      return res.status(400).json({ error: 'Record already exists for this site and date' });
    }

    // Validate that record date is not in the future
    const today = moment().format('YYYY-MM-DD');
    if (moment(record_date).isAfter(today)) {
      return res.status(400).json({ error: 'Cannot create records for future dates' });
    }

    // Validate worker types exist for this site
    const workerTypeIds = Object.keys(worker_counts);
    if (workerTypeIds.length > 0) {
      const workerTypesResult = await query(
        `SELECT id FROM worker_types WHERE site_id = $1 AND id = ANY($2) AND is_active = true`,
        [site_id, workerTypeIds]
      );

      if (workerTypesResult.rows.length !== workerTypeIds.length) {
        return res.status(400).json({ error: 'Invalid worker types for this site' });
      }
    }

    // Calculate totals
    const totalWorkers = Object.values(worker_counts).reduce((sum, count) => sum + parseInt(count), 0);
    const totalPayments = Object.values(payments_made).reduce((sum, payment) => sum + parseFloat(payment), 0);

    // Add totals to the data
    const workerCountsWithTotal = { ...worker_counts, total: totalWorkers };
    const paymentsWithTotal = { ...payments_made, total: totalPayments };

    const recordResult = await query(`
      INSERT INTO daily_records (
        site_id, supervisor_id, record_date, worker_counts, 
        production_data, payments_made, worker_names, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      site_id, 
      req.user.id, 
      record_date, 
      JSON.stringify(workerCountsWithTotal),
      JSON.stringify(production_data || {}),
      JSON.stringify(paymentsWithTotal),
      JSON.stringify(worker_names || {}),
      notes
    ]);

    // Log the creation
    await createAuditLog(req, 'daily_records', recordResult.rows[0].id, 'INSERT', null, {
      site_id,
      record_date,
      worker_counts: workerCountsWithTotal,
      payments_made: paymentsWithTotal
    });

    res.status(201).json({
      message: 'Daily record created successfully',
      record: recordResult.rows[0]
    });

  } catch (error) {
    console.error('Create daily record error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update daily record (same-day corrections only)
router.put('/:id', [
  requireSupervisor,
  body('worker_counts').optional().isObject().withMessage('Worker counts must be an object'),
  body('payments_made').optional().isObject().withMessage('Payments made must be an object'),
  body('production_data').optional().isObject().withMessage('Production data must be an object'),
  body('worker_names').optional().isObject().withMessage('Worker names must be an object'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
  body('correction_reason').notEmpty().withMessage('Correction reason is required')
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
    const { 
      worker_counts, 
      payments_made, 
      production_data, 
      worker_names, 
      notes, 
      correction_reason 
    } = req.body;

    // Get existing record
    const existingRecord = await query(
      'SELECT * FROM daily_records WHERE id = $1',
      [id]
    );

    if (existingRecord.rows.length === 0) {
      return res.status(404).json({ error: 'Daily record not found' });
    }

    const record = existingRecord.rows[0];

    // Check if supervisor can modify this record
    if (req.user.role === 'supervisor' && record.supervisor_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if record is locked (not same day)
    const today = moment().format('YYYY-MM-DD');
    const recordDate = moment(record.record_date).format('YYYY-MM-DD');
    
    if (recordDate !== today) {
      return res.status(400).json({ error: 'Cannot modify records from previous days' });
    }

    // Check if record is already locked
    if (record.is_locked) {
      return res.status(400).json({ error: 'Record is locked and cannot be modified' });
    }

    // Use transaction to ensure atomicity
    const result = await transaction(async (client) => {
      // Store old values for audit
      const oldValues = {
        worker_counts: record.worker_counts,
        payments_made: record.payments_made,
        production_data: record.production_data,
        worker_names: record.worker_names,
        notes: record.notes
      };

      // Prepare new values
      const newValues = {
        worker_counts: worker_counts || record.worker_counts,
        payments_made: payments_made || record.payments_made,
        production_data: production_data || record.production_data,
        worker_names: worker_names || record.worker_names,
        notes: notes !== undefined ? notes : record.notes
      };

      // Calculate new totals
      const totalWorkers = Object.values(newValues.worker_counts).reduce((sum, count) => sum + parseInt(count), 0);
      const totalPayments = Object.values(newValues.payments_made).reduce((sum, payment) => sum + parseFloat(payment), 0);

      // Add totals to the data
      newValues.worker_counts.total = totalWorkers;
      newValues.payments_made.total = totalPayments;

      // Update the record
      const updateResult = await client.query(`
        UPDATE daily_records 
        SET 
          worker_counts = $1,
          payments_made = $2,
          production_data = $3,
          worker_names = $4,
          notes = $5,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *
      `, [
        JSON.stringify(newValues.worker_counts),
        JSON.stringify(newValues.payments_made),
        JSON.stringify(newValues.production_data),
        JSON.stringify(newValues.worker_names),
        newValues.notes,
        id
      ]);

      // Record the correction
      await client.query(`
        INSERT INTO same_day_corrections (
          daily_record_id, correction_reason, old_values, new_values, corrected_by
        )
        VALUES ($1, $2, $3, $4, $5)
      `, [
        id,
        correction_reason,
        JSON.stringify(oldValues),
        JSON.stringify(newValues),
        req.user.id
      ]);

      return updateResult.rows[0];
    });

    // Log the update
    await createAuditLog(req, 'daily_records', id, 'UPDATE', null, {
      correction_reason,
      updated_fields: Object.keys(req.body).filter(key => key !== 'correction_reason')
    });

    res.json({
      message: 'Daily record updated successfully',
      record: result
    });

  } catch (error) {
    console.error('Update daily record error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Lock daily record (prevent further modifications)
router.put('/:id/lock', [
  requireSupervisor
], async (req, res) => {
  try {
    const { id } = req.params;

    // Get existing record
    const existingRecord = await query(
      'SELECT * FROM daily_records WHERE id = $1',
      [id]
    );

    if (existingRecord.rows.length === 0) {
      return res.status(404).json({ error: 'Daily record not found' });
    }

    const record = existingRecord.rows[0];

    // Check if supervisor can modify this record
    if (req.user.role === 'supervisor' && record.supervisor_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if record is already locked
    if (record.is_locked) {
      return res.status(400).json({ error: 'Record is already locked' });
    }

    // Lock the record
    const updateResult = await query(`
      UPDATE daily_records 
      SET is_locked = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id]);

    // Log the lock action
    await createAuditLog(req, 'daily_records', id, 'UPDATE', null, {
      action: 'locked',
      locked_at: new Date().toISOString()
    });

    res.json({
      message: 'Daily record locked successfully',
      record: updateResult.rows[0]
    });

  } catch (error) {
    console.error('Lock daily record error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get daily record statistics
router.get('/statistics/summary', async (req, res) => {
  try {
    const { 
      start_date, 
      end_date, 
      site_id = '', 
      project_id = '',
      client_company = ''
    } = req.query;

    let whereClause = '';
    let queryParams = [];
    let paramCount = 1;

    // Build date filter
    if (start_date && end_date) {
      whereClause += `WHERE dr.record_date BETWEEN $${paramCount} AND $${paramCount + 1}`;
      queryParams.push(start_date, end_date);
      paramCount += 2;
    }

    // Build site filter
    if (site_id) {
      whereClause += whereClause ? ` AND dr.site_id = $${paramCount}` : `WHERE dr.site_id = $${paramCount}`;
      queryParams.push(site_id);
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

    // Restrict supervisors to their assigned sites only
    if (req.user.role === 'supervisor') {
      whereClause += whereClause ? ` AND dr.supervisor_id = $${paramCount}` : `WHERE dr.supervisor_id = $${paramCount}`;
      queryParams.push(req.user.id);
      paramCount++;
    }

    // Get summary statistics
    const statsResult = await query(`
      SELECT 
        COUNT(dr.id) as total_records,
        COUNT(DISTINCT dr.site_id) as total_sites,
        COUNT(DISTINCT dr.supervisor_id) as total_supervisors,
        COALESCE(SUM((dr.worker_counts->>'total')::int), 0) as total_workers,
        COALESCE(SUM((dr.payments_made->>'total')::decimal), 0) as total_payments,
        COALESCE(AVG((dr.production_data->>'tons_produced')::decimal), 0) as avg_production,
        MIN(dr.record_date) as earliest_date,
        MAX(dr.record_date) as latest_date
      FROM daily_records dr
      LEFT JOIN sites s ON dr.site_id = s.id
      ${whereClause}
    `, queryParams);

    // Get correction statistics
    const correctionStatsResult = await query(`
      SELECT 
        COUNT(sdc.id) as total_corrections,
        COUNT(DISTINCT sdc.daily_record_id) as records_corrected
      FROM same_day_corrections sdc
      JOIN daily_records dr ON sdc.daily_record_id = dr.id
      LEFT JOIN sites s ON dr.site_id = s.id
      ${whereClause}
    `, queryParams);

    res.json({
      summary: statsResult.rows[0],
      corrections: correctionStatsResult.rows[0]
    });

  } catch (error) {
    console.error('Get daily records statistics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;