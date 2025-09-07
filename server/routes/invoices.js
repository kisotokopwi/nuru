const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { authenticateToken, requireSiteAdmin } = require('../middleware/auth');
const { createAuditLog } = require('../middleware/audit');
const { generateInvoicePDF } = require('../utils/pdfGenerator');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all invoices
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      site_id = '', 
      invoice_type = '',
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
      whereClause += `WHERE i.record_date BETWEEN $${paramCount} AND $${paramCount + 1}`;
      queryParams.push(start_date, end_date);
      paramCount += 2;
    }

    // Build site filter
    if (site_id) {
      whereClause += whereClause ? ` AND i.site_id = $${paramCount}` : `WHERE i.site_id = $${paramCount}`;
      queryParams.push(site_id);
      paramCount++;
    }

    // Build invoice type filter
    if (invoice_type) {
      whereClause += whereClause ? ` AND i.invoice_type = $${paramCount}` : `WHERE i.invoice_type = $${paramCount}`;
      queryParams.push(invoice_type);
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

    // Get invoices with related data
    const invoicesResult = await query(`
      SELECT 
        i.*,
        s.name as site_name,
        s.location as site_location,
        s.client_company,
        p.name as project_name,
        u.full_name as generated_by_name
      FROM invoices i
      LEFT JOIN sites s ON i.site_id = s.id
      LEFT JOIN projects p ON s.project_id = p.id
      LEFT JOIN users u ON i.generated_by = u.id
      ${whereClause}
      ORDER BY i.generated_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `, [...queryParams, limit, offset]);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM invoices i
      LEFT JOIN sites s ON i.site_id = s.id
      ${whereClause}
    `, queryParams);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      invoices: invoicesResult.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single invoice
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const invoiceResult = await query(`
      SELECT 
        i.*,
        s.name as site_name,
        s.location as site_location,
        s.client_company,
        p.name as project_name,
        p.invoice_template,
        u.full_name as generated_by_name
      FROM invoices i
      LEFT JOIN sites s ON i.site_id = s.id
      LEFT JOIN projects p ON s.project_id = p.id
      LEFT JOIN users u ON i.generated_by = u.id
      WHERE i.id = $1
    `, [id]);

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json({ invoice: invoiceResult.rows[0] });

  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate invoices for a daily record
router.post('/generate', [
  requireSiteAdmin,
  body('daily_record_id').isInt().withMessage('Valid daily record ID is required'),
  body('include_worker_names').optional().isBoolean().withMessage('include_worker_names must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { daily_record_id, include_worker_names = false } = req.body;

    // Get daily record with related data
    const recordResult = await query(`
      SELECT 
        dr.*,
        s.name as site_name,
        s.location as site_location,
        s.client_company,
        p.name as project_name,
        p.invoice_template,
        u.full_name as supervisor_name
      FROM daily_records dr
      LEFT JOIN sites s ON dr.site_id = s.id
      LEFT JOIN projects p ON s.project_id = p.id
      LEFT JOIN users u ON dr.supervisor_id = u.id
      WHERE dr.id = $1
    `, [daily_record_id]);

    if (recordResult.rows.length === 0) {
      return res.status(404).json({ error: 'Daily record not found' });
    }

    const record = recordResult.rows[0];

    // Check if invoices already exist for this record
    const existingInvoices = await query(
      'SELECT id, invoice_type FROM invoices WHERE site_id = $1 AND record_date = $2',
      [record.site_id, record.record_date]
    );

    if (existingInvoices.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Invoices already exist for this record',
        existing_invoices: existingInvoices.rows
      });
    }

    // Get worker types for this site
    const workerTypesResult = await query(`
      SELECT * FROM worker_types 
      WHERE site_id = $1 AND is_active = true
      ORDER BY name
    `, [record.site_id]);

    const workerTypes = workerTypesResult.rows;

    // Prepare invoice data
    const invoiceData = {
      site_name: record.site_name,
      location: record.site_location,
      client_company: record.client_company,
      project_name: record.project_name,
      record_date: record.record_date,
      supervisor_name: record.supervisor_name,
      worker_counts: record.worker_counts,
      payments_made: record.payments_made,
      production_data: record.production_data,
      worker_names: include_worker_names ? record.worker_names : null,
      worker_types: workerTypes,
      notes: record.notes
    };

    // Generate unique invoice numbers
    const clientInvoiceNumber = `CLI-${moment(record.record_date).format('YYYYMMDD')}-${uuidv4().substring(0, 8).toUpperCase()}`;
    const nuruInvoiceNumber = `NUR-${moment(record.record_date).format('YYYYMMDD')}-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Use transaction to ensure atomicity
    const result = await transaction(async (client) => {
      const invoices = [];

      // Generate client invoice
      const clientInvoiceData = {
        ...invoiceData,
        invoice_type: 'client',
        include_payment_details: false,
        include_worker_names: false
      };

      const clientPdfPath = await generateInvoicePDF(clientInvoiceData, clientInvoiceNumber);
      
      const clientInvoiceResult = await client.query(`
        INSERT INTO invoices (
          invoice_number, site_id, record_date, invoice_type, 
          client_data, pdf_path, generated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        clientInvoiceNumber,
        record.site_id,
        record.record_date,
        'client',
        JSON.stringify(clientInvoiceData),
        clientPdfPath,
        req.user.id
      ]);

      invoices.push(clientInvoiceResult.rows[0]);

      // Generate Nuru invoice
      const nuruInvoiceData = {
        ...invoiceData,
        invoice_type: 'nuru',
        include_payment_details: true,
        include_worker_names: include_worker_names
      };

      const nuruPdfPath = await generateInvoicePDF(nuruInvoiceData, nuruInvoiceNumber);
      
      const nuruInvoiceResult = await client.query(`
        INSERT INTO invoices (
          invoice_number, site_id, record_date, invoice_type, 
          client_data, nuru_data, pdf_path, generated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        nuruInvoiceNumber,
        record.site_id,
        record.record_date,
        'nuru',
        JSON.stringify(clientInvoiceData),
        JSON.stringify(nuruInvoiceData),
        nuruPdfPath,
        req.user.id
      ]);

      invoices.push(nuruInvoiceResult.rows[0]);

      return invoices;
    });

    // Log the invoice generation
    await createAuditLog(req, 'invoices', result[0].id, 'INSERT', null, {
      daily_record_id,
      invoice_count: 2,
      include_worker_names
    });

    res.status(201).json({
      message: 'Invoices generated successfully',
      invoices: result
    });

  } catch (error) {
    console.error('Generate invoices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Download invoice PDF
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;

    const invoiceResult = await query(
      'SELECT * FROM invoices WHERE id = $1',
      [id]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invoiceResult.rows[0];

    if (!invoice.pdf_path) {
      return res.status(404).json({ error: 'PDF file not found' });
    }

    // Set appropriate headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`);

    // Send the PDF file
    const fs = require('fs');
    const path = require('path');
    
    const pdfPath = path.join(__dirname, '..', 'uploads', 'invoices', invoice.pdf_path);
    
    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ error: 'PDF file not found on disk' });
    }

    const pdfBuffer = fs.readFileSync(pdfPath);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Download invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Regenerate invoice PDF
router.put('/:id/regenerate', [
  requireSiteAdmin
], async (req, res) => {
  try {
    const { id } = req.params;

    const invoiceResult = await query(
      'SELECT * FROM invoices WHERE id = $1',
      [id]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invoiceResult.rows[0];

    // Get related data
    const recordResult = await query(`
      SELECT 
        dr.*,
        s.name as site_name,
        s.location as site_location,
        s.client_company,
        p.name as project_name,
        p.invoice_template,
        u.full_name as supervisor_name
      FROM daily_records dr
      LEFT JOIN sites s ON dr.site_id = s.id
      LEFT JOIN projects p ON s.project_id = p.id
      LEFT JOIN users u ON dr.supervisor_id = u.id
      WHERE dr.site_id = $1 AND dr.record_date = $2
    `, [invoice.site_id, invoice.record_date]);

    if (recordResult.rows.length === 0) {
      return res.status(404).json({ error: 'Related daily record not found' });
    }

    const record = recordResult.rows[0];

    // Get worker types
    const workerTypesResult = await query(`
      SELECT * FROM worker_types 
      WHERE site_id = $1 AND is_active = true
      ORDER BY name
    `, [record.site_id]);

    // Prepare invoice data
    const invoiceData = {
      site_name: record.site_name,
      location: record.site_location,
      client_company: record.client_company,
      project_name: record.project_name,
      record_date: record.record_date,
      supervisor_name: record.supervisor_name,
      worker_counts: record.worker_counts,
      payments_made: record.payments_made,
      production_data: record.production_data,
      worker_names: invoice.invoice_type === 'nuru' ? record.worker_names : null,
      worker_types: workerTypesResult.rows,
      notes: record.notes,
      invoice_type: invoice.invoice_type,
      include_payment_details: invoice.invoice_type === 'nuru',
      include_worker_names: invoice.invoice_type === 'nuru'
    };

    // Generate new PDF
    const newPdfPath = await generateInvoicePDF(invoiceData, invoice.invoice_number);

    // Update invoice with new PDF path
    const updateResult = await query(`
      UPDATE invoices 
      SET pdf_path = $1, generated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [newPdfPath, id]);

    // Log the regeneration
    await createAuditLog(req, 'invoices', id, 'UPDATE', null, {
      action: 'regenerated_pdf',
      new_pdf_path: newPdfPath
    });

    res.json({
      message: 'Invoice PDF regenerated successfully',
      invoice: updateResult.rows[0]
    });

  } catch (error) {
    console.error('Regenerate invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get invoice statistics
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
      whereClause += `WHERE i.record_date BETWEEN $${paramCount} AND $${paramCount + 1}`;
      queryParams.push(start_date, end_date);
      paramCount += 2;
    }

    // Build site filter
    if (site_id) {
      whereClause += whereClause ? ` AND i.site_id = $${paramCount}` : `WHERE i.site_id = $${paramCount}`;
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

    // Get summary statistics
    const statsResult = await query(`
      SELECT 
        COUNT(i.id) as total_invoices,
        COUNT(DISTINCT i.site_id) as total_sites,
        COUNT(DISTINCT i.record_date) as total_days,
        COUNT(CASE WHEN i.invoice_type = 'client' THEN 1 END) as client_invoices,
        COUNT(CASE WHEN i.invoice_type = 'nuru' THEN 1 END) as nuru_invoices,
        MIN(i.record_date) as earliest_date,
        MAX(i.record_date) as latest_date
      FROM invoices i
      LEFT JOIN sites s ON i.site_id = s.id
      ${whereClause}
    `, queryParams);

    // Get invoices by client
    const clientStatsResult = await query(`
      SELECT 
        s.client_company,
        COUNT(i.id) as invoice_count,
        COUNT(DISTINCT i.site_id) as site_count
      FROM invoices i
      LEFT JOIN sites s ON i.site_id = s.id
      ${whereClause}
      GROUP BY s.client_company
      ORDER BY invoice_count DESC
    `, queryParams);

    res.json({
      summary: statsResult.rows[0],
      by_client: clientStatsResult.rows
    });

  } catch (error) {
    console.error('Get invoice statistics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;