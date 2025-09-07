const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, requireSiteAdmin } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get audit trail
router.get('/', [
  requireSiteAdmin
], async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      table_name = '', 
      user_id = '',
      action = '',
      start_date = '', 
      end_date = '',
      record_id = ''
    } = req.query;
    
    const offset = (page - 1) * limit;

    let whereClause = '';
    let queryParams = [];
    let paramCount = 1;

    // Build table name filter
    if (table_name) {
      whereClause += `WHERE at.table_name = $${paramCount}`;
      queryParams.push(table_name);
      paramCount++;
    }

    // Build user filter
    if (user_id) {
      whereClause += whereClause ? ` AND at.user_id = $${paramCount}` : `WHERE at.user_id = $${paramCount}`;
      queryParams.push(user_id);
      paramCount++;
    }

    // Build action filter
    if (action) {
      whereClause += whereClause ? ` AND at.action = $${paramCount}` : `WHERE at.action = $${paramCount}`;
      queryParams.push(action);
      paramCount++;
    }

    // Build date filter
    if (start_date && end_date) {
      whereClause += whereClause ? ` AND at.created_at BETWEEN $${paramCount} AND $${paramCount + 1}` : `WHERE at.created_at BETWEEN $${paramCount} AND $${paramCount + 1}`;
      queryParams.push(start_date, end_date);
      paramCount += 2;
    }

    // Build record ID filter
    if (record_id) {
      whereClause += whereClause ? ` AND at.record_id = $${paramCount}` : `WHERE at.record_id = $${paramCount}`;
      queryParams.push(record_id);
      paramCount++;
    }

    // Get audit trail with user information
    const auditResult = await query(`
      SELECT 
        at.*,
        u.username,
        u.full_name as user_name,
        u.role as user_role
      FROM audit_trail at
      LEFT JOIN users u ON at.user_id = u.id
      ${whereClause}
      ORDER BY at.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `, [...queryParams, limit, offset]);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM audit_trail at
      ${whereClause}
    `, queryParams);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      audit_trail: auditResult.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get audit trail error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get audit trail for specific record
router.get('/record/:table/:id', [
  requireSiteAdmin
], async (req, res) => {
  try {
    const { table, id } = req.params;

    const auditResult = await query(`
      SELECT 
        at.*,
        u.username,
        u.full_name as user_name,
        u.role as user_role
      FROM audit_trail at
      LEFT JOIN users u ON at.user_id = u.id
      WHERE at.table_name = $1 AND at.record_id = $2
      ORDER BY at.created_at DESC
    `, [table, id]);

    res.json({ audit_trail: auditResult.rows });

  } catch (error) {
    console.error('Get record audit trail error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get audit statistics
router.get('/statistics', [
  requireSiteAdmin
], async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let dateFilter = '';
    let queryParams = [];
    let paramCount = 1;

    if (start_date && end_date) {
      dateFilter = `WHERE at.created_at BETWEEN $${paramCount} AND $${paramCount + 1}`;
      queryParams.push(start_date, end_date);
      paramCount += 2;
    }

    // Get overall statistics
    const overallStats = await query(`
      SELECT 
        COUNT(*) as total_actions,
        COUNT(DISTINCT at.user_id) as active_users,
        COUNT(DISTINCT at.table_name) as tables_affected,
        COUNT(DISTINCT at.record_id) as records_affected
      FROM audit_trail at
      ${dateFilter}
    `, queryParams);

    // Get actions by type
    const actionsByType = await query(`
      SELECT 
        at.action,
        COUNT(*) as count
      FROM audit_trail at
      ${dateFilter}
      GROUP BY at.action
      ORDER BY count DESC
    `, queryParams);

    // Get actions by table
    const actionsByTable = await query(`
      SELECT 
        at.table_name,
        COUNT(*) as count
      FROM audit_trail at
      ${dateFilter}
      GROUP BY at.table_name
      ORDER BY count DESC
    `, queryParams);

    // Get actions by user
    const actionsByUser = await query(`
      SELECT 
        u.username,
        u.full_name,
        u.role,
        COUNT(at.id) as action_count
      FROM audit_trail at
      LEFT JOIN users u ON at.user_id = u.id
      ${dateFilter}
      GROUP BY u.id, u.username, u.full_name, u.role
      ORDER BY action_count DESC
      LIMIT 10
    `, queryParams);

    // Get daily activity
    const dailyActivity = await query(`
      SELECT 
        DATE(at.created_at) as activity_date,
        COUNT(*) as action_count
      FROM audit_trail at
      ${dateFilter}
      GROUP BY DATE(at.created_at)
      ORDER BY activity_date DESC
      LIMIT 30
    `, queryParams);

    res.json({
      overall: overallStats.rows[0],
      by_action_type: actionsByType.rows,
      by_table: actionsByTable.rows,
      by_user: actionsByUser.rows,
      daily_activity: dailyActivity.rows
    });

  } catch (error) {
    console.error('Get audit statistics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get correction patterns
router.get('/corrections', [
  requireSiteAdmin
], async (req, res) => {
  try {
    const { 
      start_date, 
      end_date, 
      supervisor_id = '',
      site_id = ''
    } = req.query;

    let whereClause = '';
    let queryParams = [];
    let paramCount = 1;

    // Build date filter
    if (start_date && end_date) {
      whereClause += `WHERE sdc.corrected_at BETWEEN $${paramCount} AND $${paramCount + 1}`;
      queryParams.push(start_date, end_date);
      paramCount += 2;
    }

    // Build supervisor filter
    if (supervisor_id) {
      whereClause += whereClause ? ` AND dr.supervisor_id = $${paramCount}` : `WHERE dr.supervisor_id = $${paramCount}`;
      queryParams.push(supervisor_id);
      paramCount++;
    }

    // Build site filter
    if (site_id) {
      whereClause += whereClause ? ` AND dr.site_id = $${paramCount}` : `WHERE dr.site_id = $${paramCount}`;
      queryParams.push(site_id);
      paramCount++;
    }

    // Get correction statistics
    const correctionStats = await query(`
      SELECT 
        sdc.correction_reason,
        COUNT(*) as frequency,
        COUNT(DISTINCT sdc.daily_record_id) as affected_records,
        COUNT(DISTINCT dr.supervisor_id) as supervisors_involved,
        COUNT(DISTINCT dr.site_id) as sites_affected
      FROM same_day_corrections sdc
      JOIN daily_records dr ON sdc.daily_record_id = dr.id
      ${whereClause}
      GROUP BY sdc.correction_reason
      ORDER BY frequency DESC
    `, queryParams);

    // Get supervisor correction patterns
    const supervisorCorrections = await query(`
      SELECT 
        u.full_name as supervisor_name,
        u.username,
        COUNT(sdc.id) as total_corrections,
        COUNT(DISTINCT sdc.daily_record_id) as records_corrected,
        COUNT(DISTINCT sdc.correction_reason) as unique_reasons,
        COUNT(DISTINCT dr.site_id) as sites_affected
      FROM same_day_corrections sdc
      JOIN daily_records dr ON sdc.daily_record_id = dr.id
      JOIN users u ON dr.supervisor_id = u.id
      ${whereClause}
      GROUP BY u.id, u.full_name, u.username
      ORDER BY total_corrections DESC
    `, queryParams);

    // Get recent corrections
    const recentCorrections = await query(`
      SELECT 
        sdc.*,
        dr.record_date,
        s.name as site_name,
        s.client_company,
        u.full_name as supervisor_name,
        cu.full_name as corrected_by_name
      FROM same_day_corrections sdc
      JOIN daily_records dr ON sdc.daily_record_id = dr.id
      JOIN sites s ON dr.site_id = s.id
      JOIN users u ON dr.supervisor_id = u.id
      LEFT JOIN users cu ON sdc.corrected_by = cu.id
      ${whereClause}
      ORDER BY sdc.corrected_at DESC
      LIMIT 50
    `, queryParams);

    res.json({
      correction_statistics: correctionStats.rows,
      supervisor_patterns: supervisorCorrections.rows,
      recent_corrections: recentCorrections.rows
    });

  } catch (error) {
    console.error('Get corrections error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;