const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { formatCurrency } = require('./currency');

// Ensure PDF output directory exists
const pdfOutputDir = process.env.PDF_OUTPUT_PATH || './pdfs';
if (!fs.existsSync(pdfOutputDir)) {
  fs.mkdirSync(pdfOutputDir, { recursive: true });
}

async function generatePDF(invoiceData) {
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Generate HTML content
    const htmlContent = generateInvoiceHTML(invoiceData);
    
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `${invoiceData.invoiceType}_${invoiceData.invoiceNumber}_${timestamp}.pdf`;
    const filePath = path.join(pdfOutputDir, fileName);
    
    // Generate PDF
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
    
    // Return relative path for database storage
    return path.relative(process.cwd(), filePath);
    
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error('Failed to generate PDF');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function generateInvoiceHTML(data) {
  const isClientInvoice = data.invoiceType === 'client';
  const companyName = isClientInvoice ? data.company.name : 'Nuru Company';
  const showWorkerNames = !isClientInvoice; // Only show in Nuru invoice
  const showDailyRates = !isClientInvoice; // Only show in Nuru invoice
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice ${data.invoiceNumber}</title>
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
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #2c5aa0;
            }
            
            .company-info h1 {
                color: #2c5aa0;
                font-size: 28px;
                margin-bottom: 10px;
            }
            
            .company-info p {
                margin: 2px 0;
                color: #666;
            }
            
            .invoice-details {
                text-align: right;
            }
            
            .invoice-details h2 {
                color: #2c5aa0;
                font-size: 24px;
                margin-bottom: 10px;
            }
            
            .invoice-details p {
                margin: 2px 0;
                color: #666;
            }
            
            .bill-to {
                margin-bottom: 30px;
                padding: 15px;
                background-color: #f8f9fa;
                border-left: 4px solid #2c5aa0;
            }
            
            .bill-to h3 {
                color: #2c5aa0;
                margin-bottom: 10px;
            }
            
            .work-details {
                margin-bottom: 30px;
                padding: 15px;
                background-color: #f8f9fa;
                border-radius: 5px;
            }
            
            .work-details h3 {
                color: #2c5aa0;
                margin-bottom: 15px;
            }
            
            .work-details-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
            }
            
            .work-details-grid div {
                display: flex;
                justify-content: space-between;
            }
            
            .work-details-grid strong {
                color: #2c5aa0;
            }
            
            .worker-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 30px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .worker-table th {
                background-color: #2c5aa0;
                color: white;
                padding: 12px;
                text-align: left;
                font-weight: bold;
            }
            
            .worker-table td {
                padding: 12px;
                border-bottom: 1px solid #ddd;
            }
            
            .worker-table tr:nth-child(even) {
                background-color: #f8f9fa;
            }
            
            .worker-table tr:hover {
                background-color: #e9ecef;
            }
            
            .text-right {
                text-align: right;
            }
            
            .text-center {
                text-align: center;
            }
            
            .total-section {
                margin-top: 20px;
                padding: 20px;
                background-color: #f8f9fa;
                border-radius: 5px;
            }
            
            .total-row {
                display: flex;
                justify-content: space-between;
                margin: 10px 0;
                font-size: 16px;
            }
            
            .total-row.final {
                font-size: 20px;
                font-weight: bold;
                color: #2c5aa0;
                border-top: 2px solid #2c5aa0;
                padding-top: 10px;
                margin-top: 15px;
            }
            
            .notes {
                margin-top: 30px;
                padding: 15px;
                background-color: #f8f9fa;
                border-radius: 5px;
            }
            
            .notes h3 {
                color: #2c5aa0;
                margin-bottom: 10px;
            }
            
            .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #ddd;
                text-align: center;
                color: #666;
                font-size: 12px;
            }
            
            .currency {
                font-weight: bold;
            }
            
            .worker-names {
                font-size: 11px;
                color: #666;
                margin-top: 5px;
                font-style: italic;
            }
        </style>
    </head>
    <body>
        <div class="invoice-container">
            <!-- Header -->
            <div class="header">
                <div class="company-info">
                    <h1>${companyName}</h1>
                    <p>Dar es Salaam, Tanzania</p>
                    <p>Phone: +255 XXX XXX XXX</p>
                    <p>Email: info@nurucompany.com</p>
                </div>
                <div class="invoice-details">
                    <h2>INVOICE</h2>
                    <p><strong>Invoice #:</strong> ${data.invoiceNumber}</p>
                    <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                    <p><strong>Work Date:</strong> ${new Date(data.workDate).toLocaleDateString()}</p>
                </div>
            </div>
            
            <!-- Bill To -->
            <div class="bill-to">
                <h3>Bill To:</h3>
                <p><strong>${data.company.name}</strong></p>
                ${data.company.contactPerson ? `<p>Contact: ${data.company.contactPerson}</p>` : ''}
                ${data.company.email ? `<p>Email: ${data.company.email}</p>` : ''}
                ${data.company.phone ? `<p>Phone: ${data.company.phone}</p>` : ''}
                ${data.company.address ? `<p>Address: ${data.company.address}</p>` : ''}
            </div>
            
            <!-- Work Details -->
            <div class="work-details">
                <h3>Work Details</h3>
                <div class="work-details-grid">
                    <div>
                        <span><strong>Project:</strong></span>
                        <span>${data.project.name}</span>
                    </div>
                    <div>
                        <span><strong>Site:</strong></span>
                        <span>${data.site.name}</span>
                    </div>
                    <div>
                        <span><strong>Location:</strong></span>
                        <span>${data.site.location}</span>
                    </div>
                    <div>
                        <span><strong>Weather:</strong></span>
                        <span>${data.weatherCondition || 'N/A'}</span>
                    </div>
                </div>
            </div>
            
            <!-- Worker Details Table -->
            <table class="worker-table">
                <thead>
                    <tr>
                        <th>Worker Type</th>
                        <th class="text-center">Count</th>
                        <th class="text-center">Production</th>
                        ${showDailyRates ? '<th class="text-right">Daily Rate</th>' : ''}
                        <th class="text-right">Amount Paid</th>
                        ${showWorkerNames ? '<th>Worker Names</th>' : ''}
                    </tr>
                </thead>
                <tbody>
                    ${data.workerAttendance.map(wa => `
                        <tr>
                            <td><strong>${wa.workerTypeName}</strong></td>
                            <td class="text-center">${wa.workerCount}</td>
                            <td class="text-center">${wa.productionAmount} ${wa.productionUnit}</td>
                            ${showDailyRates ? `<td class="text-right">${formatCurrency(wa.dailyRate)}</td>` : ''}
                            <td class="text-right currency">${formatCurrency(wa.amountPaid)}</td>
                            ${showWorkerNames && wa.workerNames ? `<td class="worker-names">${wa.workerNames}</td>` : showWorkerNames ? '<td>-</td>' : ''}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <!-- Total Section -->
            <div class="total-section">
                <div class="total-row final">
                    <span>Total Amount:</span>
                    <span class="currency">${formatCurrency(data.totalAmount)}</span>
                </div>
            </div>
            
            <!-- Notes -->
            ${data.notes ? `
                <div class="notes">
                    <h3>Notes</h3>
                    <p>${data.notes}</p>
                </div>
            ` : ''}
            
            <!-- Footer -->
            <div class="footer">
                <p>Thank you for your business!</p>
                <p>This invoice was generated on ${new Date().toLocaleString()}</p>
                ${isClientInvoice ? '<p><em>Client Invoice - Summary Information Only</em></p>' : '<p><em>Internal Invoice - Detailed Information</em></p>'}
            </div>
        </div>
    </body>
    </html>
  `;
}

module.exports = {
  generatePDF
};