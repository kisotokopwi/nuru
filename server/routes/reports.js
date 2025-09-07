const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { generateReportPDF } = require('../utils/reportGenerator');
const moment = require('moment');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get dashboard summary
router.get('/dashboard', async (req, res) => {
  try {
    const today = moment().format('YYYY-MM-DD');
    const thisWeekStart = moment().startOf('week').format('YYYY-MM-DD');
    const thisWeekEnd = moment().endOf('week').format('YYYY-MM-DD');
    const thisMonthStart = moment().startOf('month').format('YYYY-MM-DD');
    const thisMonthEnd = moment().endOf('month').format('YYYY-MM-DD');

    let whereClause = '';
    let queryParams = [];
    let paramCount = 1;

    // Restrict supervisors to their assigned sites only
    if (req.user.role === 'supervisor') {
      whereClause = `WHERE dr.supervisor_id = $${paramCount}`;
      queryParams.push(req.user.id);
      paramCount++;
    }

    // Today's summary
    const todayWhere = whereClause ? `${whereClause} AND dr.record_date = $${paramCount}` : `WHERE dr.record_date = $${paramCount}`;
    const todayParams = [...queryParams, today];
    
    const todayStats = await query(`
      SELECT 
        COUNT(dr.id) as records_count,
        COALESCE(SUM((dr.worker_counts->>'total')::int), 0) as total_workers,
        COALESCE(SUM((dr.payments_made->>'total')::decimal), 0) as total_payments,
        COUNT(DISTINCT dr.site_id) as active_sites
      FROM daily_records dr
      ${todayWhere}
    `, todayParams);

    // This week's summary
    const weekWhere = whereClause ? `${whereClause} AND dr.record_date BETWEEN $${paramCount} AND $${paramCount + 1}` : `WHERE dr.record_date BETWEEN $${paramCount} AND $${paramCount + 1}`;
    const weekParams = [...queryParams, thisWeekStart, thisWeekEnd];
    
    const weekStats = await query(`
      SELECT 
        COUNT(dr.id) as records_count,
        COALESCE(SUM((dr.worker_counts->>'total')::int), 0) as total_workers,
        COALESCE(SUM((dr.payments_made->>'total')::decimal), 0) as total_payments,
        COALESCE(AVG((dr.production_data->>'tons_produced')::decimal), 0) as avg_production
      FROM daily_records dr
      ${weekWhere}
    `, weekParams);

    // This month's summary
    const monthWhere = whereClause ? `${whereClause} AND dr.record_date BETWEEN $${paramCount} AND $${paramCount + 1}` : `WHERE dr.record_date BETWEEN $${paramCount} AND $${paramCount + 1}`;
    const monthParams = [...queryParams, thisMonthStart, thisMonthEnd];
    
    const monthStats = await query(`
      SELECT 
        COUNT(dr.id) as records_count,
        COALESCE(SUM((dr.worker_counts->>'total')::int), 0) as total_workers,
        COALESCE(SUM((dr.payments_made->>'total')::decimal), 0) as total_payments,
        COUNT(DISTINCT dr.site_id) as active_sites,
        COUNT(DISTINCT dr.supervisor_id) as active_supervisors
      FROM daily_records dr
      ${monthWhere}
    `, monthParams);

    // Recent activity
    const recentActivity = await query(`
      SELECT 
        dr.record_date,
        s.name as site_name,
        s.client_company,
        u.full_name as supervisor_name,
        (dr.worker_counts->>'total')::int as worker_count,
        (dr.payments_made->>'total')::decimal as total_payment
      FROM daily_records dr
      LEFT JOIN sites s ON dr.site_id = s.id
      LEFT JOIN users u ON dr.supervisor_id = u.id
      ${whereClause}
      ORDER BY dr.record_date DESC, dr.created_at DESC
      LIMIT 10
    `, queryParams);

    // Missing entries (sites without records for today)
    const missingEntries = await query(`
      SELECT 
        s.id,
        s.name as site_name,
        s.client_company,
        su.full_name as supervisor_name
      FROM sites s
      LEFT JOIN site_supervisors ss ON s.id = ss.site_id AND ss.is_active = true
      LEFT JOIN users su ON ss.supervisor_id = su.id
      LEFT JOIN daily_records dr ON s.id = dr.site_id AND dr.record_date = $1
      WHERE s.is_active = true AND dr.id IS NULL
      ${req.user.role === 'supervisor' ? 'AND ss.supervisor_id = $2' : ''}
      ORDER BY s.name
    `, req.user.role === 'supervisor' ? [today, req.user.id] : [today]);

    res.json({
      today: todayStats.rows[0],
      this_week: weekStats.rows[0],
      this_month: monthStats.rows[0],
      recent_activity: recentActivity.rows,
      missing_entries: missingEntries.rows
    });

  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get comprehensive report data
router.get('/comprehensive', async (req, res) => {
  try {
    const { 
      start_date, 
      end_date, 
      site_id = '', 
      project_id = '',
      client_company = '',
      group_by = 'date' // date, site, project, client
    } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    let whereClause = 'WHERE dr.record_date BETWEEN $1 AND $2';
    let queryParams = [start_date, end_date];
    let paramCount = 3;

    // Build filters
    if (site_id) {
      whereClause += ` AND dr.site_id = $${paramCount}`;
      queryParams.push(site_id);
      paramCount++;
    }

    if (project_id) {
      whereClause += ` AND s.project_id = $${paramCount}`;
      queryParams.push(project_id);
      paramCount++;
    }

    if (client_company) {
      whereClause += ` AND s.client_company ILIKE $${paramCount}`;
      queryParams.push(`%${client_company}%`);
      paramCount++;
    }

    // Restrict supervisors to their assigned sites only
    if (req.user.role === 'supervisor') {
      whereClause += ` AND dr.supervisor_id = $${paramCount}`;
      queryParams.push(req.user.id);
      paramCount++;
    }

    // Build group by clause
    let groupByClause = '';
    let selectFields = '';

    switch (group_by) {
      case 'site':
        groupByClause = 'GROUP BY s.id, s.name, s.client_company, p.name';
        selectFields = 's.id as group_id, s.name as group_name, s.client_company, p.name as project_name,';
        break;
      case 'project':
        groupByClause = 'GROUP BY p.id, p.name';
        selectFields = 'p.id as group_id, p.name as group_name,';
        break;
      case 'client':
        groupByClause = 'GROUP BY s.client_company';
        selectFields = 's.client_company as group_id, s.client_company as group_name,';
        break;
      default: // date
        groupByClause = 'GROUP BY dr.record_date';
        selectFields = 'dr.record_date as group_id, dr.record_date as group_name,';
    }

    // Get grouped data
    const groupedData = await query(`
      SELECT 
        ${selectFields}
        COUNT(dr.id) as records_count,
        COALESCE(SUM((dr.worker_counts->>'total')::int), 0) as total_workers,
        COALESCE(SUM((dr.payments_made->>'total')::decimal), 0) as total_payments,
        COALESCE(AVG((dr.production_data->>'tons_produced')::decimal), 0) as avg_production,
        COUNT(DISTINCT dr.site_id) as sites_count,
        COUNT(DISTINCT dr.supervisor_id) as supervisors_count
      FROM daily_records dr
      LEFT JOIN sites s ON dr.site_id = s.id
      LEFT JOIN projects p ON s.project_id = p.id
      ${whereClause}
      ${groupByClause}
      ORDER BY group_name
    `, queryParams);

    // Get detailed breakdown
    const detailedData = await query(`
      SELECT 
        dr.record_date,
        s.name as site_name,
        s.client_company,
        p.name as project_name,
        u.full_name as supervisor_name,
        dr.worker_counts,
        dr.payments_made,
        dr.production_data,
        dr.notes,
        COUNT(sdc.id) as corrections_count
      FROM daily_records dr
      LEFT JOIN sites s ON dr.site_id = s.id
      LEFT JOIN projects p ON s.project_id = p.id
      LEFT JOIN users u ON dr.supervisor_id = u.id
      LEFT JOIN same_day_corrections sdc ON dr.id = sdc.daily_record_id
      ${whereClause}
      GROUP BY dr.id, s.name, s.client_company, p.name, u.full_name
      ORDER BY dr.record_date DESC, s.name
    `, queryParams);

    // Get summary statistics
    const summaryStats = await query(`
      SELECT 
        COUNT(dr.id) as total_records,
        COUNT(DISTINCT dr.site_id) as total_sites,
        COUNT(DISTINCT dr.supervisor_id) as total_supervisors,
        COALESCE(SUM((dr.worker_counts->>'total')::int), 0) as total_workers,
        COALESCE(SUM((dr.payments_made->>'total')::decimal), 0) as total_payments,
        COALESCE(AVG((dr.production_data->>'tons_produced')::decimal), 0) as avg_production,
        COALESCE(MIN((dr.production_data->>'tons_produced')::decimal), 0) as min_production,
        COALESCE(MAX((dr.production_data->>'tons_produced')::decimal), 0) as max_production
      FROM daily_records dr
      LEFT JOIN sites s ON dr.site_id = s.id
      ${whereClause}
    `, queryParams);

    res.json({
      summary: summaryStats.rows[0],
      grouped_data: groupedData.rows,
      detailed_data: detailedData.rows,
      filters: {
        start_date,
        end_date,
        site_id,
        project_id,
        client_company,
        group_by
      }
    });

  } catch (error) {
    console.error('Get comprehensive report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get worker type analysis
router.get('/worker-analysis', async (req, res) => {
  try {
    const { 
      start_date, 
      end_date, 
      site_id = '', 
      project_id = '',
      client_company = ''
    } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    let whereClause = 'WHERE dr.record_date BETWEEN $1 AND $2';
    let queryParams = [start_date, end_date];
    let paramCount = 3;

    // Build filters
    if (site_id) {
      whereClause += ` AND dr.site_id = $${paramCount}`;
      queryParams.push(site_id);
      paramCount++;
    }

    if (project_id) {
      whereClause += ` AND s.project_id = $${paramCount}`;
      queryParams.push(project_id);
      paramCount++;
    }

    if (client_company) {
      whereClause += ` AND s.client_company ILIKE $${paramCount}`;
      queryParams.push(`%${client_company}%`);
      paramCount++;
    }

    // Restrict supervisors to their assigned sites only
    if (req.user.role === 'supervisor') {
      whereClause += ` AND dr.supervisor_id = $${paramCount}`;
      queryParams.push(req.user.id);
      paramCount++;
    }

    // Get worker type statistics
    const workerTypeStats = await query(`
      SELECT 
        wt.id,
        wt.name as worker_type,
        wt.daily_rate,
        s.name as site_name,
        s.client_company,
        COUNT(dr.id) as days_used,
        COALESCE(SUM((dr.worker_counts->>wt.id::text)::int), 0) as total_workers,
        COALESCE(SUM((dr.payments_made->>wt.id::text)::decimal), 0) as total_payments,
        COALESCE(AVG((dr.worker_counts->>wt.id::text)::int), 0) as avg_workers_per_day,
        COALESCE(AVG((dr.payments_made->>wt.id::text)::decimal), 0) as avg_payment_per_day
      FROM worker_types wt
      LEFT JOIN sites s ON wt.site_id = s.id
      LEFT JOIN daily_records dr ON wt.site_id = dr.site_id ${whereClause.replace('WHERE', 'AND')}
      WHERE wt.is_active = true
      GROUP BY wt.id, wt.name, wt.daily_rate, s.name, s.client_company
      HAVING COUNT(dr.id) > 0
      ORDER BY total_workers DESC
    `, queryParams);

    // Get worker type trends (daily usage)
    const workerTypeTrends = await query(`
      SELECT 
        dr.record_date,
        wt.name as worker_type,
        s.client_company,
        COALESCE(SUM((dr.worker_counts->>wt.id::text)::int), 0) as daily_workers,
        COALESCE(SUM((dr.payments_made->>wt.id::text)::decimal), 0) as daily_payments
      FROM daily_records dr
      JOIN sites s ON dr.site_id = s.id
      JOIN worker_types wt ON s.id = wt.site_id
      ${whereClause}
      AND wt.is_active = true
      GROUP BY dr.record_date, wt.name, s.client_company
      ORDER BY dr.record_date, wt.name
    `, queryParams);

    res.json({
      worker_type_statistics: workerTypeStats.rows,
      daily_trends: workerTypeTrends.rows
    });

  } catch (error) {
    console.error('Get worker analysis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get supervisor performance report
router.get('/supervisor-performance', async (req, res) => {
  try {
    const { 
      start_date, 
      end_date, 
      supervisor_id = ''
    } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    let whereClause = 'WHERE dr.record_date BETWEEN $1 AND $2';
    let queryParams = [start_date, end_date];
    let paramCount = 3;

    // Build supervisor filter
    if (supervisor_id) {
      whereClause += ` AND dr.supervisor_id = $${paramCount}`;
      queryParams.push(supervisor_id);
      paramCount++;
    }

    // Restrict supervisors to their own data only
    if (req.user.role === 'supervisor') {
      whereClause += ` AND dr.supervisor_id = $${paramCount}`;
      queryParams.push(req.user.id);
      paramCount++;
    }

    // Get supervisor performance statistics
    const supervisorStats = await query(`
      SELECT 
        u.id as supervisor_id,
        u.full_name as supervisor_name,
        u.username,
        COUNT(dr.id) as total_records,
        COUNT(DISTINCT dr.site_id) as sites_managed,
        COALESCE(SUM((dr.worker_counts->>'total')::int), 0) as total_workers_managed,
        COALESCE(SUM((dr.payments_made->>'total')::decimal), 0) as total_payments_managed,
        COALESCE(AVG((dr.production_data->>'tons_produced')::decimal), 0) as avg_production,
        MIN(dr.record_date) as first_record_date,
        MAX(dr.record_date) as last_record_date,
        COUNT(sdc.id) as total_corrections,
        COUNT(DISTINCT sdc.daily_record_id) as records_corrected
      FROM users u
      LEFT JOIN daily_records dr ON u.id = dr.supervisor_id ${whereClause.replace('WHERE', 'AND')}
      LEFT JOIN same_day_corrections sdc ON dr.id = sdc.daily_record_id
      WHERE u.role = 'supervisor' AND u.is_active = true
      GROUP BY u.id, u.full_name, u.username
      HAVING COUNT(dr.id) > 0
      ORDER BY total_records DESC
    `, queryParams);

    // Get correction patterns
    const correctionPatterns = await query(`
      SELECT 
        sdc.correction_reason,
        COUNT(*) as frequency,
        COUNT(DISTINCT sdc.daily_record_id) as affected_records,
        COUNT(DISTINCT dr.supervisor_id) as supervisors_involved
      FROM same_day_corrections sdc
      JOIN daily_records dr ON sdc.daily_record_id = dr.id
      ${whereClause}
      GROUP BY sdc.correction_reason
      ORDER BY frequency DESC
    `, queryParams);

    res.json({
      supervisor_performance: supervisorStats.rows,
      correction_patterns: correctionPatterns.rows
    });

  } catch (error) {
    console.error('Get supervisor performance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate and download report PDF
router.post('/generate-pdf', async (req, res) => {
  try {
    const { 
      report_type,
      start_date, 
      end_date, 
      site_id = '', 
      project_id = '',
      client_company = '',
      group_by = 'date'
    } = req.body;

    if (!report_type || !start_date || !end_date) {
      return res.status(400).json({ error: 'Report type, start date and end date are required' });
    }

    // Get report data based on type
    let reportData;
    
    switch (report_type) {
      case 'comprehensive':
        // Get comprehensive report data (reuse existing logic)
        const comprehensiveResponse = await req.app.get('/api/reports/comprehensive');
        reportData = comprehensiveResponse.data;
        break;
      case 'worker-analysis':
        // Get worker analysis data
        const workerResponse = await req.app.get('/api/reports/worker-analysis');
        reportData = workerResponse.data;
        break;
      case 'supervisor-performance':
        // Get supervisor performance data
        const supervisorResponse = await req.app.get('/api/reports/supervisor-performance');
        reportData = supervisorResponse.data;
        break;
      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    // Generate PDF
    const pdfBuffer = await generateReportPDF(report_type, reportData, {
      start_date,
      end_date,
      site_id,
      project_id,
      client_company,
      group_by
    });

    // Set appropriate headers for PDF download
    const fileName = `${report_type}_report_${start_date}_to_${end_date}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Generate report PDF error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;