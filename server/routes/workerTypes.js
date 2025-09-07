const express = require('express');
const { body, param } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, requireRole, logUserAction } = require('../middleware/auth');
const { validate } = require('../utils/validation');

const router = express.Router();

// Get worker types for a site
router.get('/site/:siteId', [
  authenticateToken,
  requireRole(['super_admin', 'site_admin']),
  param('siteId').isUUID(),
  validate
], async (req, res) => {
  try {
    const { siteId } = req.params;

    const result = await pool.query(
      `SELECT wt.id, wt.name, wt.daily_rate, wt.description, wt.minimum_tasks, wt.is_active, wt.created_at, wt.updated_at
       FROM worker_types wt
       WHERE wt.site_id = $1
       ORDER BY wt.created_at ASC`,
      [siteId]
    );

    res.json({
      success: true,
      data: result.rows.map(wt => ({
        id: wt.id,
        name: wt.name,
        dailyRate: parseFloat(wt.daily_rate),
        description: wt.description,
        minimumTasks: wt.minimum_tasks,
        isActive: wt.is_active,
        createdAt: wt.created_at,
        updatedAt: wt.updated_at
      }))
    });

  } catch (error) {
    console.error('Get worker types error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch worker types'
    });
  }
});

// Get worker type by ID
router.get('/:id', [
  authenticateToken,
  requireRole(['super_admin', 'site_admin']),
  param('id').isUUID(),
  validate
], async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT wt.id, wt.name, wt.site_id, wt.daily_rate, wt.description, wt.minimum_tasks, wt.is_active, wt.created_at, wt.updated_at,
              s.name as site_name, s.location as site_location
       FROM worker_types wt
       JOIN sites s ON s.id = wt.site_id
       WHERE wt.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Worker type not found'
      });
    }

    const workerType = result.rows[0];

    res.json({
      success: true,
      data: {
        id: workerType.id,
        name: workerType.name,
        siteId: workerType.site_id,
        siteName: workerType.site_name,
        siteLocation: workerType.site_location,
        dailyRate: parseFloat(workerType.daily_rate),
        description: workerType.description,
        minimumTasks: workerType.minimum_tasks,
        isActive: workerType.is_active,
        createdAt: workerType.created_at,
        updatedAt: workerType.updated_at
      }
    });

  } catch (error) {
    console.error('Get worker type error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch worker type'
    });
  }
});

// Create new worker type
router.post('/', [
  authenticateToken,
  requireRole(['super_admin']),
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Worker type name is required'),
  body('siteId').isUUID().withMessage('Valid site ID is required'),
  body('dailyRate').isFloat({ min: 0 }).withMessage('Daily rate must be a positive number'),
  body('description').optional().trim().isLength({ max: 500 }),
  body('minimumTasks').optional().trim().isLength({ max: 500 }),
  validate,
  logUserAction('CREATE_WORKER_TYPE', 'worker_types')
], async (req, res) => {
  try {
    const { name, siteId, dailyRate, description, minimumTasks } = req.body;

    // Verify site exists
    const siteResult = await pool.query(
      'SELECT id, name FROM sites WHERE id = $1',
      [siteId]
    );

    if (siteResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Site not found'
      });
    }

    // Check if worker type name already exists for this site
    const existingWorkerType = await pool.query(
      'SELECT id FROM worker_types WHERE name = $1 AND site_id = $2',
      [name, siteId]
    );

    if (existingWorkerType.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Worker type with this name already exists for this site'
      });
    }

    // Create worker type
    const result = await pool.query(
      `INSERT INTO worker_types (name, site_id, daily_rate, description, minimum_tasks)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, site_id, daily_rate, description, minimum_tasks, is_active, created_at`,
      [name, siteId, dailyRate, description, minimumTasks]
    );

    const workerType = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'Worker type created successfully',
      data: {
        id: workerType.id,
        name: workerType.name,
        siteId: workerType.site_id,
        siteName: siteResult.rows[0].name,
        dailyRate: parseFloat(workerType.daily_rate),
        description: workerType.description,
        minimumTasks: workerType.minimum_tasks,
        isActive: workerType.is_active,
        createdAt: workerType.created_at
      }
    });

  } catch (error) {
    console.error('Create worker type error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create worker type'
    });
  }
});

// Update worker type
router.put('/:id', [
  authenticateToken,
  requireRole(['super_admin']),
  param('id').isUUID(),
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('dailyRate').optional().isFloat({ min: 0 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('minimumTasks').optional().trim().isLength({ max: 500 }),
  body('isActive').optional().isBoolean(),
  validate,
  logUserAction('UPDATE_WORKER_TYPE', 'worker_types')
], async (req, res) => {
  try {
    const { id } = req.params;
    const { name, dailyRate, description, minimumTasks, isActive } = req.body;

    // Check if worker type exists
    const existingWorkerType = await pool.query(
      'SELECT id, site_id FROM worker_types WHERE id = $1',
      [id]
    );

    if (existingWorkerType.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Worker type not found'
      });
    }

    // Check if name is being changed and if it conflicts
    if (name) {
      const nameConflict = await pool.query(
        'SELECT id FROM worker_types WHERE name = $1 AND site_id = $2 AND id != $3',
        [name, existingWorkerType.rows[0].site_id, id]
      );

      if (nameConflict.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Worker type with this name already exists for this site'
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

    if (dailyRate !== undefined) {
      paramCount++;
      updates.push(`daily_rate = $${paramCount}`);
      values.push(dailyRate);
    }

    if (description !== undefined) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      values.push(description);
    }

    if (minimumTasks !== undefined) {
      paramCount++;
      updates.push(`minimum_tasks = $${paramCount}`);
      values.push(minimumTasks);
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

    const query = `UPDATE worker_types SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);

    const workerType = result.rows[0];

    res.json({
      success: true,
      message: 'Worker type updated successfully',
      data: {
        id: workerType.id,
        name: workerType.name,
        siteId: workerType.site_id,
        dailyRate: parseFloat(workerType.daily_rate),
        description: workerType.description,
        minimumTasks: workerType.minimum_tasks,
        isActive: workerType.is_active,
        updatedAt: workerType.updated_at
      }
    });

  } catch (error) {
    console.error('Update worker type error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update worker type'
    });
  }
});

// Delete worker type
router.delete('/:id', [
  authenticateToken,
  requireRole(['super_admin']),
  param('id').isUUID(),
  validate,
  logUserAction('DELETE_WORKER_TYPE', 'worker_types')
], async (req, res) => {
  try {
    const { id } = req.params;

    // Check if worker type exists
    const existingWorkerType = await pool.query(
      'SELECT id FROM worker_types WHERE id = $1',
      [id]
    );

    if (existingWorkerType.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Worker type not found'
      });
    }

    // Check if worker type has attendance records
    const attendanceRecords = await pool.query(
      'SELECT COUNT(*) FROM worker_attendance WHERE worker_type_id = $1',
      [id]
    );

    if (parseInt(attendanceRecords.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete worker type with existing attendance records'
      });
    }

    // Delete worker type
    await pool.query('DELETE FROM worker_types WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Worker type deleted successfully'
    });

  } catch (error) {
    console.error('Delete worker type error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete worker type'
    });
  }
});

// Get worker type statistics
router.get('/:id/statistics', [
  authenticateToken,
  requireRole(['super_admin', 'site_admin']),
  param('id').isUUID(),
  validate
], async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    // Get worker type info
    const workerTypeResult = await pool.query(
      `SELECT wt.id, wt.name, wt.daily_rate, wt.site_id,
              s.name as site_name, s.location as site_location
       FROM worker_types wt
       JOIN sites s ON s.id = wt.site_id
       WHERE wt.id = $1`,
      [id]
    );

    if (workerTypeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Worker type not found'
      });
    }

    const workerType = workerTypeResult.rows[0];

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

    // Get attendance statistics
    const statsResult = await pool.query(
      `SELECT 
         SUM(wa.worker_count) as total_workers,
         SUM(wa.amount_paid) as total_payments,
         COUNT(DISTINCT dr.work_date) as work_days,
         AVG(wa.worker_count) as avg_daily_workers,
         AVG(wa.amount_paid) as avg_daily_payments
       FROM worker_attendance wa
       JOIN daily_records dr ON dr.id = wa.daily_record_id
       WHERE wa.worker_type_id = $1 ${dateFilter}`,
      queryParams
    );

    // Get recent attendance records
    const recentRecordsResult = await pool.query(
      `SELECT dr.work_date, wa.worker_count, wa.amount_paid, wa.production_amount,
              dr.weather_condition, dr.notes
       FROM worker_attendance wa
       JOIN daily_records dr ON dr.id = wa.daily_record_id
       WHERE wa.worker_type_id = $1 ${dateFilter}
       ORDER BY dr.work_date DESC
       LIMIT 10`,
      queryParams
    );

    const stats = statsResult.rows[0];

    res.json({
      success: true,
      data: {
        workerType: {
          id: workerType.id,
          name: workerType.name,
          dailyRate: parseFloat(workerType.daily_rate),
          siteId: workerType.site_id,
          siteName: workerType.site_name,
          siteLocation: workerType.site_location
        },
        statistics: {
          totalWorkers: parseInt(stats.total_workers) || 0,
          totalPayments: parseFloat(stats.total_payments) || 0,
          workDays: parseInt(stats.work_days) || 0,
          avgDailyWorkers: parseFloat(stats.avg_daily_workers) || 0,
          avgDailyPayments: parseFloat(stats.avg_daily_payments) || 0
        },
        recentRecords: recentRecordsResult.rows.map(record => ({
          workDate: record.work_date,
          workerCount: parseInt(record.worker_count),
          amountPaid: parseFloat(record.amount_paid),
          productionAmount: parseFloat(record.production_amount) || 0,
          weatherCondition: record.weather_condition,
          notes: record.notes
        }))
      }
    });

  } catch (error) {
    console.error('Get worker type statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch worker type statistics'
    });
  }
});

module.exports = router;