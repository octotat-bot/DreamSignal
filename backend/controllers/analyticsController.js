const mongoose = require('mongoose');
const Dream = require('../models/Dream');
const Pattern = require('../models/Pattern');

// @desc    Get aggregated patterns dashboard data (lazy computes if not found)
// @route   GET /api/analytics/patterns
// @access  Private
const getPatterns = async (req, res, next) => {
  try {
    let pattern = await Pattern.findOne({ userId: req.user.id });
    
    if (!pattern) {
      // Proactively compute patterns on demand
      const { recomputePatterns } = require('./dreamController');
      await recomputePatterns(req.user.id);
      pattern = await Pattern.findOne({ userId: req.user.id });
    }

    return res.json(pattern || {
      userId: req.user.id,
      symbolFrequency: [],
      emotionTrends: [],
      dominantEmotionHistory: [],
      totalDreams: 0,
      lastUpdated: new Date()
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get chronological emotion timeline data for the last 30 dreams
// @route   GET /api/analytics/timeline
// @access  Private
const getTimeline = async (req, res, next) => {
  try {
    const dreams = await Dream.find({ userId: req.user.id, processingStatus: 'complete' })
      .sort({ createdAt: -1 })
      .limit(30)
      .select('createdAt dominantEmotion analysis.title emotionalIntensity');

    const timeline = dreams.map(d => ({
      date: d.createdAt,
      dominantEmotion: d.dominantEmotion || 'neutral',
      title: d.analysis?.title || 'Untitled Dream',
      emotionalIntensity: d.emotionalIntensity || 0.0
    })).reverse(); // chronologically ordered (oldest first for line charts)

    return res.json(timeline);
  } catch (error) {
    next(error);
  }
};

// @desc    Get symbol occurrences counts and percentages
// @route   GET /api/analytics/symbols
// @access  Private
const getSymbols = async (req, res, next) => {
  try {
    const symbolAgg = await Dream.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user.id), processingStatus: 'complete' } },
      { $unwind: '$symbols' },
      {
        $group: {
          _id: '$symbols.label',
          count: { $sum: 1 },
          averageConfidence: { $avg: '$symbols.score' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    return res.json(symbolAgg.map(s => ({
      label: s._id,
      count: s.count,
      averageConfidence: parseFloat(s.averageConfidence.toFixed(4))
    })));
  } catch (error) {
    next(error);
  }
};

// @desc    Get average emotional intensity grouped by dominant emotion type
// @route   GET /api/analytics/emotions
// @access  Private
const getEmotions = async (req, res, next) => {
  try {
    const emotionAgg = await Dream.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user.id), processingStatus: 'complete' } },
      {
        $group: {
          _id: '$dominantEmotion',
          averageIntensity: { $avg: '$emotionalIntensity' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    return res.json(emotionAgg.map(e => ({
      emotion: e._id || 'unknown',
      averageIntensity: parseFloat((e.averageIntensity || 0).toFixed(4)),
      count: e.count
    })));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPatterns,
  getTimeline,
  getSymbols,
  getEmotions
};
