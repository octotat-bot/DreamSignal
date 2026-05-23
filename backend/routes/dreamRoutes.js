const express = require('express');
const router = express.Router();
const {
  createDream,
  getDreams,
  getDreamById,
  deleteDream,
  getDreamStatus
} = require('../controllers/dreamController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.use(protect); // All dream routes are protected

// POST /api/dreams - Create a new dream note (supports multipart form for audio upload)
router.post('/', upload.single('audio'), createDream);

// GET /api/dreams - Query paginated lists of dreams
router.get('/', getDreams);

// GET /api/dreams/status/:id - Poll processing status for background tasks
router.get('/status/:id', getDreamStatus);

// GET /api/dreams/:id - Fetch dream details
router.get('/:id', getDreamById);

// DELETE /api/dreams/:id - Archive/delete a dream note
router.delete('/:id', deleteDream);

module.exports = router;
