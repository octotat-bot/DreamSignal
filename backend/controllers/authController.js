const User = require('../models/User');
const Dream = require('../models/Dream');
const Pattern = require('../models/Pattern');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { deleteFromCloudinary } = require('../config/cloudinary');
const rootLogger = require('../services/logger').child({ scope: 'authController' });

// Helper to sign JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET || 'fallback_secret_key_minimum_32_chars',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
const signup = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // Check duplicate email first
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email address is already in use' });
    }

    // Check duplicate username second
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    // Hash password with 12 rounds
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password: hashedPassword
    });

    const token = generateToken(user);

    return res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Security spec: DO NOT specify which credential field is invalid
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Match password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user);

    return res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar
      }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        dreamCount: user.dreamCount,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Change the currently-authenticated user's password.
// @route   PATCH /api/auth/me/password
// @access  Private
//
// Validates `currentPassword` against the stored hash before applying a new
// one — even with a valid JWT, we never want a stolen token to silently
// rotate credentials. New password follows the same minlength=8 rule as
// signup (enforced both here and by the Mongoose schema).
const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({ message: 'Both currentPassword and newPassword are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters' });
    }
    if (newPassword === currentPassword) {
      return res.status(400).json({ message: 'New password must differ from the current password' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Current password is incorrect' });

    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Permanently delete the authenticated user's account and every
//          artifact that belongs to them: dreams, pattern aggregates, and
//          on-disk audio files. Requires the user to type their password
//          so a stolen token can't nuke the archive on its own.
// @route   DELETE /api/auth/me
// @access  Private
const deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body || {};
    if (typeof password !== 'string' || !password) {
      return res.status(400).json({ message: 'Password confirmation is required to delete the account' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Password is incorrect' });

    const log = rootLogger.child({ userId: String(user._id), requestId: req.id || null });

    // Destroy Cloudinary avatar if present
    if (user.avatarPublicId) {
      try {
        await deleteFromCloudinary(user.avatarPublicId);
      } catch (err) {
        log.warn({ err: err.message }, 'Failed to delete Cloudinary avatar during account deletion');
      }
    }

    // Destroy Cloudinary audio files for all user's dreams
    const dreams = await Dream.find({ userId: user._id }).select('audioPublicId').lean();
    for (const dream of dreams) {
      if (!dream.audioPublicId) continue;
      try {
        await deleteFromCloudinary(dream.audioPublicId);
      } catch (err) {
        log.warn({ err: err.message, publicId: dream.audioPublicId }, 'Failed to delete dream audio from Cloudinary during account deletion');
      }
    }

    await Dream.deleteMany({ userId: user._id });
    await Pattern.deleteOne({ userId: user._id });
    await User.findByIdAndDelete(user._id);

    log.info({ dreamsDeleted: dreams.length }, 'Account deleted');
    return res.json({ message: 'Account permanently closed' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  signup,
  login,
  getMe,
  updatePassword,
  deleteAccount,
};
