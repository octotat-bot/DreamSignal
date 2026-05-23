const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Resolve path to storage folders
const tempDir = path.join(__dirname, '../../storage/temp');
const audioDir = path.join(__dirname, '../../storage/audio');

// Double check storage folder presence
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

// Multer storage engine configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    // Save file as a UUID.ext for anonymity & safety
    cb(null, `${uuidv4()}${ext}`);
  }
});

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
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB limit
  }
});

module.exports = upload;
