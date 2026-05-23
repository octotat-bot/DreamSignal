const express = require('express');
const router = express.Router();
const {
  createDream,
  getDreams,
  getDreamById,
  deleteDream,
  getDreamStatus,
  streamDreamEvents,
  exportDreams
} = require('../controllers/dreamController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.use(protect); // All dream routes are protected

// POST /api/dreams - Create a new dream note (supports multipart form for audio upload)
router.post('/', (req, res, next) => {
  upload.single('audio')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'Audio upload failed' });
    }
    next();
  });
}, createDream);

// GET /api/dreams/export - Download the entire archive as JSON
router.get('/export', exportDreams);

// GET /api/dreams - Query paginated lists of dreams
router.get('/', getDreams);

// GET /api/dreams/events/:id - SSE stream of processing stage transitions
router.get('/events/:id', streamDreamEvents);

// GET /api/dreams/status/:id - Poll processing status (legacy fallback)
router.get('/status/:id', getDreamStatus);

// GET /api/dreams/:id - Fetch dream details
router.get('/:id', getDreamById);

// DELETE /api/dreams/:id - Archive/delete a dream note
router.delete('/:id', deleteDream);

module.exports = router;
