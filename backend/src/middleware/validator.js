const { body, param, query, validationResult } = require('express-validator');
const { ValidationError, formatValidationErrors } = require('./errorHandler');

/**
 * Validation middleware to check for errors
 */
function validate(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = formatValidationErrors(errors);
    throw new ValidationError('Validation failed', formattedErrors);
  }

  next();
}

/**
 * Common validation rules
 */
const validations = {
  // Wallet address
  walletAddress: () => body('walletAddress')
    .trim()
    .isLength({ min: 32, max: 44 })
    .withMessage('Invalid Solana wallet address'),

  // Email
  email: () => body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),

  // Username
  username: () => body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username must be 3-50 characters and contain only letters, numbers, underscores, and hyphens'),

  // Model ID (UUID)
  modelId: (location = 'param') => {
    const validator = location === 'param' ? param('modelId') : body('modelId');
    return validator.isUUID().withMessage('Invalid model ID');
  },

  // Market ID (UUID)
  marketId: (location = 'param') => {
    const validator = location === 'param' ? param('marketId') : body('marketId');
    return validator.isUUID().withMessage('Invalid market ID');
  },

  // Model name
  modelName: () => body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Model name must be 1-255 characters'),

  // Model type
  modelType: () => body('model_type')
    .isIn(['classification', 'regression', 'clustering', 'time_series', 'nlp', 'computer_vision', 'other'])
    .withMessage('Invalid model type'),

  // URL
  url: (field) => body(field)
    .trim()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage(`${field} must be a valid HTTPS URL`),

  // Amount (positive integer)
  amount: () => body('amount')
    .isInt({ min: 1 })
    .withMessage('Amount must be a positive integer'),

  // Drift threshold
  driftThreshold: () => body('drift_threshold_percent')
    .isFloat({ min: 0.01, max: 100 })
    .withMessage('Drift threshold must be between 0.01 and 100'),

  // Bet side
  betSide: () => body('side')
    .isIn(['no_drift', 'drift'])
    .withMessage('Side must be either "no_drift" or "drift"'),

  // Pagination
  pagination: () => [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt(),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer')
      .toInt(),
  ],

  // Date
  date: (field) => body(field)
    .isISO8601()
    .toDate()
    .withMessage(`${field} must be a valid ISO 8601 date`),

  // JSON
  json: (field) => body(field)
    .custom((value) => {
      try {
        if (typeof value === 'string') {
          JSON.parse(value);
        }
        return true;
      } catch {
        return false;
      }
    })
    .withMessage(`${field} must be valid JSON`),
};

/**
 * Validation chains for specific endpoints
 */
const validators = {
  // Auth
  authChallenge: [
    validations.walletAddress(),
    validate,
  ],

  authVerify: [
    validations.walletAddress(),
    body('signature').notEmpty().withMessage('Signature is required'),
    body('message').notEmpty().withMessage('Message is required'),
    validate,
  ],

  // User
  updateUser: [
    validations.email(),
    validations.username(),
    body('display_name').optional().trim().isLength({ max: 100 }),
    body('bio').optional().trim().isLength({ max: 500 }),
    validate,
  ],

  // Model
  createModel: [
    validations.modelName(),
    validations.modelType(),
    body('description').optional().trim().isLength({ max: 2000 }),
    validations.url('monitoring_endpoint'),
    body('framework').optional().isString(),
    validations.json('baseline_metrics'),
    validations.driftThreshold(),
    validate,
  ],

  updateModel: [
    validations.modelId(),
    body('name').optional().trim().isLength({ min: 1, max: 255 }),
    body('description').optional().trim().isLength({ max: 2000 }),
    validate,
  ],

  // Market
  createMarket: [
    validations.modelId('body'),
    body('question').trim().isLength({ min: 10, max: 500 }).withMessage('Question must be 10-500 characters'),
    body('description').optional().trim().isLength({ max: 2000 }),
    validations.driftThreshold(),
    body('metric_type').isIn(['accuracy', 'precision', 'recall', 'f1_score', 'rmse', 'mae', 'r2']),
    validations.date('resolution_date'),
    validate,
  ],

  placeBet: [
    validations.marketId(),
    validations.betSide(),
    validations.amount(),
    validate,
  ],

  // Insurance
  insuranceQuote: [
    validations.modelId('body'),
    body('coverageAmount').isInt({ min: 1 }).withMessage('Coverage amount must be positive'),
    body('duration').isInt({ min: 1, max: 365 }).withMessage('Duration must be 1-365 days'),
    validate,
  ],

  purchaseInsurance: [
    validations.modelId('body'),
    body('coverageAmount').isInt({ min: 1 }),
    body('durationDays').isInt({ min: 1, max: 365 }),
    body('driftThreshold').optional().isFloat({ min: 0.01, max: 100 }),
    validate,
  ],

  // Wallet
  initiateDeposit: [
    validations.amount(),
    validate,
  ],

  initiateWithdrawal: [
    validations.amount(),
    body('destinationAddress').trim().isLength({ min: 32, max: 44 }).withMessage('Invalid destination address'),
    validate,
  ],
};

module.exports = {
  validate,
  validations,
  validators,
};
