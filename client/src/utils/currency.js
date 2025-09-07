// Currency formatting utilities for TZS (Tanzanian Shillings)

/**
 * Format amount in TZS currency
 * @param {number} amount - The amount to format
 * @param {boolean} showSymbol - Whether to show currency symbol
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, showSymbol = true) {
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
export function parseCurrency(currencyString) {
  if (!currencyString) return 0;
  
  // Remove currency symbols and spaces
  const cleaned = currencyString.toString()
    .replace(/[TSh\s,]/g, '')
    .trim();
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Validate currency amount
 * @param {any} amount - Amount to validate
 * @returns {boolean} Whether amount is valid
 */
export function isValidAmount(amount) {
  if (amount === null || amount === undefined) return false;
  
  const num = parseFloat(amount);
  return !isNaN(num) && num >= 0 && isFinite(num);
}

/**
 * Round to nearest whole number (TZS doesn't use decimals)
 * @param {number} amount - Amount to round
 * @returns {number} Rounded amount
 */
export function roundToWhole(amount) {
  return Math.round(parseFloat(amount) || 0);
}