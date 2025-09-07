const express = require('express');
const { body, param, query } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, requireRole, requireSiteAccess, logUserAction } = require('../middleware/auth');
const { validate, validateDateRange, validateSameDayCorrection } = require('../utils/validation');

const router = express.Router();

// Get daily records for a site
router.get('/site/:siteId', [
  authenticateToken,
  requireRole(['super_admin', 'site_admin']),
  param('siteId').isUUID(),
  validate
], async (req, res) => {
  try {
    const { siteId } = req.params;
    const { startDate, endDate, page = 1, limit = 20 } = req.query;

    // Build date filter
    let dateFilter = '';
    const queryParams = [siteId];
    let paramCount = 1;

    if (startDate && endDate) {
      paramCount++;
      dateFilter = `AND dr.work_date >= $${paramCount}`;
      queryParams.push(startDate);
      paramCount++;
      dateFilter += ` AND dr.work_date <= $${paramCount}`;
      queryParams.push(endDate);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await pool.query(
      `SELECT dr.id, dr.work_date, dr.weather_condition, dr.notes, dr.is_locked, dr.created_at, dr.updated_at,
              u.first_name as supervisor_name, u.last_name as supervisor_lastname,
              COUNT(wa.id) as attendance_records
       FROM daily_records dr
       LEFT JOIN users u ON u.id = dr.supervisor_id
       LEFT JOIN worker_attendance wa ON wa.daily_record_id = dr.id
       WHERE dr.site_id = $1 ${dateFilter}
       GROUP BY dr.id, u.first_name, u.last_name
       ORDER BY dr.work_date DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...queryParams, parseInt(limit), offset]
    );

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM daily_records dr WHERE dr.site_id = $1 ${dateFilter}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        dailyRecords: result.rows.map(dr => ({
          id: dr.id,
          workDate: dr.work_date,
          weatherCondition: dr.weather_condition,
          notes: dr.notes,
          isLocked: dr.is_locked,
          supervisorName: dr.supervisor_name ? `${dr.supervisor_name} ${dr.supervisor_lastname}` : null,
          attendanceRecords: parseInt(dr.attendance_records),
          createdAt: dr.created_at,
          updatedAt: dr.updated_at
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get daily records error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch daily records'
    });
  }
});

// Get daily record by ID with full details
router.get('/:id', [
  authenticateToken,
  requireRole(['super_admin', 'site_admin']),
  param('id').isUUID(),
  validate
], async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT dr.id, dr.site_id, dr.work_date, dr.weather_condition, dr.notes, dr.is_locked, dr.created_at, dr.updated_at,
              s.name as site_name, s.location as site_location,
              u.first_name as supervisor_name, u.last_name as supervisor_lastname
       FROM daily_records dr
       JOIN sites s ON s.id = dr.site_id
       LEFT JOIN users u ON u.id = dr.supervisor_id
       WHERE dr.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Daily record not found'
      });
    }

    const dailyRecord = result.rows[0];

    // Get worker attendance records
    const attendanceResult = await pool.query(
      `SELECT wa.id, wa.worker_type_id, wa.worker_count, wa.production_amount, wa.production_unit, 
              wa.amount_paid, wa.worker_names, wa.created_at, wa.updated_at,
              wt.name as worker_type_name, wt.daily_rate
       FROM worker_attendance wa
       JOIN worker_types wt ON wt.id = wa.worker_type_id
       WHERE wa.daily_record_id = $1
       ORDER BY wt.name ASC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        id: dailyRecord.id,
        siteId: dailyRecord.site_id,
        siteName: dailyRecord.site_name,
        siteLocation: dailyRecord.site_location,
        workDate: dailyRecord.work_date,
        weatherCondition: dailyRecord.weather_condition,
        notes: dailyRecord.notes,
        isLocked: dailyRecord.is_locked,
        supervisorName: dailyRecord.supervisor_name ? `${dailyRecord.supervisor_name} ${dailyRecord.supervisor_lastname}` : null,
        createdAt: dailyRecord.created_at,
        updatedAt: dailyRecord.updated_at,
        workerAttendance: attendanceResult.rows.map(wa => ({
          id: wa.id,
          workerTypeId: wa.worker_type_id,
          workerTypeName: wa.worker_type_name,
          dailyRate: parseFloat(wa.daily_rate),
          workerCount: parseInt(wa.worker_count),
          productionAmount: parseFloat(wa.production_amount) || 0,
          productionUnit: wa.production_unit,
          amountPaid: parseFloat(wa.amount_paid),
          workerNames: wa.worker_names,
          createdAt: wa.created_at,
          updatedAt: wa.updated_at
        }))
      }
    });

  } catch (error) {
    console.error('Get daily record error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch daily record'
    });
  }
});

// Create new daily record (Supervisor only)
router.post('/', [
  authenticateToken,
  requireRole(['supervisor']),
  body('siteId').isUUID().withMessage('Valid site ID is required'),
  body('workDate').isISO8601().withMessage('Valid work date is required'),
  body('weatherCondition').optional().trim().isLength({ max: 50 }),
  body('notes').optional().trim().isLength({ max: 1000 }),
  body('workerAttendance').isArray({ min: 1 }).withMessage('At least one worker attendance record is required'),
  body('workerAttendance.*.workerTypeId').isUUID().withMessage('Valid worker type ID is required'),
  body('workerAttendance.*.workerCount').isInt({ min: 0, max: 1000 }).withMessage('Worker count must be between 0 and 1000'),
  body('workerAttendance.*.productionAmount').optional().isFloat({ min: 0 }).withMessage('Production amount must be positive'),
  body('workerAttendance.*.productionUnit').optional().trim().isLength({ max: 20 }),
  body('workerAttendance.*.amountPaid').isFloat({ min: 0 }).withMessage('Amount paid must be positive'),
  body('workerAttendance.*.workerNames').optional().trim().isLength({ max: 2000 }),
  validate
], async (req, res) => {
  try {
    const { siteId, workDate, weatherCondition, notes, workerAttendance } = req.body;

    // Verify site access for supervisor
    const siteResult = await pool.query(
      'SELECT id, name FROM sites WHERE id = $1 AND assigned_supervisor_id = $2',
      [siteId, req.user.id]
    );

    if (siteResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this site'
      });
    }

    // Check if record already exists for this date
    const existingRecord = await pool.query(
      'SELECT id FROM daily_records WHERE site_id = $1 AND work_date = $2',
      [siteId, workDate]
    );

    if (existingRecord.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Daily record already exists for this date'
      });
    }

    // Validate work date (cannot be in the future)
    const workDateObj = new Date(workDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (workDateObj > today) {
      return res.status(400).json({
        success: false,
        message: 'Work date cannot be in the future'
      });
    }

    // Validate worker types belong to this site
    const workerTypeIds = workerAttendance.map(wa => wa.workerTypeId);
    const workerTypesResult = await pool.query(
      'SELECT id, name FROM worker_types WHERE id = ANY($1) AND site_id = $2',
      [workerTypeIds, siteId]
    );

    if (workerTypesResult.rows.length !== workerTypeIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more worker types do not belong to this site'
      });
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create daily record
      const dailyRecordResult = await client.query(
        `INSERT INTO daily_records (site_id, work_date, weather_condition, notes, supervisor_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [siteId, workDate, weatherCondition, notes, req.user.id]
      );

      const dailyRecordId = dailyRecordResult.rows[0].id;

      // Create worker attendance records
      for (const attendance of workerAttendance) {
        await client.query(
          `INSERT INTO worker_attendance (daily_record_id, worker_type_id, worker_count, production_amount, production_unit, amount_paid, worker_names)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            dailyRecordId,
            attendance.workerTypeId,
            attendance.workerCount,
            attendance.productionAmount || null,
            attendance.productionUnit || 'tons',
            attendance.amountPaid,
            attendance.workerNames || null
          ]
        );
      }

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'Daily record created successfully',
        data: {
          id: dailyRecordId,
          siteId,
          workDate,
          weatherCondition,
          notes,
          workerAttendanceCount: workerAttendance.length
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Create daily record error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create daily record'
    });
  }
});

// Update daily record (Same day corrections only)
router.put('/:id', [
  authenticateToken,
  requireRole(['supervisor']),
  param('id').isUUID(),
  body('weatherCondition').optional().trim().isLength({ max: 50 }),
  body('notes').optional().trim().isLength({ max: 1000 }),
  body('workerAttendance').isArray({ min: 1 }).withMessage('At least one worker attendance record is required'),
  body('workerAttendance.*.id').optional().isUUID(),
  body('workerAttendance.*.workerTypeId').isUUID().withMessage('Valid worker type ID is required'),
  body('workerAttendance.*.workerCount').isInt({ min: 0, max: 1000 }).withMessage('Worker count must be between 0 and 1000'),
  body('workerAttendance.*.productionAmount').optional().isFloat({ min: 0 }),
  body('workerAttendance.*.productionUnit').optional().trim().isLength({ max: 20 }),
  body('workerAttendance.*.amountPaid').isFloat({ min: 0 }).withMessage('Amount paid must be positive'),
  body('workerAttendance.*.workerNames').optional().trim().isLength({ max: 2000 }),
  body('reason').trim().isLength({ min: 5, max: 255 }).withMessage('Correction reason is required'),
  validate,
  validateSameDayCorrection,
  logUserAction('UPDATE_DAILY_RECORD', 'daily_records')
], async (req, res) => {
  try {
    const { id } = req.params;
    const { weatherCondition, notes, workerAttendance, reason } = req.body;

    // Get existing record
    const existingRecord = await pool.query(
      `SELECT dr.id, dr.site_id, dr.work_date, dr.is_locked, dr.supervisor_id
       FROM daily_records dr
       WHERE dr.id = $1`,
      [id]
    );

    if (existingRecord.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Daily record not found'
      });
    }

    const record = existingRecord.rows[0];

    // Check if record is locked
    if (record.is_locked) {
      return res.status(400).json({
        success: false,
        message: 'Record is locked and cannot be modified'
      });
    }

    // Check if supervisor has access to this record
    if (record.supervisor_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this record'
      });
    }

    // Check if work date is today (same day correction)
    const workDate = new Date(record.work_date);
    const today = new Date();
    const isToday = workDate.toDateString() === today.toDateString();

    if (!isToday) {
      return res.status(400).json({
        success: false,
        message: 'Corrections can only be made on the same day'
      });
    }

    // Update supervisor performance tracking
    await pool.query(
      `INSERT INTO supervisor_performance (supervisor_id, site_id, work_date, corrections_count, last_correction_at, performance_notes)
       VALUES ($1, $2, $3, 1, CURRENT_TIMESTAMP, $4)
       ON CONFLICT (supervisor_id, site_id, work_date)
       DO UPDATE SET 
         corrections_count = supervisor_performance.corrections_count + 1,
         last_correction_at = CURRENT_TIMESTAMP,
         performance_notes = $4`,
      [req.user.id, record.site_id, record.work_date, reason]
    );

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update daily record
      await client.query(
        `UPDATE daily_records 
         SET weather_condition = $1, notes = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [weatherCondition, notes, id]
      );

      // Delete existing worker attendance records
      await client.query(
        'DELETE FROM worker_attendance WHERE daily_record_id = $1',
        [id]
      );

      // Create new worker attendance records
      for (const attendance of workerAttendance) {
        await client.query(
          `INSERT INTO worker_attendance (daily_record_id, worker_type_id, worker_count, production_amount, production_unit, amount_paid, worker_names)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            id,
            attendance.workerTypeId,
            attendance.workerCount,
            attendance.productionAmount || null,
            attendance.productionUnit || 'tons',
            attendance.amountPaid,
            attendance.workerNames || null
          ]
        );
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Daily record updated successfully',
        data: {
          id,
          reason,
          updatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Update daily record error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update daily record'
    });
  }
});

// Lock daily record (Admin only - prevents further modifications)
router.post('/:id/lock', [
  authenticateToken,
  requireRole(['super_admin', 'site_admin']),
  param('id').isUUID(),
  validate,
  logUserAction('LOCK_DAILY_RECORD', 'daily_records')
], async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'UPDATE daily_records SET is_locked = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, work_date',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Daily record not found'
      });
    }

    res.json({
      success: true,
      message: 'Daily record locked successfully',
      data: {
        id,
        workDate: result.rows[0].work_date,
        lockedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Lock daily record error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to lock daily record'
    });
  }
});

// Get daily record summary for dashboard
router.get('/summary/dashboard', [
  authenticateToken,
  requireRole(['super_admin', 'site_admin']),
  validate
], async (req, res) => {
  try {
    const { date = new Date().toISOString().split('T')[0] } = req.query;

    // Get today's summary
    const todaySummary = await pool.query(
      `SELECT 
         COUNT(DISTINCT dr.id) as total_records,
         COUNT(DISTINCT dr.site_id) as sites_with_records,
         SUM(wa.worker_count) as total_workers,
         SUM(wa.amount_paid) as total_payments
       FROM daily_records dr
       LEFT JOIN worker_attendance wa ON wa.daily_record_id = dr.id
       WHERE dr.work_date = $1`,
      [date]
    );

    // Get missing records (sites without records for today)
    const missingRecords = await pool.query(
      `SELECT s.id, s.name, s.location, p.name as project_name, c.name as company_name
       FROM sites s
       JOIN projects p ON p.id = s.project_id
       JOIN companies c ON c.id = p.company_id
       WHERE s.status = 'active' 
       AND s.id NOT IN (
         SELECT site_id FROM daily_records WHERE work_date = $1
       )`,
      [date]
    );

    // Get recent activity (last 7 days)
    const recentActivity = await pool.query(
      `SELECT dr.work_date, 
              COUNT(DISTINCT dr.id) as records_count,
              SUM(wa.worker_count) as total_workers,
              SUM(wa.amount_paid) as total_payments
       FROM daily_records dr
       LEFT JOIN worker_attendance wa ON wa.daily_record_id = dr.id
       WHERE dr.work_date >= $1::date - INTERVAL '7 days'
       GROUP BY dr.work_date
       ORDER BY dr.work_date DESC`,
      [date]
    );

    const summary = todaySummary.rows[0];

    res.json({
      success: true,
      data: {
        date,
        todaySummary: {
          totalRecords: parseInt(summary.total_records) || 0,
          sitesWithRecords: parseInt(summary.sites_with_records) || 0,
          totalWorkers: parseInt(summary.total_workers) || 0,
          totalPayments: parseFloat(summary.total_payments) || 0
        },
        missingRecords: missingRecords.rows.map(site => ({
          id: site.id,
          name: site.name,
          location: site.location,
          projectName: site.project_name,
          companyName: site.company_name
        })),
        recentActivity: recentActivity.rows.map(activity => ({
          workDate: activity.work_date,
          recordsCount: parseInt(activity.records_count),
          totalWorkers: parseInt(activity.total_workers) || 0,
          totalPayments: parseFloat(activity.total_payments) || 0
        }))
      }
    });

  } catch (error) {
    console.error('Get dashboard summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard summary'
    });
  }
});

module.exports = router;