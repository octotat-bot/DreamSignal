const mongoose = require('mongoose');

const PatternSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  symbolFrequency: [{
    label: { type: String, required: true },
    count: { type: Number, required: true },
    percentage: { type: Number, required: true }
  }],
  emotionTrends: [{
    label: { type: String, required: true },
    averageScore: { type: Number, required: true },
    dreamCount: { type: Number, required: true }
  }],
  dominantEmotionHistory: [{
    emotion: { type: String, required: true },
    date: { type: Date, required: true }
  }],
  totalDreams: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Pattern', PatternSchema);
