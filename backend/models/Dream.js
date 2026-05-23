const mongoose = require('mongoose');

const DreamSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  inputType: {
    type: String,
    enum: ['text', 'audio'],
    required: true
  },
  rawTranscript: {
    type: String,
    required: true
  },
  audioPath: {
    type: String,
    default: null
  },
  audioDuration: {
    type: Number,
    default: null
  },

  analysis: {
    title: { type: String, default: null },
    summary: { type: String, default: null },
    psychologicalInterpretation: { type: String, default: null },
    cinematicDescription: { type: String, default: null },
    dominantTheme: { type: String, default: null },
    environment: { type: String, default: null },
    mood: { type: String, default: null }
  },

  emotions: [{
    label: { type: String, required: true },
    score: { type: Number, required: true }
  }],
  dominantEmotion: {
    type: String,
    index: true,
    default: null
  },
  emotionalIntensity: {
    type: Number,
    default: null
  },

  symbols: [{
    label: { type: String, required: true },
    score: { type: Number, required: true }
  }],

  // 384-dimensional embedding, excluded by default from queries to satisfy security & bandwidth specs.
  embedding: {
    type: [Number],
    select: false
  },

  relatedDreams: [{
    dreamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dream' },
    similarity: Number,
    title: String
  }],

  // User-supplied dream metadata, captured on the record form. Independent
  // of any ML-derived field — these are subjective labels the dreamer
  // attaches and can later filter / search by.
  tags: {
    type: [String],
    default: [],
    set: (arr) => Array.isArray(arr)
      ? Array.from(new Set(arr.map((t) => String(t).trim().toLowerCase()).filter(Boolean)))
      : [],
    index: true
  },
  isLucid: {
    type: Boolean,
    default: false,
    index: true
  },
  isRecurring: {
    type: Boolean,
    default: false,
    index: true
  },
  isNightmare: {
    type: Boolean,
    default: false,
    index: true
  },

  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'complete', 'failed'],
    default: 'pending',
    index: true
  },
  processingError: {
    type: String,
    default: null
  },

  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound/extra indexes for performance
DreamSchema.index({ userId: 1, createdAt: -1 });

DreamSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Dream', DreamSchema);
