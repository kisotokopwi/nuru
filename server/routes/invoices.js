const express = require('express');
const { body, param, query } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, requireRole, logUserAction } = require('../middleware/auth');
const { validate, validateDateRange } = require('../utils/validation');
const { generateInvoiceNumber, formatCurrency } = require('../utils/currency');
const { generatePDF } = require('../utils/pdfGenerator');

const router = express.Router();

// Generate invoices for a daily record
router.post('/generate/:dailyRecordId', [
  authenticateToken,
  requireRole(['super_admin', 'site_admin']),
  param('dailyRecordId').isUUID(),
  body('generateClientInvoice').isBoolean().withMessage('Client invoice generation flag is required'),
  body('generateNuruInvoice').isBoolean().withMessage('Nuru invoice generation flag is required'),
  validate,
  logUserAction('GENERATE_INVOICES', 'invoices')
], async (req, res) => {
  try {
    const { dailyRecordId } = req.params;
    const { generateClientInvoice, generateNuruInvoice } = req.body;

    // Get daily record with all details
    const dailyRecordResult = await pool.query(
      `SELECT dr.id, dr.site_id, dr.work_date, dr.weather_condition, dr.notes,
              s.name as site_name, s.location as site_location,
              p.id as project_id, p.name as project_name,
              c.id as company_id, c.name as company_name, c.contact_person, c.email, c.phone, c.address, c.invoice_template
       FROM daily_records dr
       JOIN sites s ON s.id = dr.site_id
       JOIN projects p ON p.id = s.project_id
       JOIN companies c ON c.id = p.company_id
       WHERE dr.id = $1`,
      [dailyRecordId]
    );

    if (dailyRecordResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Daily record not found'
      });
    }

    const dailyRecord = dailyRecordResult.rows[0];

    // Get worker attendance details
    const attendanceResult = await pool.query(
      `SELECT wa.worker_type_id, wa.worker_count, wa.production_amount, wa.production_unit, 
              wa.amount_paid, wa.worker_names,
              wt.name as worker_type_name, wt.daily_rate
       FROM worker_attendance wa
       JOIN worker_types wt ON wt.id = wa.worker_type_id
       WHERE wa.daily_record_id = $1
       ORDER BY wt.name ASC`,
      [dailyRecordId]
    );

    if (attendanceResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No worker attendance records found for this daily record'
      });
    }

    const generatedInvoices = [];

    // Generate client invoice
    if (generateClientInvoice) {
      const clientInvoiceNumber = generateInvoiceNumber('CLI', new Date(dailyRecord.work_date));
      
      // Calculate total amount (sum of all payments)
      const totalAmount = attendanceResult.rows.reduce((sum, wa) => sum + parseFloat(wa.amount_paid), 0);

      const clientInvoiceResult = await pool.query(
        `INSERT INTO invoices (invoice_number, daily_record_id, invoice_type, company_id, site_id, work_date, total_amount, generated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, invoice_number, total_amount, generated_at`,
        [clientInvoiceNumber, dailyRecordId, 'client', dailyRecord.company_id, dailyRecord.site_id, dailyRecord.work_date, totalAmount, req.user.id]
      );

      const clientInvoice = clientInvoiceResult.rows[0];

      // Generate PDF
      const clientPdfPath = await generatePDF({
        invoiceType: 'client',
        invoiceNumber: clientInvoiceNumber,
        invoiceId: clientInvoice.id,
        company: {
          id: dailyRecord.company_id,
          name: dailyRecord.company_name,
          contactPerson: dailyRecord.contact_person,
          email: dailyRecord.email,
          phone: dailyRecord.phone,
          address: dailyRecord.address
        },
        site: {
          name: dailyRecord.site_name,
          location: dailyRecord.site_location
        },
        project: {
          name: dailyRecord.project_name
        },
        workDate: dailyRecord.work_date,
        weatherCondition: dailyRecord.weather_condition,
        notes: dailyRecord.notes,
        workerAttendance: attendanceResult.rows.map(wa => ({
          workerTypeName: wa.worker_type_name,
          workerCount: parseInt(wa.worker_count),
          productionAmount: parseFloat(wa.production_amount) || 0,
          productionUnit: wa.production_unit,
          amountPaid: parseFloat(wa.amount_paid)
        })),
        totalAmount: totalAmount,
        template: dailyRecord.invoice_template
      });

      // Update invoice with PDF path
      await pool.query(
        'UPDATE invoices SET pdf_path = $1 WHERE id = $2',
        [clientPdfPath, clientInvoice.id]
      );

      generatedInvoices.push({
        id: clientInvoice.id,
        type: 'client',
        invoiceNumber: clientInvoiceNumber,
        totalAmount: totalAmount,
        pdfPath: clientPdfPath,
        generatedAt: clientInvoice.generated_at
      });
    }

    // Generate Nuru invoice
    if (generateNuruInvoice) {
      const nuruInvoiceNumber = generateInvoiceNumber('NUR', new Date(dailyRecord.work_date));
      
      // Calculate total amount (sum of all payments)
      const totalAmount = attendanceResult.rows.reduce((sum, wa) => sum + parseFloat(wa.amount_paid), 0);

      const nuruInvoiceResult = await pool.query(
        `INSERT INTO invoices (invoice_number, daily_record_id, invoice_type, company_id, site_id, work_date, total_amount, generated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, invoice_number, total_amount, generated_at`,
        [nuruInvoiceNumber, dailyRecordId, 'nuru', dailyRecord.company_id, dailyRecord.site_id, dailyRecord.work_date, totalAmount, req.user.id]
      );

      const nuruInvoice = nuruInvoiceResult.rows[0];

      // Generate PDF
      const nuruPdfPath = await generatePDF({
        invoiceType: 'nuru',
        invoiceNumber: nuruInvoiceNumber,
        invoiceId: nuruInvoice.id,
        company: {
          id: dailyRecord.company_id,
          name: dailyRecord.company_name,
          contactPerson: dailyRecord.contact_person,
          email: dailyRecord.email,
          phone: dailyRecord.phone,
          address: dailyRecord.address
        },
        site: {
          name: dailyRecord.site_name,
          location: dailyRecord.site_location
        },
        project: {
          name: dailyRecord.project_name
        },
        workDate: dailyRecord.work_date,
        weatherCondition: dailyRecord.weather_condition,
        notes: dailyRecord.notes,
        workerAttendance: attendanceResult.rows.map(wa => ({
          workerTypeName: wa.worker_type_name,
          workerCount: parseInt(wa.worker_count),
          productionAmount: parseFloat(wa.production_amount) || 0,
          productionUnit: wa.production_unit,
          amountPaid: parseFloat(wa.amount_paid),
          dailyRate: parseFloat(wa.daily_rate),
          workerNames: wa.worker_names
        })),
        totalAmount: totalAmount
      });

      // Update invoice with PDF path
      await pool.query(
        'UPDATE invoices SET pdf_path = $1 WHERE id = $2',
        [nuruPdfPath, nuruInvoice.id]
      );

      generatedInvoices.push({
        id: nuruInvoice.id,
        type: 'nuru',
        invoiceNumber: nuruInvoiceNumber,
        totalAmount: totalAmount,
        pdfPath: nuruPdfPath,
        generatedAt: nuruInvoice.generated_at
      });
    }

    res.json({
      success: true,
      message: 'Invoices generated successfully',
      data: {
        dailyRecordId,
        generatedInvoices
      }
    });

  } catch (error) {
    console.error('Generate invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate invoices'
    });
  }
});

// Get invoices
router.get('/', [
  authenticateToken,
  requireRole(['super_admin', 'site_admin']),
  validateDateRange
], async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      invoiceType, 
      companyId, 
      siteId, 
      startDate, 
      endDate,
      status 
    } = req.query;

    let query = `
      SELECT i.id, i.invoice_number, i.invoice_type, i.work_date, i.total_amount, i.currency, i.status, 
             i.pdf_path, i.generated_at, i.sent_at, i.paid_at,
             c.name as company_name,
             s.name as site_name, s.location as site_location,
             p.name as project_name,
             u.first_name as generated_by_name, u.last_name as generated_by_lastname
      FROM invoices i
      JOIN companies c ON c.id = i.company_id
      JOIN sites s ON s.id = i.site_id
      JOIN projects p ON p.id = s.project_id
      LEFT JOIN users u ON u.id = i.generated_by
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCount = 0;

    if (invoiceType) {
      paramCount++;
      query += ` AND i.invoice_type = $${paramCount}`;
      queryParams.push(invoiceType);
    }

    if (companyId) {
      paramCount++;
      query += ` AND i.company_id = $${paramCount}`;
      queryParams.push(companyId);
    }

    if (siteId) {
      paramCount++;
      query += ` AND i.site_id = $${paramCount}`;
      queryParams.push(siteId);
    }

    if (startDate && endDate) {
      paramCount++;
      query += ` AND i.work_date >= $${paramCount}`;
      queryParams.push(startDate);
      paramCount++;
      query += ` AND i.work_date <= $${paramCount}`;
      queryParams.push(endDate);
    }

    if (status) {
      paramCount++;
      query += ` AND i.status = $${paramCount}`;
      queryParams.push(status);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` ORDER BY i.generated_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(parseInt(limit), offset);

    const result = await pool.query(query, queryParams);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM invoices i WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;

    if (invoiceType) {
      countParamCount++;
      countQuery += ` AND i.invoice_type = $${countParamCount}`;
      countParams.push(invoiceType);
    }

    if (companyId) {
      countParamCount++;
      countQuery += ` AND i.company_id = $${countParamCount}`;
      countParams.push(companyId);
    }

    if (siteId) {
      countParamCount++;
      countQuery += ` AND i.site_id = $${countParamCount}`;
      countParams.push(siteId);
    }

    if (startDate && endDate) {
      countParamCount++;
      countQuery += ` AND i.work_date >= $${countParamCount}`;
      countParams.push(startDate);
      countParamCount++;
      countQuery += ` AND i.work_date <= $${countParamCount}`;
      countParams.push(endDate);
    }

    if (status) {
      countParamCount++;
      countQuery += ` AND i.status = $${countParamCount}`;
      countParams.push(status);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        invoices: result.rows.map(invoice => ({
          id: invoice.id,
          invoiceNumber: invoice.invoice_number,
          invoiceType: invoice.invoice_type,
          workDate: invoice.work_date,
          totalAmount: parseFloat(invoice.total_amount),
          currency: invoice.currency,
          status: invoice.status,
          pdfPath: invoice.pdf_path,
          companyName: invoice.company_name,
          siteName: invoice.site_name,
          siteLocation: invoice.site_location,
          projectName: invoice.project_name,
          generatedBy: invoice.generated_by_name ? `${invoice.generated_by_name} ${invoice.generated_by_lastname}` : null,
          generatedAt: invoice.generated_at,
          sentAt: invoice.sent_at,
          paidAt: invoice.paid_at
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
    console.error('Get invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoices'
    });
  }
});

// Get invoice by ID
router.get('/:id', [
  authenticateToken,
  requireRole(['super_admin', 'site_admin']),
  param('id').isUUID(),
  validate
], async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT i.id, i.invoice_number, i.invoice_type, i.work_date, i.total_amount, i.currency, i.status,
             i.pdf_path, i.generated_at, i.sent_at, i.paid_at,
             dr.id as daily_record_id, dr.weather_condition, dr.notes,
             c.id as company_id, c.name as company_name, c.contact_person, c.email, c.phone, c.address,
             s.id as site_id, s.name as site_name, s.location as site_location,
             p.id as project_id, p.name as project_name,
             u.first_name as generated_by_name, u.last_name as generated_by_lastname
      FROM invoices i
      JOIN daily_records dr ON dr.id = i.daily_record_id
      JOIN companies c ON c.id = i.company_id
      JOIN sites s ON s.id = i.site_id
      JOIN projects p ON p.id = s.project_id
      LEFT JOIN users u ON u.id = i.generated_by
      WHERE i.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    const invoice = result.rows[0];

    // Get worker attendance details
    const attendanceResult = await pool.query(
      `SELECT wa.worker_type_id, wa.worker_count, wa.production_amount, wa.production_unit, 
              wa.amount_paid, wa.worker_names,
              wt.name as worker_type_name, wt.daily_rate
       FROM worker_attendance wa
       JOIN worker_types wt ON wt.id = wa.worker_type_id
       WHERE wa.daily_record_id = $1
       ORDER BY wt.name ASC`,
      [invoice.daily_record_id]
    );

    res.json({
      success: true,
      data: {
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        invoiceType: invoice.invoice_type,
        workDate: invoice.work_date,
        totalAmount: parseFloat(invoice.total_amount),
        currency: invoice.currency,
        status: invoice.status,
        pdfPath: invoice.pdf_path,
        generatedAt: invoice.generated_at,
        sentAt: invoice.sent_at,
        paidAt: invoice.paid_at,
        dailyRecord: {
          id: invoice.daily_record_id,
          weatherCondition: invoice.weather_condition,
          notes: invoice.notes
        },
        company: {
          id: invoice.company_id,
          name: invoice.company_name,
          contactPerson: invoice.contact_person,
          email: invoice.email,
          phone: invoice.phone,
          address: invoice.address
        },
        site: {
          id: invoice.site_id,
          name: invoice.site_name,
          location: invoice.site_location
        },
        project: {
          id: invoice.project_id,
          name: invoice.project_name
        },
        generatedBy: invoice.generated_by_name ? `${invoice.generated_by_name} ${invoice.generated_by_lastname}` : null,
        workerAttendance: attendanceResult.rows.map(wa => ({
          workerTypeId: wa.worker_type_id,
          workerTypeName: wa.worker_type_name,
          dailyRate: parseFloat(wa.daily_rate),
          workerCount: parseInt(wa.worker_count),
          productionAmount: parseFloat(wa.production_amount) || 0,
          productionUnit: wa.production_unit,
          amountPaid: parseFloat(wa.amount_paid),
          workerNames: wa.worker_names
        }))
      }
    });

  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoice'
    });
  }
});

// Update invoice status
router.put('/:id/status', [
  authenticateToken,
  requireRole(['super_admin', 'site_admin']),
  param('id').isUUID(),
  body('status').isIn(['generated', 'sent', 'paid']).withMessage('Valid status is required'),
  validate,
  logUserAction('UPDATE_INVOICE_STATUS', 'invoices')
], async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updates = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const values = [status];
    let paramCount = 1;

    // Set timestamp based on status
    if (status === 'sent') {
      paramCount++;
      updates.push(`sent_at = $${paramCount}`);
      values.push(new Date());
    } else if (status === 'paid') {
      paramCount++;
      updates.push(`paid_at = $${paramCount}`);
      values.push(new Date());
    }

    paramCount++;
    values.push(id);

    const result = await pool.query(
      `UPDATE invoices SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, status, sent_at, paid_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    const invoice = result.rows[0];

    res.json({
      success: true,
      message: 'Invoice status updated successfully',
      data: {
        id: invoice.id,
        status: invoice.status,
        sentAt: invoice.sent_at,
        paidAt: invoice.paid_at
      }
    });

  } catch (error) {
    console.error('Update invoice status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update invoice status'
    });
  }
});

// Download invoice PDF
router.get('/:id/download', [
  authenticateToken,
  requireRole(['super_admin', 'site_admin']),
  param('id').isUUID(),
  validate
], async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT pdf_path, invoice_number, invoice_type FROM invoices WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    const invoice = result.rows[0];

    if (!invoice.pdf_path) {
      return res.status(404).json({
        success: false,
        message: 'PDF file not found'
      });
    }

    const fs = require('fs');
    const path = require('path');

    const pdfPath = path.join(__dirname, '..', invoice.pdf_path);
    
    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({
        success: false,
        message: 'PDF file not found on disk'
      });
    }

    const fileName = `${invoice.invoice_number}_${invoice.invoice_type}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Download invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download invoice'
    });
  }
});

module.exports = router;