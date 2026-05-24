const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  getMe,
  updatePassword,
  deleteAccount,
} = require('../controllers/authController');
const { uploadAvatar, removeAvatar } = require('../controllers/avatarController');
const { protect } = require('../middleware/authMiddleware');
const { validateSignup, validateLogin } = require('../utils/validators');

router.post('/signup', validateSignup, signup);
router.post('/login', validateLogin, login);
router.get('/me', protect, getMe);
router.patch('/me/password', protect, updatePassword);
router.patch('/me/avatar', protect, uploadAvatar);
router.delete('/me/avatar', protect, removeAvatar);
router.delete('/me', protect, deleteAccount);

module.exports = router;
