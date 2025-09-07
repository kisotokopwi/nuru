const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const moment = require('moment');

// Ensure uploads directory exists
const ensureUploadsDir = () => {
  const uploadsDir = path.join(__dirname, '..', 'uploads', 'invoices');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  return uploadsDir;
};

const generateInvoiceHTML = (invoiceData, invoiceNumber) => {
  const {
    site_name,
    location,
    client_company,
    project_name,
    record_date,
    supervisor_name,
    worker_counts,
    payments_made,
    production_data,
    worker_names,
    worker_types,
    notes,
    invoice_type,
    include_payment_details,
    include_worker_names
  } = invoiceData;

  const formatDate = (date) => moment(date).format('DD/MM/YYYY');
  const formatCurrency = (amount) => new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0
  }).format(amount);

  const totalWorkers = worker_counts.total || 0;
  const totalPayments = payments_made.total || 0;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice ${invoiceNumber}</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Arial', sans-serif;
                line-height: 1.6;
                color: #333;
                background: white;
            }
            
            .invoice-container {
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
            }
            
            .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 3px solid #2c3e50;
                padding-bottom: 20px;
            }
            
            .company-name {
                font-size: 28px;
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 10px;
            }
            
            .invoice-title {
                font-size: 24px;
                color: #34495e;
                margin-bottom: 5px;
            }
            
            .invoice-number {
                font-size: 16px;
                color: #7f8c8d;
            }
            
            .invoice-details {
                display: flex;
                justify-content: space-between;
                margin-bottom: 30px;
                flex-wrap: wrap;
            }
            
            .detail-section {
                flex: 1;
                min-width: 200px;
                margin: 10px;
            }
            
            .detail-section h3 {
                color: #2c3e50;
                margin-bottom: 10px;
                font-size: 16px;
                border-bottom: 1px solid #bdc3c7;
                padding-bottom: 5px;
            }
            
            .detail-item {
                margin-bottom: 5px;
                font-size: 14px;
            }
            
            .detail-label {
                font-weight: bold;
                color: #34495e;
            }
            
            .summary-section {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 30px;
            }
            
            .summary-title {
                font-size: 18px;
                color: #2c3e50;
                margin-bottom: 15px;
                text-align: center;
            }
            
            .summary-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
            }
            
            .summary-item {
                text-align: center;
                padding: 15px;
                background: white;
                border-radius: 6px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .summary-value {
                font-size: 24px;
                font-weight: bold;
                color: #27ae60;
                margin-bottom: 5px;
            }
            
            .summary-label {
                font-size: 14px;
                color: #7f8c8d;
            }
            
            .worker-details {
                margin-bottom: 30px;
            }
            
            .section-title {
                font-size: 18px;
                color: #2c3e50;
                margin-bottom: 15px;
                border-bottom: 2px solid #3498db;
                padding-bottom: 5px;
            }
            
            .worker-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
                background: white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .worker-table th {
                background: #34495e;
                color: white;
                padding: 12px;
                text-align: left;
                font-weight: bold;
            }
            
            .worker-table td {
                padding: 10px 12px;
                border-bottom: 1px solid #ecf0f1;
            }
            
            .worker-table tr:nth-child(even) {
                background: #f8f9fa;
            }
            
            .worker-table tr:hover {
                background: #e8f4f8;
            }
            
            .text-right {
                text-align: right;
            }
            
            .text-center {
                text-align: center;
            }
            
            .total-row {
                background: #2c3e50 !important;
                color: white !important;
                font-weight: bold;
            }
            
            .notes-section {
                margin-top: 30px;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 6px;
                border-left: 4px solid #3498db;
            }
            
            .notes-title {
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 10px;
            }
            
            .footer {
                margin-top: 40px;
                text-align: center;
                padding-top: 20px;
                border-top: 1px solid #bdc3c7;
                color: #7f8c8d;
                font-size: 12px;
            }
            
            .signature-section {
                margin-top: 40px;
                display: flex;
                justify-content: space-between;
                align-items: end;
            }
            
            .signature-box {
                text-align: center;
                min-width: 150px;
            }
            
            .signature-line {
                border-bottom: 1px solid #333;
                margin-bottom: 5px;
                height: 40px;
            }
            
            .signature-label {
                font-size: 12px;
                color: #7f8c8d;
            }
            
            @media print {
                body { margin: 0; }
                .invoice-container { max-width: none; padding: 0; }
            }
        </style>
    </head>
    <body>
        <div class="invoice-container">
            <div class="header">
                <div class="company-name">NURU COMPANY</div>
                <div class="invoice-title">${invoice_type === 'client' ? 'Daily Work Report' : 'Internal Invoice'}</div>
                <div class="invoice-number">Invoice #: ${invoiceNumber}</div>
            </div>
            
            <div class="invoice-details">
                <div class="detail-section">
                    <h3>Client Information</h3>
                    <div class="detail-item">
                        <span class="detail-label">Company:</span> ${client_company}
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Project:</span> ${project_name}
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Site:</span> ${site_name}
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Location:</span> ${location}
                    </div>
                </div>
                
                <div class="detail-section">
                    <h3>Work Details</h3>
                    <div class="detail-item">
                        <span class="detail-label">Date:</span> ${formatDate(record_date)}
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Supervisor:</span> ${supervisor_name}
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Total Workers:</span> ${totalWorkers}
                    </div>
                    ${include_payment_details ? `
                    <div class="detail-item">
                        <span class="detail-label">Total Payments:</span> ${formatCurrency(totalPayments)}
                    </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="summary-section">
                <div class="summary-title">Daily Summary</div>
                <div class="summary-grid">
                    <div class="summary-item">
                        <div class="summary-value">${totalWorkers}</div>
                        <div class="summary-label">Total Workers</div>
                    </div>
                    ${include_payment_details ? `
                    <div class="summary-item">
                        <div class="summary-value">${formatCurrency(totalPayments)}</div>
                        <div class="summary-label">Total Payments</div>
                    </div>
                    ` : ''}
                    ${production_data && production_data.tons_produced ? `
                    <div class="summary-item">
                        <div class="summary-value">${production_data.tons_produced}</div>
                        <div class="summary-label">Tons Produced</div>
                    </div>
                    ` : ''}
                    ${production_data && production_data.task_completion ? `
                    <div class="summary-item">
                        <div class="summary-value">${production_data.task_completion}</div>
                        <div class="summary-label">Task Status</div>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="worker-details">
                <div class="section-title">Worker Breakdown</div>
                <table class="worker-table">
                    <thead>
                        <tr>
                            <th>Worker Type</th>
                            <th class="text-center">Count</th>
                            <th class="text-right">Daily Rate</th>
                            ${include_payment_details ? '<th class="text-right">Total Payment</th>' : ''}
                            ${include_worker_names && include_worker_names ? '<th>Worker Names</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${worker_types.map(wt => {
                          const count = parseInt(worker_counts[wt.id]) || 0;
                          const payment = parseFloat(payments_made[wt.id]) || 0;
                          const names = include_worker_names && worker_names ? worker_names[wt.id] : null;
                          
                          return `
                            <tr>
                                <td>${wt.name}</td>
                                <td class="text-center">${count}</td>
                                <td class="text-right">${formatCurrency(wt.daily_rate)}</td>
                                ${include_payment_details ? `<td class="text-right">${formatCurrency(payment)}</td>` : ''}
                                ${include_worker_names && names ? `<td>${Array.isArray(names) ? names.join(', ') : names}</td>` : ''}
                            </tr>
                          `;
                        }).join('')}
                        <tr class="total-row">
                            <td><strong>TOTAL</strong></td>
                            <td class="text-center"><strong>${totalWorkers}</strong></td>
                            <td class="text-right">-</td>
                            ${include_payment_details ? `<td class="text-right"><strong>${formatCurrency(totalPayments)}</strong></td>` : ''}
                            ${include_worker_names ? '<td>-</td>' : ''}
                        </tr>
                    </tbody>
                </table>
            </div>
            
            ${notes ? `
            <div class="notes-section">
                <div class="notes-title">Notes:</div>
                <div>${notes}</div>
            </div>
            ` : ''}
            
            <div class="signature-section">
                <div class="signature-box">
                    <div class="signature-line"></div>
                    <div class="signature-label">Supervisor Signature</div>
                </div>
                <div class="signature-box">
                    <div class="signature-line"></div>
                    <div class="signature-label">Date</div>
                </div>
            </div>
            
            <div class="footer">
                <p>Generated on ${formatDate(new Date())} by Nuru Company Management System</p>
                <p>This is a computer-generated document and does not require a signature.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};

const generateInvoicePDF = async (invoiceData, invoiceNumber) => {
  try {
    ensureUploadsDir();
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    const html = generateInvoiceHTML(invoiceData, invoiceNumber);
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const uploadsDir = ensureUploadsDir();
    const fileName = `${invoiceNumber}.pdf`;
    const filePath = path.join(uploadsDir, fileName);
    
    await page.pdf({
      path: filePath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });
    
    await browser.close();
    
    return fileName;
    
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error('Failed to generate PDF: ' + error.message);
  }
};

module.exports = {
  generateInvoicePDF,
  generateInvoiceHTML
};