const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken, requireSiteAdmin } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get worker types for a site
router.get('/site/:siteId', async (req, res) => {
  try {
    const { siteId } = req.params;
    const { status = 'active' } = req.query;

    let whereClause = 'WHERE site_id = $1';
    let queryParams = [siteId];

    if (status === 'active') {
      whereClause += ' AND is_active = true';
    } else if (status === 'inactive') {
      whereClause += ' AND is_active = false';
    }

    const workerTypesResult = await query(`
      SELECT 
        wt.*,
        s.name as site_name,
        s.client_company
      FROM worker_types wt
      LEFT JOIN sites s ON wt.site_id = s.id
      ${whereClause}
      ORDER BY wt.name
    `, queryParams);

    res.json({ worker_types: workerTypesResult.rows });

  } catch (error) {
    console.error('Get worker types error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single worker type
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const workerTypeResult = await query(`
      SELECT 
        wt.*,
        s.name as site_name,
        s.client_company,
        p.name as project_name
      FROM worker_types wt
      LEFT JOIN sites s ON wt.site_id = s.id
      LEFT JOIN projects p ON s.project_id = p.id
      WHERE wt.id = $1
    `, [id]);

    if (workerTypeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Worker type not found' });
    }

    res.json({ worker_type: workerTypeResult.rows[0] });

  } catch (error) {
    console.error('Get worker type error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new worker type
router.post('/', [
  requireSiteAdmin,
  body('site_id').isInt().withMessage('Valid site ID is required'),
  body('name').notEmpty().withMessage('Worker type name is required'),
  body('daily_rate').isDecimal().withMessage('Valid daily rate is required'),
  body('description').optional(),
  body('minimum_task_requirement').optional()
], auditMiddleware('worker_types', (req) => req.body.id), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { site_id, name, daily_rate, description, minimum_task_requirement } = req.body;

    // Check if site exists and is active
    const siteResult = await query(
      'SELECT id FROM sites WHERE id = $1 AND is_active = true',
      [site_id]
    );

    if (siteResult.rows.length === 0) {
      return res.status(400).json({ error: 'Site not found or inactive' });
    }

    // Check if worker type name already exists in this site
    const existingWorkerType = await query(
      'SELECT id FROM worker_types WHERE site_id = $1 AND name = $2',
      [site_id, name]
    );

    if (existingWorkerType.rows.length > 0) {
      return res.status(400).json({ error: 'Worker type name already exists in this site' });
    }

    const workerTypeResult = await query(`
      INSERT INTO worker_types (site_id, name, daily_rate, description, minimum_task_requirement)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [site_id, name, parseFloat(daily_rate), description, minimum_task_requirement]);

    res.status(201).json({
      message: 'Worker type created successfully',
      worker_type: workerTypeResult.rows[0]
    });

  } catch (error) {
    console.error('Create worker type error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update worker type
router.put('/:id', [
  requireSiteAdmin,
  body('name').optional().notEmpty().withMessage('Worker type name cannot be empty'),
  body('daily_rate').optional().isDecimal().withMessage('Valid daily rate is required'),
  body('description').optional(),
  body('minimum_task_requirement').optional(),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean')
], auditMiddleware('worker_types'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { id } = req.params;
    const { name, daily_rate, description, minimum_task_requirement, is_active } = req.body;

    // Check if worker type exists
    const existingWorkerType = await query(
      'SELECT * FROM worker_types WHERE id = $1',
      [id]
    );

    if (existingWorkerType.rows.length === 0) {
      return res.status(404).json({ error: 'Worker type not found' });
    }

    // Check if new name conflicts with existing worker types in the same site
    if (name && name !== existingWorkerType.rows[0].name) {
      const nameConflict = await query(
        'SELECT id FROM worker_types WHERE site_id = $1 AND name = $2 AND id != $3',
        [existingWorkerType.rows[0].site_id, name, id]
      );

      if (nameConflict.rows.length > 0) {
        return res.status(400).json({ error: 'Worker type name already exists in this site' });
      }
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }

    if (daily_rate !== undefined) {
      updates.push(`daily_rate = $${paramCount++}`);
      values.push(parseFloat(daily_rate));
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }

    if (minimum_task_requirement !== undefined) {
      updates.push(`minimum_task_requirement = $${paramCount++}`);
      values.push(minimum_task_requirement);
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

    const workerTypeResult = await query(`
      UPDATE worker_types 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    res.json({
      message: 'Worker type updated successfully',
      worker_type: workerTypeResult.rows[0]
    });

  } catch (error) {
    console.error('Update worker type error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete worker type (soft delete)
router.delete('/:id', [
  requireSiteAdmin
], auditMiddleware('worker_types'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if worker type exists
    const existingWorkerType = await query(
      'SELECT * FROM worker_types WHERE id = $1',
      [id]
    );

    if (existingWorkerType.rows.length === 0) {
      return res.status(404).json({ error: 'Worker type not found' });
    }

    // Check if worker type is used in daily records
    const hasRecords = await query(`
      SELECT COUNT(*) as count 
      FROM daily_records 
      WHERE worker_counts ? $1 OR payments_made ? $1
    `, [id.toString()]);

    if (parseInt(hasRecords.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete worker type that has been used in daily records. Please deactivate it instead.' 
      });
    }

    // Soft delete worker type
    await query(
      'UPDATE worker_types SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    res.json({ message: 'Worker type deleted successfully' });

  } catch (error) {
    console.error('Delete worker type error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get worker type usage statistics
router.get('/:id/statistics', async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;

    // Check if worker type exists
    const workerTypeExists = await query(
      'SELECT * FROM worker_types WHERE id = $1',
      [id]
    );

    if (workerTypeExists.rows.length === 0) {
      return res.status(404).json({ error: 'Worker type not found' });
    }

    let dateFilter = '';
    let queryParams = [id];
    let paramCount = 2;

    if (start_date && end_date) {
      dateFilter = `AND dr.record_date BETWEEN $${paramCount} AND $${paramCount + 1}`;
      queryParams.push(start_date, end_date);
    }

    // Get usage statistics
    const statsResult = await query(`
      SELECT 
        COUNT(dr.id) as days_used,
        COALESCE(SUM((dr.worker_counts->>$1)::int), 0) as total_workers,
        COALESCE(SUM((dr.payments_made->>$1)::decimal), 0) as total_payments,
        COALESCE(AVG((dr.worker_counts->>$1)::int), 0) as avg_workers_per_day,
        COALESCE(AVG((dr.payments_made->>$1)::decimal), 0) as avg_payment_per_day
      FROM daily_records dr
      WHERE (dr.worker_counts ? $1 OR dr.payments_made ? $1) ${dateFilter}
    `, queryParams);

    // Get recent usage
    const recentUsageResult = await query(`
      SELECT 
        dr.record_date,
        s.name as site_name,
        (dr.worker_counts->>$1)::int as worker_count,
        (dr.payments_made->>$1)::decimal as payment_amount
      FROM daily_records dr
      JOIN sites s ON dr.site_id = s.id
      WHERE (dr.worker_counts ? $1 OR dr.payments_made ? $1) ${dateFilter}
      ORDER BY dr.record_date DESC
      LIMIT 10
    `, queryParams);

    res.json({
      worker_type: workerTypeExists.rows[0],
      statistics: statsResult.rows[0],
      recent_usage: recentUsageResult.rows
    });

  } catch (error) {
    console.error('Get worker type statistics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;