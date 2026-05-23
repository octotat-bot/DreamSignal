const express = require('express');
const router = express.Router();
const {
  getPatterns,
  getTimeline,
  getSymbols,
  getEmotions
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Secure all analytics endpoints

router.get('/patterns', getPatterns);
router.get('/timeline', getTimeline);
router.get('/symbols', getSymbols);
router.get('/emotions', getEmotions);

module.exports = router;
