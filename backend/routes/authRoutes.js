const express = require('express');
const router = express.Router();
const { signup, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { validateSignup, validateLogin } = require('../utils/validators');

router.post('/signup', validateSignup, signup);
router.post('/login', validateLogin, login);
router.get('/me', protect, getMe);

module.exports = router;
