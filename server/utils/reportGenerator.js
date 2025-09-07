const puppeteer = require('puppeteer');
const moment = require('moment');

const generateReportHTML = (reportType, reportData, filters) => {
  const {
    start_date,
    end_date,
    site_id,
    project_id,
    client_company,
    group_by
  } = filters;

  const formatDate = (date) => moment(date).format('DD/MM/YYYY');
  const formatCurrency = (amount) => new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0
  }).format(amount);

  let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${reportType.replace('_', ' ').toUpperCase()} Report</title>
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
            
            .report-container {
                max-width: 1000px;
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
            
            .report-title {
                font-size: 24px;
                color: #34495e;
                margin-bottom: 5px;
            }
            
            .report-period {
                font-size: 16px;
                color: #7f8c8d;
            }
            
            .filters-section {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 30px;
                border-left: 4px solid #3498db;
            }
            
            .filters-title {
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 10px;
            }
            
            .filters-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 10px;
                font-size: 14px;
            }
            
            .filter-item {
                display: flex;
                justify-content: space-between;
            }
            
            .filter-label {
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
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
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
                font-size: 20px;
                font-weight: bold;
                color: #27ae60;
                margin-bottom: 5px;
            }
            
            .summary-label {
                font-size: 12px;
                color: #7f8c8d;
            }
            
            .data-section {
                margin-bottom: 30px;
            }
            
            .section-title {
                font-size: 18px;
                color: #2c3e50;
                margin-bottom: 15px;
                border-bottom: 2px solid #3498db;
                padding-bottom: 5px;
            }
            
            .data-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
                background: white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .data-table th {
                background: #34495e;
                color: white;
                padding: 12px;
                text-align: left;
                font-weight: bold;
                font-size: 14px;
            }
            
            .data-table td {
                padding: 10px 12px;
                border-bottom: 1px solid #ecf0f1;
                font-size: 13px;
            }
            
            .data-table tr:nth-child(even) {
                background: #f8f9fa;
            }
            
            .data-table tr:hover {
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
            
            .footer {
                margin-top: 40px;
                text-align: center;
                padding-top: 20px;
                border-top: 1px solid #bdc3c7;
                color: #7f8c8d;
                font-size: 12px;
            }
            
            @media print {
                body { margin: 0; }
                .report-container { max-width: none; padding: 0; }
            }
        </style>
    </head>
    <body>
        <div class="report-container">
            <div class="header">
                <div class="company-name">NURU COMPANY</div>
                <div class="report-title">${reportType.replace('_', ' ').toUpperCase()} REPORT</div>
                <div class="report-period">${formatDate(start_date)} - ${formatDate(end_date)}</div>
            </div>
            
            <div class="filters-section">
                <div class="filters-title">Report Filters</div>
                <div class="filters-grid">
                    <div class="filter-item">
                        <span class="filter-label">Period:</span>
                        <span>${formatDate(start_date)} to ${formatDate(end_date)}</span>
                    </div>
                    ${site_id ? `
                    <div class="filter-item">
                        <span class="filter-label">Site ID:</span>
                        <span>${site_id}</span>
                    </div>
                    ` : ''}
                    ${project_id ? `
                    <div class="filter-item">
                        <span class="filter-label">Project ID:</span>
                        <span>${project_id}</span>
                    </div>
                    ` : ''}
                    ${client_company ? `
                    <div class="filter-item">
                        <span class="filter-label">Client:</span>
                        <span>${client_company}</span>
                    </div>
                    ` : ''}
                    <div class="filter-item">
                        <span class="filter-label">Group By:</span>
                        <span>${group_by}</span>
                    </div>
                </div>
            </div>
  `;

  // Add summary section
  if (reportData.summary) {
    const summary = reportData.summary;
    html += `
      <div class="summary-section">
        <div class="summary-title">Summary Statistics</div>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-value">${summary.total_records || 0}</div>
            <div class="summary-label">Total Records</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">${summary.total_sites || 0}</div>
            <div class="summary-label">Sites</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">${summary.total_workers || 0}</div>
            <div class="summary-label">Total Workers</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">${formatCurrency(summary.total_payments || 0)}</div>
            <div class="summary-label">Total Payments</div>
          </div>
          ${summary.avg_production ? `
          <div class="summary-item">
            <div class="summary-value">${summary.avg_production.toFixed(2)}</div>
            <div class="summary-label">Avg Production</div>
          </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  // Add data sections based on report type
  switch (reportType) {
    case 'comprehensive':
      if (reportData.grouped_data && reportData.grouped_data.length > 0) {
        html += `
          <div class="data-section">
            <div class="section-title">Grouped Data (${group_by})</div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>${group_by.charAt(0).toUpperCase() + group_by.slice(1)}</th>
                  <th class="text-center">Records</th>
                  <th class="text-center">Workers</th>
                  <th class="text-right">Payments</th>
                  <th class="text-center">Sites</th>
                  <th class="text-center">Supervisors</th>
                </tr>
              </thead>
              <tbody>
        `;

        reportData.grouped_data.forEach(item => {
          html += `
            <tr>
              <td>${item.group_name}</td>
              <td class="text-center">${item.records_count}</td>
              <td class="text-center">${item.total_workers}</td>
              <td class="text-right">${formatCurrency(item.total_payments)}</td>
              <td class="text-center">${item.sites_count}</td>
              <td class="text-center">${item.supervisors_count}</td>
            </tr>
          `;
        });

        html += `
              </tbody>
            </table>
          </div>
        `;
      }
      break;

    case 'worker-analysis':
      if (reportData.worker_type_statistics && reportData.worker_type_statistics.length > 0) {
        html += `
          <div class="data-section">
            <div class="section-title">Worker Type Analysis</div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Worker Type</th>
                  <th>Site</th>
                  <th>Client</th>
                  <th class="text-center">Days Used</th>
                  <th class="text-center">Total Workers</th>
                  <th class="text-right">Total Payments</th>
                  <th class="text-center">Avg/Day</th>
                </tr>
              </thead>
              <tbody>
        `;

        reportData.worker_type_statistics.forEach(item => {
          html += `
            <tr>
              <td>${item.worker_type}</td>
              <td>${item.site_name}</td>
              <td>${item.client_company}</td>
              <td class="text-center">${item.days_used}</td>
              <td class="text-center">${item.total_workers}</td>
              <td class="text-right">${formatCurrency(item.total_payments)}</td>
              <td class="text-center">${item.avg_workers_per_day.toFixed(1)}</td>
            </tr>
          `;
        });

        html += `
              </tbody>
            </table>
          </div>
        `;
      }
      break;

    case 'supervisor-performance':
      if (reportData.supervisor_performance && reportData.supervisor_performance.length > 0) {
        html += `
          <div class="data-section">
            <div class="section-title">Supervisor Performance</div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Supervisor</th>
                  <th class="text-center">Records</th>
                  <th class="text-center">Sites</th>
                  <th class="text-center">Workers</th>
                  <th class="text-right">Payments</th>
                  <th class="text-center">Corrections</th>
                  <th class="text-center">Avg Production</th>
                </tr>
              </thead>
              <tbody>
        `;

        reportData.supervisor_performance.forEach(item => {
          html += `
            <tr>
              <td>${item.supervisor_name}</td>
              <td class="text-center">${item.total_records}</td>
              <td class="text-center">${item.sites_managed}</td>
              <td class="text-center">${item.total_workers_managed}</td>
              <td class="text-right">${formatCurrency(item.total_payments_managed)}</td>
              <td class="text-center">${item.total_corrections}</td>
              <td class="text-center">${item.avg_production ? item.avg_production.toFixed(2) : 'N/A'}</td>
            </tr>
          `;
        });

        html += `
              </tbody>
            </table>
          </div>
        `;

        // Add correction patterns
        if (reportData.correction_patterns && reportData.correction_patterns.length > 0) {
          html += `
            <div class="data-section">
              <div class="section-title">Correction Patterns</div>
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Reason</th>
                    <th class="text-center">Frequency</th>
                    <th class="text-center">Affected Records</th>
                    <th class="text-center">Supervisors</th>
                  </tr>
                </thead>
                <tbody>
          `;

          reportData.correction_patterns.forEach(item => {
            html += `
              <tr>
                <td>${item.correction_reason}</td>
                <td class="text-center">${item.frequency}</td>
                <td class="text-center">${item.affected_records}</td>
                <td class="text-center">${item.supervisors_involved}</td>
              </tr>
            `;
          });

          html += `
                </tbody>
              </table>
            </div>
          `;
        }
      }
      break;
  }

  html += `
      <div class="footer">
        <p>Generated on ${formatDate(new Date())} by Nuru Company Management System</p>
        <p>This is a computer-generated report.</p>
      </div>
    </div>
  </body>
  </html>
  `;

  return html;
};

const generateReportPDF = async (reportType, reportData, filters) => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    const html = generateReportHTML(reportType, reportData, filters);
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
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
    
    return pdfBuffer;
    
  } catch (error) {
    console.error('Report PDF generation error:', error);
    throw new Error('Failed to generate report PDF: ' + error.message);
  }
};

module.exports = {
  generateReportPDF,
  generateReportHTML
};