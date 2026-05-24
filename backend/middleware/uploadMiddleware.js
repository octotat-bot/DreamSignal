const multer = require('multer');
const path = require('path');
const { uploadToCloudinary } = require('../config/cloudinary');
const rootLogger = require('../services/logger').child({ scope: 'uploadMiddleware' });

// ─────────────────────────────────────────────────────────────────────────────
// Multer — memory storage. The buffer is streamed straight to Cloudinary;
// no local temp files are written.
// ─────────────────────────────────────────────────────────────────────────────
const memoryStorage = multer.memoryStorage();

// Enforce extension OR mimetype validation. Browsers are inconsistent —
// Chrome often labels audio-only webm as video/webm, Safari records mp4
// but may still attach a .webm filename. Reject only when both signals
// look wrong.
const fileFilter = (req, file, cb) => {
  const allowedExts = ['.wav', '.mp3', '.webm', '.ogg', '.m4a'];
  const ext = path.extname(file.originalname).toLowerCase();

  const allowedMimeTypes = [
    'audio/wav',
    'audio/x-wav',
    'audio/wave',
    'audio/vnd.wave',
    'audio/mp3',
    'audio/mpeg',
    'audio/webm',
    'video/webm',
    'audio/ogg',
    'application/ogg',
    'video/ogg',
    'audio/mp4',
    'video/mp4',
    'audio/x-m4a',
    'audio/m4a',
  ];

  const extValid = allowedExts.includes(ext);
  const mimeValid = allowedMimeTypes.includes((file.mimetype || '').toLowerCase());

  if (extValid || mimeValid) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file format. Allowed: wav, mp3, webm, ogg, m4a. Received ext=${ext || 'none'}, mime=${file.mimetype || 'none'}`), false);
  }
};

const upload = multer({
  storage: memoryStorage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB limit
  }
});

/**
 * Combined middleware: multer (memory) → Cloudinary upload_stream.
 *
 * After this middleware runs, `req.file` (if present) has two extra
 * properties:
 *   - `cloudinaryUrl`      — the HTTPS secure_url for the uploaded audio
 *   - `cloudinaryPublicId`  — the public_id needed for future deletion
 *
 * Cloudinary treats audio as resource_type "video".
 */
const audioUpload = (req, res, next) => {
  upload.single('audio')(req, res, async (multerErr) => {
    if (multerErr) {
      const message =
        multerErr.code === 'LIMIT_FILE_SIZE'
          ? 'Audio file must be under 25 MB.'
          : multerErr.message || 'Audio upload failed';
      return res.status(400).json({ message });
    }

    // Text-only submissions — no file to upload
    if (!req.file) return next();

    try {
      const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '') || 'webm';

      const result = await uploadToCloudinary(req.file.buffer, {
        resource_type: 'video',
        folder: 'dreamsignal/audio',
        format: ext,
      });

      req.file.cloudinaryUrl = result.secure_url;
      req.file.cloudinaryPublicId = result.public_id;

      rootLogger.debug(
        { publicId: result.public_id, bytes: result.bytes },
        'Audio uploaded to Cloudinary'
      );

      next();
    } catch (err) {
      rootLogger.error({ err: err.message }, 'Cloudinary audio upload failed');
      return res.status(502).json({
        message: 'Audio upload to cloud storage failed. Please try again.',
      });
    }
  });
};

module.exports = audioUpload;
