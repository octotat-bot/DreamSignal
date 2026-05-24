const multer = require('multer');
const User = require('../models/User');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');
const rootLogger = require('../services/logger').child({ scope: 'avatarController' });

// ─────────────────────────────────────────────────────────────────────────────
// Multer config — memory storage so we stream the buffer to Cloudinary
// without writing a temp file to disk.
// ─────────────────────────────────────────────────────────────────────────────
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error('Invalid image format. Allowed: JPEG, PNG, WebP.'),
        false
      );
    }
  },
}).single('avatar');

// @desc    Upload or replace the authenticated user's avatar
// @route   PATCH /api/auth/me/avatar
// @access  Private
const uploadAvatar = async (req, res, next) => {
  // Wrap multer in a promise so we can catch its errors cleanly
  await new Promise((resolve, reject) => {
    avatarUpload(req, res, (err) => {
      if (err) return reject(err);
      resolve();
    });
  }).catch((err) => {
    // If multer errored, respond and bail — don't let next() run
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Avatar must be under 5 MB.'
        : err.message || 'Upload failed.';
    return res.status(400).json({ message });
  });

  // If we already sent a 400 above, res.headersSent is true
  if (res.headersSent) return;

  if (!req.file) {
    return res.status(400).json({ message: 'No image file provided.' });
  }

  const log = rootLogger.child({ userId: req.user.id });

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Destroy previous avatar if present
    if (user.avatarPublicId) {
      try {
        await deleteFromCloudinary(user.avatarPublicId);
      } catch (err) {
        log.warn({ err: err.message }, 'Failed to delete old avatar from Cloudinary');
      }
    }

    // Upload new avatar to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: `dream-signal/avatars`,
      public_id: `user_${user._id}`,
      overwrite: true,
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    });

    user.avatar = result.secure_url;
    user.avatarPublicId = result.public_id;
    await user.save();

    log.info({ publicId: result.public_id }, 'Avatar uploaded');

    return res.json({ avatar: user.avatar });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove the authenticated user's avatar
// @route   DELETE /api/auth/me/avatar
// @access  Private
const removeAvatar = async (req, res, next) => {
  const log = rootLogger.child({ userId: req.user.id });

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.avatarPublicId) {
      return res.json({ message: 'No avatar to remove.', avatar: null });
    }

    try {
      await deleteFromCloudinary(user.avatarPublicId);
    } catch (err) {
      log.warn({ err: err.message }, 'Failed to delete avatar from Cloudinary');
    }

    user.avatar = null;
    user.avatarPublicId = null;
    await user.save();

    log.info('Avatar removed');
    return res.json({ message: 'Avatar removed.', avatar: null });
  } catch (error) {
    next(error);
  }
};

module.exports = { uploadAvatar, removeAvatar };
