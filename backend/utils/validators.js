const { body, validationResult } = require('express-validator');

const validateSignup = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 }).withMessage('Username must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .trim()
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/\d/).withMessage('Password must contain at least one number'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Format to return simple array of messages
      return res.status(400).json({ message: errors.array()[0].msg });
    }
    next();
  }
];

const validateLogin = [
  body('email')
    .trim()
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }
    next();
  }
];

module.exports = { validateSignup, validateLogin };
