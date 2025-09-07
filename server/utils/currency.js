// Currency formatting utilities for TZS (Tanzanian Shillings)

/**
 * Format amount in TZS currency
 * @param {number} amount - The amount to format
 * @param {boolean} showSymbol - Whether to show currency symbol
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount, showSymbol = true) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return showSymbol ? 'TSh 0' : '0';
  }

  // TZS doesn't use decimal places in practice
  const formattedAmount = Math.round(amount).toLocaleString('en-TZ');
  
  return showSymbol ? `TSh ${formattedAmount}` : formattedAmount;
}

/**
 * Parse currency string to number
 * @param {string} currencyString - Currency string to parse
 * @returns {number} Parsed number
 */
function parseCurrency(currencyString) {
  if (!currencyString) return 0;
  
  // Remove currency symbols and spaces
  const cleaned = currencyString.toString()
    .replace(/[TSh\s,]/g, '')
    .trim();
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Calculate total amount for multiple items
 * @param {Array} items - Array of items with amount property
 * @returns {number} Total amount
 */
function calculateTotal(items) {
  if (!Array.isArray(items)) return 0;
  
  return items.reduce((total, item) => {
    const amount = parseFloat(item.amount) || 0;
    return total + amount;
  }, 0);
}

/**
 * Generate invoice number
 * @param {string} prefix - Invoice prefix (e.g., 'INV', 'CLI')
 * @param {Date} date - Date for the invoice
 * @returns {string} Generated invoice number
 */
function generateInvoiceNumber(prefix = 'INV', date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const timestamp = Date.now().toString().slice(-6);
  
  return `${prefix}-${year}${month}${day}-${timestamp}`;
}

/**
 * Validate currency amount
 * @param {any} amount - Amount to validate
 * @returns {boolean} Whether amount is valid
 */
function isValidAmount(amount) {
  if (amount === null || amount === undefined) return false;
  
  const num = parseFloat(amount);
  return !isNaN(num) && num >= 0 && isFinite(num);
}

/**
 * Round to nearest whole number (TZS doesn't use decimals)
 * @param {number} amount - Amount to round
 * @returns {number} Rounded amount
 */
function roundToWhole(amount) {
  return Math.round(parseFloat(amount) || 0);
}

module.exports = {
  formatCurrency,
  parseCurrency,
  calculateTotal,
  generateInvoiceNumber,
  isValidAmount,
  roundToWhole
};