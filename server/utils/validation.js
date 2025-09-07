const { body, param, query, validationResult } = require('express-validator');

// Common validation rules
const commonValidations = {
  email: body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  
  password: body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  name: body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  phone: body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Valid phone number is required'),
  
  uuid: param('id').isUUID().withMessage('Valid ID is required'),
  
  amount: body('amount')
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
  
  date: body('date')
    .isISO8601()
    .withMessage('Valid date is required'),
  
  workDate: body('workDate')
    .isISO8601()
    .withMessage('Valid work date is required')
    .custom((value) => {
      const workDate = new Date(value);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today
      
      if (workDate > today) {
        throw new Error('Work date cannot be in the future');
      }
      
      return true;
    }),
  
  workerCount: body('workerCount')
    .isInt({ min: 0, max: 1000 })
    .withMessage('Worker count must be between 0 and 1000'),
  
  productionAmount: body('productionAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Production amount must be a positive number'),
  
  amountPaid: body('amountPaid')
    .isFloat({ min: 0 })
    .withMessage('Amount paid must be a positive number'),
  
  dailyRate: body('dailyRate')
    .isFloat({ min: 0 })
    .withMessage('Daily rate must be a positive number'),
  
  reason: body('reason')
    .optional()
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Reason must be between 5 and 255 characters')
};

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// Date range validation
const validateDateRange = (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }
    
    if (start > end) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be after end date'
      });
    }
    
    // Limit date range to 1 year
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    if (end - start > oneYear) {
      return res.status(400).json({
        success: false,
        message: 'Date range cannot exceed 1 year'
      });
    }
  }
  
  next();
};

// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  validate
];

// Role validation
const validateRole = (allowedRoles) => {
  return body('role')
    .isIn(allowedRoles)
    .withMessage(`Role must be one of: ${allowedRoles.join(', ')}`);
};

// Site access validation for supervisors
const validateSiteAccess = async (req, res, next) => {
  try {
    if (req.user.role === 'super_admin' || req.user.role === 'site_admin') {
      return next();
    }
    
    if (req.user.role !== 'supervisor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const siteId = req.params.siteId || req.body.siteId;
    if (!siteId) {
      return res.status(400).json({
        success: false,
        message: 'Site ID is required'
      });
    }
    
    // Check if supervisor is assigned to this site
    const pool = require('../config/database');
    const result = await pool.query(
      'SELECT id FROM sites WHERE id = $1 AND assigned_supervisor_id = $2',
      [siteId, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this site'
      });
    }
    
    next();
  } catch (error) {
    console.error('Site access validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Validation error'
    });
  }
};

// Same-day correction validation
const validateSameDayCorrection = async (req, res, next) => {
  try {
    const { workDate } = req.body;
    const today = new Date();
    const workDateObj = new Date(workDate);
    
    // Check if work date is today
    const isToday = workDateObj.toDateString() === today.toDateString();
    
    if (!isToday) {
      return res.status(400).json({
        success: false,
        message: 'Corrections can only be made on the same day'
      });
    }
    
    // Check correction count for today
    const pool = require('../config/database');
    const result = await pool.query(
      `SELECT corrections_count FROM supervisor_performance 
       WHERE supervisor_id = $1 AND work_date = $2`,
      [req.user.id, workDate]
    );
    
    const correctionsCount = result.rows[0]?.corrections_count || 0;
    const maxCorrections = 10; // Configurable limit
    
    if (correctionsCount >= maxCorrections) {
      return res.status(400).json({
        success: false,
        message: `Maximum corrections limit (${maxCorrections}) reached for today`
      });
    }
    
    next();
  } catch (error) {
    console.error('Same-day correction validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Validation error'
    });
  }
};

module.exports = {
  commonValidations,
  validate,
  validateDateRange,
  validatePagination,
  validateRole,
  validateSiteAccess,
  validateSameDayCorrection
};