const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Dream = require('../models/Dream');
const User = require('../models/User');
const Pattern = require('../models/Pattern');
const aiService = require('../services/aiService');

/**
 * Recomputes pattern statistics for a user.
 */
const recomputePatterns = async (userId) => {
  try {
    const totalDreams = await Dream.countDocuments({ userId, processingStatus: 'complete' });
    
    if (totalDreams === 0) {
      await Pattern.findOneAndUpdate(
        { userId },
        {
          symbolFrequency: [],
          emotionTrends: [],
          dominantEmotionHistory: [],
          totalDreams: 0,
          lastUpdated: new Date()
        },
        { upsert: true, new: true }
      );
      return;
    }

    // Aggregate symbol frequencies
    const symbolAgg = await Dream.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), processingStatus: 'complete' } },
      { $unwind: '$symbols' },
      { $group: { _id: '$symbols.label', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const symbolFrequency = symbolAgg.map(s => ({
      label: s._id,
      count: s.count,
      percentage: parseFloat(((s.count / totalDreams) * 100).toFixed(2))
    }));

    // Aggregate emotion averages
    const emotionAgg = await Dream.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), processingStatus: 'complete' } },
      { $unwind: '$emotions' },
      { $group: { _id: '$emotions.label', averageScore: { $avg: '$emotions.score' }, dreamCount: { $sum: 1 } } }
    ]);

    const emotionTrends = emotionAgg.map(e => ({
      label: e._id,
      averageScore: parseFloat(e.averageScore.toFixed(4)),
      dreamCount: e.dreamCount
    }));

    // Get chronological dominant emotion history
    const historyDreams = await Dream.find({ userId, processingStatus: 'complete' })
      .sort({ createdAt: 1 })
      .select('dominantEmotion createdAt');

    const dominantEmotionHistory = historyDreams
      .filter(d => d.dominantEmotion)
      .map(d => ({
        emotion: d.dominantEmotion,
        date: d.createdAt
      }));

    await Pattern.findOneAndUpdate(
      { userId },
      {
        symbolFrequency,
        emotionTrends,
        dominantEmotionHistory,
        totalDreams,
        lastUpdated: new Date()
      },
      { upsert: true, new: true }
    );

    console.log(`Recomputed analytics patterns successfully for user: ${userId}`);
  } catch (error) {
    console.error(`Failed to recompute patterns for user ${userId}:`, error.message);
  }
};

/**
 * Async processing pipeline run in the background (fire-and-forget)
 */
const processDream = async (dreamId, userId, file) => {
  let audioTempPath = file ? file.path : null;
  let finalAudioPath = null;

  try {
    // 1. Set status to processing
    await Dream.findByIdAndUpdate(dreamId, { processingStatus: 'processing' });

    let transcript = '';
    let duration = null;

    // 2. If audio, call FastAPI /transcribe
    if (audioTempPath) {
      console.log(`Transcribing audio for dream: ${dreamId}...`);
      const transcriptionResult = await aiService.transcribeAudio(audioTempPath);
      transcript = transcriptionResult.transcript;
      duration = transcriptionResult.duration_seconds;

      // Move file from temp to storage/audio
      const ext = path.extname(audioTempPath);
      const audioFilename = `${path.basename(audioTempPath, ext)}${ext}`;
      const targetPath = path.join(__dirname, '../../storage/audio', audioFilename);
      
      fs.renameSync(audioTempPath, targetPath);
      finalAudioPath = `/storage/audio/${audioFilename}`; // relative route path for serving

      // Update transcript in DB
      await Dream.findByIdAndUpdate(dreamId, {
        rawTranscript: transcript,
        audioPath: finalAudioPath,
        audioDuration: duration
      });
    } else {
      // If text input, transcript is already in the document
      const dream = await Dream.findById(dreamId);
      transcript = dream.rawTranscript;
    }

    // 3. Fetch user's completed dreams with embeddings for similarity search
    const existingDreams = await Dream.find({
      userId,
      processingStatus: 'complete',
      _id: { $ne: dreamId }
    }).select('+embedding _id embedding analysis.title');

    // 4. Send transcript and embeddings to FastAPI for analysis
    console.log(`Analyzing dream elements: ${dreamId}...`);
    const analysisResult = await aiService.analyzeDream(transcript, dreamId, userId, existingDreams);

    // 5. Update dream document with results
    await Dream.findByIdAndUpdate(dreamId, {
      analysis: {
        title: analysisResult.analysis.title,
        summary: analysisResult.analysis.summary,
        psychologicalInterpretation: analysisResult.analysis.psychologicalInterpretation,
        cinematicDescription: analysisResult.analysis.cinematicDescription,
        dominantTheme: analysisResult.analysis.dominantTheme,
        environment: analysisResult.analysis.environment,
        mood: analysisResult.analysis.mood
      },
      emotions: analysisResult.emotions,
      dominantEmotion: analysisResult.dominantEmotion,
      emotionalIntensity: analysisResult.emotionalIntensity,
      symbols: analysisResult.symbols,
      embedding: analysisResult.embedding,
      relatedDreams: analysisResult.relatedDreams.map(r => ({
        dreamId: r.dreamId,
        similarity: r.similarity,
        title: r.title
      })),
      processingStatus: 'complete'
    });

    console.log(`Dream processing completed: ${dreamId}`);

    // 6. Recompute patterns
    await recomputePatterns(userId);

  } catch (error) {
    console.error(`Pipeline execution failed for dream: ${dreamId}`, error.message);
    
    // Set status to failed and save error message
    await Dream.findByIdAndUpdate(dreamId, {
      processingStatus: 'failed',
      processingError: error.message || 'Dream processing pipeline failed.'
    });

    // Cleanup temp audio file if error occurs and file exists
    if (audioTempPath && fs.existsSync(audioTempPath)) {
      try {
        fs.unlinkSync(audioTempPath);
      } catch (cleanupErr) {
        console.error('Failed to delete temporary audio file on crash:', cleanupErr.message);
      }
    }
  }
};

// @desc    Submit a new dream (text or audio)
// @route   POST /api/dreams
// @access  Private
const createDream = async (req, res, next) => {
  try {
    const { inputType, transcript } = req.body;
    const file = req.file;

    // Validate inputs
    if (!inputType || !['text', 'audio'].includes(inputType)) {
      return res.status(400).json({ message: 'Valid inputType (text or audio) is required' });
    }

    if (inputType === 'text' && (!transcript || transcript.trim().length < 50)) {
      return res.status(400).json({ message: 'Transcript must be at least 50 characters for text submission' });
    }

    if (inputType === 'audio' && !file) {
      return res.status(400).json({ message: 'Audio file is required for audio submission' });
    }

    // 1. Create initial dream doc
    const newDream = new Dream({
      userId: req.user.id,
      inputType,
      rawTranscript: inputType === 'text' ? transcript.trim() : 'Processing voice recording...',
      processingStatus: 'pending'
    });

    await newDream.save();

    // 2. Increment user dreamCount
    await User.findByIdAndUpdate(req.user.id, { $inc: { dreamCount: 1 } });

    // 3. Respond immediately with 202 Accepted
    res.status(202).json({
      dreamId: newDream._id,
      message: 'Dream analysis processing started successfully'
    });

    // 4. Fire-and-forget background pipeline
    processDream(newDream._id, req.user.id, file).catch(err => {
      console.error('Uncaught background pipeline execution error:', err.message);
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Get user dreams with pagination and filters
// @route   GET /api/dreams
// @access  Private
const getDreams = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { emotion, symbol, search, sortBy } = req.query;

    const query = { userId: req.user.id };

    // Emotion filter
    if (emotion) {
      query.dominantEmotion = emotion.toLowerCase();
    }

    // Symbol filter
    if (symbol) {
      query['symbols.label'] = symbol.toLowerCase();
    }

    // Text search (regex case-insensitive)
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { rawTranscript: searchRegex },
        { 'analysis.title': searchRegex },
        { 'analysis.summary': searchRegex }
      ];
    }

    const skip = (page - 1) * limit;

    // Sorting definition
    let sortObj = { createdAt: -1 }; // default
    if (sortBy === 'emotion') {
      sortObj = { dominantEmotion: 1 };
    }

    const dreams = await Dream.find(query)
      .select('-embedding') // Explicitly project out embedding
      .sort(sortObj)
      .skip(skip)
      .limit(limit);

    const total = await Dream.countDocuments(query);

    return res.json({
      dreams,
      total,
      page,
      pages: Math.ceil(total / limit)
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Get a single dream by ID
// @route   GET /api/dreams/:id
// @access  Private
const getDreamById = async (req, res, next) => {
  try {
    const dream = await Dream.findById(req.id || req.params.id).select('-embedding');
    if (!dream) {
      return res.status(404).json({ message: 'Dream not found' });
    }

    // Forbidden check
    if (dream.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied to this dream resource' });
    }

    return res.json(dream);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a dream
// @route   DELETE /api/dreams/:id
// @access  Private
const deleteDream = async (req, res, next) => {
  try {
    const dream = await Dream.findById(req.params.id);
    if (!dream) {
      return res.status(404).json({ message: 'Dream not found' });
    }

    // Forbidden check
    if (dream.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied to this dream resource' });
    }

    // Delete audio file from storage if present
    if (dream.audioPath) {
      const audioFileRelative = dream.audioPath.replace(/^\/storage\//, '');
      const audioFilePath = path.join(__dirname, '../../storage', audioFileRelative);
      if (fs.existsSync(audioFilePath)) {
        try {
          fs.unlinkSync(audioFilePath);
        } catch (unlinkErr) {
          console.error('Failed to unlink audio file:', unlinkErr.message);
        }
      }
    }

    // Remove from database
    await Dream.findByIdAndDelete(dream._id);

    // Decrement user count
    await User.findByIdAndUpdate(req.user.id, { $inc: { dreamCount: -1 } });

    // Respond first
    res.json({ message: 'Dream archived deletion complete.' });

    // Recompute patterns
    await recomputePatterns(req.user.id);

  } catch (error) {
    next(error);
  }
};

// @desc    Get dream processing status (for polling)
// @route   GET /api/dreams/status/:id
// @access  Private
const getDreamStatus = async (req, res, next) => {
  try {
    const dream = await Dream.findById(req.params.id).select('processingStatus processingError userId');
    if (!dream) {
      return res.status(404).json({ message: 'Dream not found' });
    }

    // Forbidden check
    if (dream.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    return res.json({
      dreamId: dream._id,
      processingStatus: dream.processingStatus,
      processingError: dream.processingError
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createDream,
  getDreams,
  getDreamById,
  deleteDream,
  getDreamStatus,
  recomputePatterns // Exported if needed by other routes
};
