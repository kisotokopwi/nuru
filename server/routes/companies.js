const express = require('express');
const { body, param, query } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, requireRole, logUserAction } = require('../middleware/auth');
const { commonValidations, validate, validatePagination } = require('../utils/validation');

const router = express.Router();

// Get all companies
router.get('/', [
  authenticateToken,
  requireRole(['super_admin', 'site_admin']),
  validatePagination
], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search;

    let query = `
      SELECT c.id, c.name, c.contact_person, c.email, c.phone, c.address, 
             c.invoice_template, c.is_active, c.created_at, c.updated_at,
             COUNT(p.id) as project_count
      FROM companies c
      LEFT JOIN projects p ON p.company_id = c.id AND p.status = 'active'
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND (c.name ILIKE $${paramCount} OR c.contact_person ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    query += ` GROUP BY c.id ORDER BY c.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM companies c WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;

    if (search) {
      countParamCount++;
      countQuery += ` AND (c.name ILIKE $${countParamCount} OR c.contact_person ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        companies: result.rows.map(company => ({
          id: company.id,
          name: company.name,
          contactPerson: company.contact_person,
          email: company.email,
          phone: company.phone,
          address: company.address,
          invoiceTemplate: company.invoice_template,
          isActive: company.is_active,
          projectCount: parseInt(company.project_count),
          createdAt: company.created_at,
          updatedAt: company.updated_at
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch companies'
    });
  }
});

// Get company by ID
router.get('/:id', [
  authenticateToken,
  requireRole(['super_admin', 'site_admin']),
  param('id').isUUID(),
  validate
], async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT c.id, c.name, c.contact_person, c.email, c.phone, c.address, 
              c.invoice_template, c.is_active, c.created_at, c.updated_at
       FROM companies c
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    const company = result.rows[0];

    // Get projects for this company
    const projectsResult = await pool.query(
      `SELECT p.id, p.name, p.description, p.start_date, p.end_date, p.status,
              COUNT(s.id) as site_count
       FROM projects p
       LEFT JOIN sites s ON s.project_id = p.id
       WHERE p.company_id = $1
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        id: company.id,
        name: company.name,
        contactPerson: company.contact_person,
        email: company.email,
        phone: company.phone,
        address: company.address,
        invoiceTemplate: company.invoice_template,
        isActive: company.is_active,
        createdAt: company.created_at,
        updatedAt: company.updated_at,
        projects: projectsResult.rows.map(project => ({
          id: project.id,
          name: project.name,
          description: project.description,
          startDate: project.start_date,
          endDate: project.end_date,
          status: project.status,
          siteCount: parseInt(project.site_count)
        }))
      }
    });

  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch company'
    });
  }
});

// Create new company
router.post('/', [
  authenticateToken,
  requireRole(['super_admin']),
  body('name').trim().isLength({ min: 2, max: 255 }).withMessage('Company name is required'),
  body('contactPerson').optional().trim().isLength({ max: 255 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().isMobilePhone('any'),
  body('address').optional().trim().isLength({ max: 500 }),
  body('invoiceTemplate').optional().isObject(),
  validate,
  logUserAction('CREATE_COMPANY', 'companies')
], async (req, res) => {
  try {
    const { name, contactPerson, email, phone, address, invoiceTemplate } = req.body;

    // Check if company already exists
    const existingCompany = await pool.query(
      'SELECT id FROM companies WHERE name = $1',
      [name]
    );

    if (existingCompany.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Company with this name already exists'
      });
    }

    // Create company
    const result = await pool.query(
      `INSERT INTO companies (name, contact_person, email, phone, address, invoice_template)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, contact_person, email, phone, address, invoice_template, is_active, created_at`,
      [name, contactPerson, email, phone, address, invoiceTemplate ? JSON.stringify(invoiceTemplate) : null]
    );

    const company = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'Company created successfully',
      data: {
        id: company.id,
        name: company.name,
        contactPerson: company.contact_person,
        email: company.email,
        phone: company.phone,
        address: company.address,
        invoiceTemplate: company.invoice_template,
        isActive: company.is_active,
        createdAt: company.created_at
      }
    });

  } catch (error) {
    console.error('Create company error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create company'
    });
  }
});

// Update company
router.put('/:id', [
  authenticateToken,
  requireRole(['super_admin']),
  param('id').isUUID(),
  body('name').optional().trim().isLength({ min: 2, max: 255 }),
  body('contactPerson').optional().trim().isLength({ max: 255 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().isMobilePhone('any'),
  body('address').optional().trim().isLength({ max: 500 }),
  body('invoiceTemplate').optional().isObject(),
  body('isActive').optional().isBoolean(),
  validate,
  logUserAction('UPDATE_COMPANY', 'companies')
], async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contactPerson, email, phone, address, invoiceTemplate, isActive } = req.body;

    // Check if company exists
    const existingCompany = await pool.query(
      'SELECT id FROM companies WHERE id = $1',
      [id]
    );

    if (existingCompany.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Check if name is being changed and if it conflicts
    if (name) {
      const nameConflict = await pool.query(
        'SELECT id FROM companies WHERE name = $1 AND id != $2',
        [name, id]
      );

      if (nameConflict.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Company with this name already exists'
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

    if (contactPerson !== undefined) {
      paramCount++;
      updates.push(`contact_person = $${paramCount}`);
      values.push(contactPerson);
    }

    if (email !== undefined) {
      paramCount++;
      updates.push(`email = $${paramCount}`);
      values.push(email);
    }

    if (phone !== undefined) {
      paramCount++;
      updates.push(`phone = $${paramCount}`);
      values.push(phone);
    }

    if (address !== undefined) {
      paramCount++;
      updates.push(`address = $${paramCount}`);
      values.push(address);
    }

    if (invoiceTemplate !== undefined) {
      paramCount++;
      updates.push(`invoice_template = $${paramCount}`);
      values.push(invoiceTemplate ? JSON.stringify(invoiceTemplate) : null);
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

    const query = `UPDATE companies SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);

    const company = result.rows[0];

    res.json({
      success: true,
      message: 'Company updated successfully',
      data: {
        id: company.id,
        name: company.name,
        contactPerson: company.contact_person,
        email: company.email,
        phone: company.phone,
        address: company.address,
        invoiceTemplate: company.invoice_template,
        isActive: company.is_active,
        updatedAt: company.updated_at
      }
    });

  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update company'
    });
  }
});

// Delete company (soft delete)
router.delete('/:id', [
  authenticateToken,
  requireRole(['super_admin']),
  param('id').isUUID(),
  validate,
  logUserAction('DELETE_COMPANY', 'companies')
], async (req, res) => {
  try {
    const { id } = req.params;

    // Check if company exists
    const existingCompany = await pool.query(
      'SELECT id FROM companies WHERE id = $1',
      [id]
    );

    if (existingCompany.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Check if company has active projects
    const activeProjects = await pool.query(
      'SELECT COUNT(*) FROM projects WHERE company_id = $1 AND status = $2',
      [id, 'active']
    );

    if (parseInt(activeProjects.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete company with active projects'
      });
    }

    // Soft delete by deactivating
    await pool.query(
      'UPDATE companies SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    res.json({
      success: true,
      message: 'Company deactivated successfully'
    });

  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete company'
    });
  }
});

// Get company statistics
router.get('/:id/statistics', [
  authenticateToken,
  requireRole(['super_admin', 'site_admin']),
  param('id').isUUID(),
  validate
], async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    // Get basic company info
    const companyResult = await pool.query(
      'SELECT name FROM companies WHERE id = $1',
      [id]
    );

    if (companyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

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

    // Get project count
    const projectCountResult = await pool.query(
      'SELECT COUNT(*) FROM projects WHERE company_id = $1',
      [id]
    );

    // Get site count
    const siteCountResult = await pool.query(
      `SELECT COUNT(*) FROM sites s
       JOIN projects p ON p.id = s.project_id
       WHERE p.company_id = $1`,
      [id]
    );

    // Get total workers and payments
    const workerStatsResult = await pool.query(
      `SELECT 
         SUM(wa.worker_count) as total_workers,
         SUM(wa.amount_paid) as total_payments,
         COUNT(DISTINCT dr.work_date) as work_days
       FROM worker_attendance wa
       JOIN daily_records dr ON dr.id = wa.daily_record_id
       JOIN sites s ON s.id = dr.site_id
       JOIN projects p ON p.id = s.project_id
       WHERE p.company_id = $1 ${dateFilter}`,
      queryParams
    );

    // Get recent activity
    const recentActivityResult = await pool.query(
      `SELECT dr.work_date, s.name as site_name, 
              SUM(wa.worker_count) as total_workers,
              SUM(wa.amount_paid) as total_payments
       FROM daily_records dr
       JOIN sites s ON s.id = dr.site_id
       JOIN projects p ON p.id = s.project_id
       JOIN worker_attendance wa ON wa.daily_record_id = dr.id
       WHERE p.company_id = $1 ${dateFilter}
       GROUP BY dr.work_date, s.name
       ORDER BY dr.work_date DESC
       LIMIT 10`,
      queryParams
    );

    const stats = workerStatsResult.rows[0];

    res.json({
      success: true,
      data: {
        companyName: companyResult.rows[0].name,
        projectCount: parseInt(projectCountResult.rows[0].count),
        siteCount: parseInt(siteCountResult.rows[0].count),
        totalWorkers: parseInt(stats.total_workers) || 0,
        totalPayments: parseFloat(stats.total_payments) || 0,
        workDays: parseInt(stats.work_days) || 0,
        recentActivity: recentActivityResult.rows.map(activity => ({
          workDate: activity.work_date,
          siteName: activity.site_name,
          totalWorkers: parseInt(activity.total_workers),
          totalPayments: parseFloat(activity.total_payments)
        }))
      }
    });

  } catch (error) {
    console.error('Get company statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch company statistics'
    });
  }
});

module.exports = router;