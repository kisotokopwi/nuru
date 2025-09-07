const express = require('express');
const { query } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validate, validateDateRange } = require('../utils/validation');
const { formatCurrency } = require('../utils/currency');

const router = express.Router();

// Get comprehensive dashboard data
router.get('/dashboard', [
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
         COUNT(DISTINCT s.project_id) as projects_active,
         COUNT(DISTINCT p.company_id) as companies_active,
         SUM(wa.worker_count) as total_workers,
         SUM(wa.amount_paid) as total_payments
       FROM daily_records dr
       JOIN sites s ON s.id = dr.site_id
       JOIN projects p ON p.id = s.project_id
       LEFT JOIN worker_attendance wa ON wa.daily_record_id = dr.id
       WHERE dr.work_date = $1`,
      [date]
    );

    // Get missing records (sites without records for today)
    const missingRecords = await pool.query(
      `SELECT s.id, s.name, s.location, p.name as project_name, c.name as company_name,
              u.first_name as supervisor_name, u.last_name as supervisor_lastname
       FROM sites s
       JOIN projects p ON p.id = s.project_id
       JOIN companies c ON c.id = p.company_id
       LEFT JOIN users u ON u.id = s.assigned_supervisor_id
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
              COUNT(DISTINCT dr.site_id) as sites_count,
              SUM(wa.worker_count) as total_workers,
              SUM(wa.amount_paid) as total_payments
       FROM daily_records dr
       LEFT JOIN worker_attendance wa ON wa.daily_record_id = dr.id
       WHERE dr.work_date >= $1::date - INTERVAL '7 days'
       GROUP BY dr.work_date
       ORDER BY dr.work_date DESC`,
      [date]
    );

    // Get top performing sites (by worker count)
    const topSites = await pool.query(
      `SELECT s.id, s.name, s.location, p.name as project_name, c.name as company_name,
              SUM(wa.worker_count) as total_workers,
              SUM(wa.amount_paid) as total_payments,
              COUNT(DISTINCT dr.work_date) as work_days
       FROM sites s
       JOIN projects p ON p.id = s.project_id
       JOIN companies c ON c.id = p.company_id
       JOIN daily_records dr ON dr.site_id = s.id
       JOIN worker_attendance wa ON wa.daily_record_id = dr.id
       WHERE dr.work_date >= $1::date - INTERVAL '30 days'
       GROUP BY s.id, s.name, s.location, p.name, c.name
       ORDER BY total_workers DESC
       LIMIT 5`,
      [date]
    );

    // Get company performance
    const companyPerformance = await pool.query(
      `SELECT c.id, c.name,
              COUNT(DISTINCT p.id) as project_count,
              COUNT(DISTINCT s.id) as site_count,
              SUM(wa.worker_count) as total_workers,
              SUM(wa.amount_paid) as total_payments,
              COUNT(DISTINCT dr.work_date) as work_days
       FROM companies c
       JOIN projects p ON p.company_id = c.id
       JOIN sites s ON s.project_id = p.id
       JOIN daily_records dr ON dr.site_id = s.id
       JOIN worker_attendance wa ON wa.daily_record_id = dr.id
       WHERE dr.work_date >= $1::date - INTERVAL '30 days'
       GROUP BY c.id, c.name
       ORDER BY total_payments DESC`,
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
          projectsActive: parseInt(summary.projects_active) || 0,
          companiesActive: parseInt(summary.companies_active) || 0,
          totalWorkers: parseInt(summary.total_workers) || 0,
          totalPayments: parseFloat(summary.total_payments) || 0
        },
        missingRecords: missingRecords.rows.map(site => ({
          id: site.id,
          name: site.name,
          location: site.location,
          projectName: site.project_name,
          companyName: site.company_name,
          supervisorName: site.supervisor_name ? `${site.supervisor_name} ${site.supervisor_lastname}` : 'Not Assigned'
        })),
        recentActivity: recentActivity.rows.map(activity => ({
          workDate: activity.work_date,
          recordsCount: parseInt(activity.records_count),
          sitesCount: parseInt(activity.sites_count),
          totalWorkers: parseInt(activity.total_workers) || 0,
          totalPayments: parseFloat(activity.total_payments) || 0
        })),
        topSites: topSites.rows.map(site => ({
          id: site.id,
          name: site.name,
          location: site.location,
          projectName: site.project_name,
          companyName: site.company_name,
          totalWorkers: parseInt(site.total_workers),
          totalPayments: parseFloat(site.total_payments),
          workDays: parseInt(site.work_days)
        })),
        companyPerformance: companyPerformance.rows.map(company => ({
          id: company.id,
          name: company.name,
          projectCount: parseInt(company.project_count),
          siteCount: parseInt(company.site_count),
          totalWorkers: parseInt(company.total_workers),
          totalPayments: parseFloat(company.total_payments),
          workDays: parseInt(company.work_days)
        }))
      }
    });

  } catch (error) {
    console.error('Get dashboard data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
});

// Get detailed analytics report
router.get('/analytics', [
  authenticateToken,
  requireRole(['super_admin', 'site_admin']),
  validateDateRange
], async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      companyId, 
      projectId, 
      siteId,
      groupBy = 'day' // day, week, month
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    // Build filters
    let filters = 'WHERE dr.work_date >= $1 AND dr.work_date <= $2';
    const queryParams = [startDate, endDate];
    let paramCount = 2;

    if (companyId) {
      paramCount++;
      filters += ` AND p.company_id = $${paramCount}`;
      queryParams.push(companyId);
    }

    if (projectId) {
      paramCount++;
      filters += ` AND s.project_id = $${paramCount}`;
      queryParams.push(projectId);
    }

    if (siteId) {
      paramCount++;
      filters += ` AND dr.site_id = $${paramCount}`;
      queryParams.push(siteId);
    }

    // Build group by clause
    let groupByClause;
    switch (groupBy) {
      case 'week':
        groupByClause = 'DATE_TRUNC(\'week\', dr.work_date)';
        break;
      case 'month':
        groupByClause = 'DATE_TRUNC(\'month\', dr.work_date)';
        break;
      default:
        groupByClause = 'dr.work_date';
    }

    // Get time series data
    const timeSeriesResult = await pool.query(
      `SELECT ${groupByClause} as period,
              COUNT(DISTINCT dr.id) as records_count,
              COUNT(DISTINCT dr.site_id) as sites_count,
              SUM(wa.worker_count) as total_workers,
              SUM(wa.amount_paid) as total_payments,
              AVG(wa.worker_count) as avg_workers_per_record
       FROM daily_records dr
       JOIN sites s ON s.id = dr.site_id
       JOIN projects p ON p.id = s.project_id
       JOIN worker_attendance wa ON wa.daily_record_id = dr.id
       ${filters}
       GROUP BY ${groupByClause}
       ORDER BY period ASC`,
      queryParams
    );

    // Get site-wise breakdown
    const siteBreakdownResult = await pool.query(
      `SELECT s.id, s.name, s.location, p.name as project_name, c.name as company_name,
              COUNT(DISTINCT dr.id) as records_count,
              SUM(wa.worker_count) as total_workers,
              SUM(wa.amount_paid) as total_payments,
              AVG(wa.worker_count) as avg_workers_per_day,
              COUNT(DISTINCT wa.worker_type_id) as worker_types_used
       FROM daily_records dr
       JOIN sites s ON s.id = dr.site_id
       JOIN projects p ON p.id = s.project_id
       JOIN companies c ON c.id = p.company_id
       JOIN worker_attendance wa ON wa.daily_record_id = dr.id
       ${filters}
       GROUP BY s.id, s.name, s.location, p.name, c.name
       ORDER BY total_workers DESC`,
      queryParams
    );

    // Get worker type analysis
    const workerTypeAnalysisResult = await pool.query(
      `SELECT wt.id, wt.name, wt.daily_rate,
              COUNT(DISTINCT dr.id) as usage_days,
              SUM(wa.worker_count) as total_workers,
              SUM(wa.amount_paid) as total_payments,
              AVG(wa.worker_count) as avg_workers_per_day,
              AVG(wa.amount_paid / NULLIF(wa.worker_count, 0)) as avg_payment_per_worker
       FROM worker_attendance wa
       JOIN worker_types wt ON wt.id = wa.worker_type_id
       JOIN daily_records dr ON dr.id = wa.daily_record_id
       JOIN sites s ON s.id = dr.site_id
       JOIN projects p ON p.id = s.project_id
       ${filters}
       GROUP BY wt.id, wt.name, wt.daily_rate
       ORDER BY total_workers DESC`,
      queryParams
    );

    // Get productivity metrics
    const productivityResult = await pool.query(
      `SELECT 
              AVG(wa.worker_count) as avg_workers_per_site,
              AVG(wa.amount_paid) as avg_payment_per_site,
              AVG(wa.production_amount) as avg_production_per_site,
              COUNT(DISTINCT dr.work_date) as total_work_days,
              COUNT(DISTINCT dr.site_id) as total_sites
       FROM daily_records dr
       JOIN sites s ON s.id = dr.site_id
       JOIN projects p ON p.id = s.project_id
       JOIN worker_attendance wa ON wa.daily_record_id = dr.id
       ${filters}`,
      queryParams
    );

    const productivity = productivityResult.rows[0];

    res.json({
      success: true,
      data: {
        period: {
          startDate,
          endDate,
          groupBy
        },
        timeSeries: timeSeriesResult.rows.map(row => ({
          period: row.period,
          recordsCount: parseInt(row.records_count),
          sitesCount: parseInt(row.sites_count),
          totalWorkers: parseInt(row.total_workers) || 0,
          totalPayments: parseFloat(row.total_payments) || 0,
          avgWorkersPerRecord: parseFloat(row.avg_workers_per_record) || 0
        })),
        siteBreakdown: siteBreakdownResult.rows.map(site => ({
          id: site.id,
          name: site.name,
          location: site.location,
          projectName: site.project_name,
          companyName: site.company_name,
          recordsCount: parseInt(site.records_count),
          totalWorkers: parseInt(site.total_workers),
          totalPayments: parseFloat(site.total_payments),
          avgWorkersPerDay: parseFloat(site.avg_workers_per_day) || 0,
          workerTypesUsed: parseInt(site.worker_types_used)
        })),
        workerTypeAnalysis: workerTypeAnalysisResult.rows.map(wt => ({
          id: wt.id,
          name: wt.name,
          dailyRate: parseFloat(wt.daily_rate),
          usageDays: parseInt(wt.usage_days),
          totalWorkers: parseInt(wt.total_workers),
          totalPayments: parseFloat(wt.total_payments),
          avgWorkersPerDay: parseFloat(wt.avg_workers_per_day) || 0,
          avgPaymentPerWorker: parseFloat(wt.avg_payment_per_worker) || 0
        })),
        productivityMetrics: {
          avgWorkersPerSite: parseFloat(productivity.avg_workers_per_site) || 0,
          avgPaymentPerSite: parseFloat(productivity.avg_payment_per_site) || 0,
          avgProductionPerSite: parseFloat(productivity.avg_production_per_site) || 0,
          totalWorkDays: parseInt(productivity.total_work_days) || 0,
          totalSites: parseInt(productivity.total_sites) || 0
        }
      }
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data'
    });
  }
});

// Get supervisor performance report
router.get('/supervisor-performance', [
  authenticateToken,
  requireRole(['super_admin', 'site_admin']),
  validateDateRange
], async (req, res) => {
  try {
    const { startDate, endDate, supervisorId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    let filters = 'WHERE dr.work_date >= $1 AND dr.work_date <= $2';
    const queryParams = [startDate, endDate];
    let paramCount = 2;

    if (supervisorId) {
      paramCount++;
      filters += ` AND dr.supervisor_id = $${paramCount}`;
      queryParams.push(supervisorId);
    }

    // Get supervisor performance data
    const performanceResult = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email,
              COUNT(DISTINCT dr.id) as total_records,
              COUNT(DISTINCT dr.site_id) as sites_managed,
              SUM(wa.worker_count) as total_workers_managed,
              SUM(wa.amount_paid) as total_payments_managed,
              AVG(sp.corrections_count) as avg_corrections_per_day,
              MAX(sp.corrections_count) as max_corrections_per_day
       FROM users u
       JOIN daily_records dr ON dr.supervisor_id = u.id
       JOIN sites s ON s.id = dr.site_id
       JOIN projects p ON p.id = s.project_id
       JOIN worker_attendance wa ON wa.daily_record_id = dr.id
       LEFT JOIN supervisor_performance sp ON sp.supervisor_id = u.id AND sp.work_date = dr.work_date
       ${filters}
       GROUP BY u.id, u.first_name, u.last_name, u.email
       ORDER BY total_records DESC`,
      queryParams
    );

    // Get correction patterns
    const correctionPatternsResult = await pool.query(
      `SELECT u.id, u.first_name, u.last_name,
              sp.work_date,
              sp.corrections_count,
              sp.performance_notes,
              s.name as site_name
       FROM supervisor_performance sp
       JOIN users u ON u.id = sp.supervisor_id
       JOIN sites s ON s.id = sp.site_id
       WHERE sp.work_date >= $1 AND sp.work_date <= $2
       ${supervisorId ? 'AND sp.supervisor_id = $3' : ''}
       ORDER BY sp.work_date DESC, sp.corrections_count DESC`,
      supervisorId ? [startDate, endDate, supervisorId] : [startDate, endDate]
    );

    res.json({
      success: true,
      data: {
        period: { startDate, endDate },
        supervisorPerformance: performanceResult.rows.map(supervisor => ({
          id: supervisor.id,
          name: `${supervisor.first_name} ${supervisor.last_name}`,
          email: supervisor.email,
          totalRecords: parseInt(supervisor.total_records),
          sitesManaged: parseInt(supervisor.sites_managed),
          totalWorkersManaged: parseInt(supervisor.total_workers_managed),
          totalPaymentsManaged: parseFloat(supervisor.total_payments_managed),
          avgCorrectionsPerDay: parseFloat(supervisor.avg_corrections_per_day) || 0,
          maxCorrectionsPerDay: parseInt(supervisor.max_corrections_per_day) || 0
        })),
        correctionPatterns: correctionPatternsResult.rows.map(pattern => ({
          supervisorId: pattern.id,
          supervisorName: `${pattern.first_name} ${pattern.last_name}`,
          workDate: pattern.work_date,
          correctionsCount: parseInt(pattern.corrections_count),
          performanceNotes: pattern.performance_notes,
          siteName: pattern.site_name
        }))
      }
    });

  } catch (error) {
    console.error('Get supervisor performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch supervisor performance data'
    });
  }
});

// Export data to Excel format (CSV)
router.get('/export', [
  authenticateToken,
  requireRole(['super_admin', 'site_admin']),
  validateDateRange
], async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      companyId, 
      projectId, 
      siteId,
      format = 'csv' // csv, json
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    // Build filters
    let filters = 'WHERE dr.work_date >= $1 AND dr.work_date <= $2';
    const queryParams = [startDate, endDate];
    let paramCount = 2;

    if (companyId) {
      paramCount++;
      filters += ` AND p.company_id = $${paramCount}`;
      queryParams.push(companyId);
    }

    if (projectId) {
      paramCount++;
      filters += ` AND s.project_id = $${paramCount}`;
      queryParams.push(projectId);
    }

    if (siteId) {
      paramCount++;
      filters += ` AND dr.site_id = $${paramCount}`;
      queryParams.push(siteId);
    }

    // Get detailed records
    const recordsResult = await pool.query(
      `SELECT dr.work_date, dr.weather_condition, dr.notes,
              c.name as company_name, p.name as project_name, s.name as site_name, s.location as site_location,
              u.first_name as supervisor_name, u.last_name as supervisor_lastname,
              wt.name as worker_type_name, wt.daily_rate,
              wa.worker_count, wa.production_amount, wa.production_unit, wa.amount_paid, wa.worker_names
       FROM daily_records dr
       JOIN sites s ON s.id = dr.site_id
       JOIN projects p ON p.id = s.project_id
       JOIN companies c ON c.id = p.company_id
       LEFT JOIN users u ON u.id = dr.supervisor_id
       JOIN worker_attendance wa ON wa.daily_record_id = dr.id
       JOIN worker_types wt ON wt.id = wa.worker_type_id
       ${filters}
       ORDER BY dr.work_date DESC, c.name, s.name, wt.name`,
      queryParams
    );

    if (format === 'csv') {
      // Generate CSV
      const csvHeaders = [
        'Work Date', 'Company', 'Project', 'Site', 'Location', 'Supervisor',
        'Worker Type', 'Daily Rate', 'Worker Count', 'Production Amount', 'Production Unit',
        'Amount Paid', 'Worker Names', 'Weather', 'Notes'
      ];

      const csvRows = recordsResult.rows.map(record => [
        record.work_date,
        record.company_name,
        record.project_name,
        record.site_name,
        record.site_location,
        record.supervisor_name ? `${record.supervisor_name} ${record.supervisor_lastname}` : '',
        record.worker_type_name,
        record.daily_rate,
        record.worker_count,
        record.production_amount || '',
        record.production_unit,
        record.amount_paid,
        record.worker_names || '',
        record.weather_condition || '',
        record.notes || ''
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      const fileName = `nuru_export_${startDate}_to_${endDate}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(csvContent);

    } else {
      // Return JSON
      res.json({
        success: true,
        data: {
          period: { startDate, endDate },
          records: recordsResult.rows.map(record => ({
            workDate: record.work_date,
            companyName: record.company_name,
            projectName: record.project_name,
            siteName: record.site_name,
            siteLocation: record.site_location,
            supervisorName: record.supervisor_name ? `${record.supervisor_name} ${record.supervisor_lastname}` : null,
            workerTypeName: record.worker_type_name,
            dailyRate: parseFloat(record.daily_rate),
            workerCount: parseInt(record.worker_count),
            productionAmount: parseFloat(record.production_amount) || 0,
            productionUnit: record.production_unit,
            amountPaid: parseFloat(record.amount_paid),
            workerNames: record.worker_names,
            weatherCondition: record.weather_condition,
            notes: record.notes
          }))
        }
      });
    }

  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export data'
    });
  }
});

module.exports = router;