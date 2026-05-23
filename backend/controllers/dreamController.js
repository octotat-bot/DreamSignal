const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Dream = require('../models/Dream');
const User = require('../models/User');
const Pattern = require('../models/Pattern');
const aiService = require('../services/aiService');
const dreamEvents = require('../services/dreamEvents');
const dreamQueue = require('../services/dreamQueue');
const rootLogger = require('../services/logger').child({ scope: 'dreamController' });
const { CreateDreamRequest } = require('../../shared/contracts');

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

    rootLogger.debug({ userId }, 'Recomputed analytics patterns');
  } catch (error) {
    rootLogger.error({ userId, err: error.message }, 'Failed to recompute patterns');
  }
};

/**
 * Async processing pipeline run in the background (fire-and-forget).
 * `requestId` is forwarded from the originating HTTP request so log lines
 * here can be grep-correlated with the createDream handler that started us.
 */
const processDream = async (dreamId, userId, file, requestId = null) => {
  const log = rootLogger.child({ dreamId: String(dreamId), userId: String(userId), requestId });
  let audioTempPath = file ? file.path : null;
  let finalAudioPath = null;

  try {
    // 1. Set status to processing
    await Dream.findByIdAndUpdate(dreamId, { processingStatus: 'processing' });
    dreamEvents.emit(dreamId, { stage: 'started', processingStatus: 'processing' });

    let transcript = '';
    let duration = null;

    // 2. If audio, call FastAPI /transcribe
    if (audioTempPath) {
      log.info('Transcribing audio');
      dreamEvents.emit(dreamId, { stage: 'transcribing', processingStatus: 'processing' });
      const transcriptionResult = await aiService.transcribeAudio(audioTempPath, { requestId, log });
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
    dreamEvents.emit(dreamId, { stage: 'transcribed', processingStatus: 'processing' });

    // 3. Fetch user's completed dreams with embeddings for similarity search
    const existingDreams = await Dream.find({
      userId,
      processingStatus: 'complete',
      _id: { $ne: dreamId }
    }).select('+embedding _id embedding analysis.title');

    // 4. Send transcript and embeddings to FastAPI for analysis
    log.info('Analyzing dream elements');
    dreamEvents.emit(dreamId, { stage: 'analyzing', processingStatus: 'processing' });
    const analysisResult = await aiService.analyzeDream(transcript, dreamId, userId, existingDreams, { requestId, log });
    dreamEvents.emit(dreamId, { stage: 'analyzed', processingStatus: 'processing' });

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
      imagePath: analysisResult.imagePath || null,
      relatedDreams: analysisResult.relatedDreams.map(r => ({
        dreamId: r.dreamId,
        similarity: r.similarity,
        title: r.title
      })),
      processingStatus: 'complete'
    });

    log.info('Dream processing completed');
    dreamEvents.emit(dreamId, { stage: 'archived', processingStatus: 'complete' });

    // 6. Recompute patterns
    await recomputePatterns(userId);

  } catch (error) {
    log.error({ err: error.message }, 'Pipeline execution failed');

    // Set status to failed and save error message
    await Dream.findByIdAndUpdate(dreamId, {
      processingStatus: 'failed',
      processingError: error.message || 'Dream processing pipeline failed.'
    });
    dreamEvents.emit(dreamId, {
      stage: 'failed',
      processingStatus: 'failed',
      processingError: error.message || 'Dream processing pipeline failed.',
    });

    // Cleanup temp audio file if error occurs and file exists
    if (audioTempPath && fs.existsSync(audioTempPath)) {
      try {
        fs.unlinkSync(audioTempPath);
      } catch (cleanupErr) {
        log.warn({ err: cleanupErr.message }, 'Failed to delete temp audio on crash');
      }
    }
  }
};

// @desc    Submit a new dream (text or audio)
// @route   POST /api/dreams
// @access  Private
const createDream = async (req, res, next) => {
  try {
    // Validate body against the shared Zod contract. Multer handles the
    // file shape separately; we only enforce that an audio submission
    // is accompanied by a file.
    const parsed = CreateDreamRequest.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || 'Invalid dream submission payload';
      return res.status(400).json({ message });
    }
    const { inputType, tags, isLucid, isRecurring, isNightmare } = parsed.data;
    const transcript = parsed.data.transcript;
    const file = req.file;

    if (inputType === 'audio' && !file) {
      return res.status(400).json({ message: 'Audio file is required for audio submission' });
    }

    // 1. Create initial dream doc
    const newDream = new Dream({
      userId: req.user.id,
      inputType,
      rawTranscript: inputType === 'text' ? transcript.trim() : 'Processing voice recording...',
      tags: tags || [],
      isLucid: !!isLucid,
      isRecurring: !!isRecurring,
      isNightmare: !!isNightmare,
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

    // 4. Hand off to BullMQ when Redis is available, otherwise the queue
    //    transparently falls back to inline fire-and-forget execution.
    dreamQueue
      .enqueueDream(newDream._id, req.user.id, file, req.id)
      .catch((err) => {
        rootLogger.error(
          { err: err.message, dreamId: String(newDream._id) },
          'Failed to enqueue dream pipeline'
        );
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
    const { emotion, symbol, search, sortBy, tag, lucid, recurring, nightmare } = req.query;

    const query = { userId: req.user.id };

    // Emotion filter
    if (emotion) {
      query.dominantEmotion = emotion.toLowerCase();
    }

    // Symbol filter
    if (symbol) {
      query['symbols.label'] = symbol.toLowerCase();
    }

    // Tag filter — accepts a single tag or comma-separated list (matches any)
    if (tag) {
      const tags = String(tag)
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      if (tags.length === 1) query.tags = tags[0];
      else if (tags.length > 1) query.tags = { $in: tags };
    }

    // Subjective attribute filters
    const isTruthy = (v) => v === 'true' || v === '1' || v === true;
    if (lucid !== undefined)     query.isLucid     = isTruthy(lucid);
    if (recurring !== undefined) query.isRecurring = isTruthy(recurring);
    if (nightmare !== undefined) query.isNightmare = isTruthy(nightmare);

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
          rootLogger.warn({ err: unlinkErr.message, audioFilePath }, 'Failed to unlink audio file');
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

// @desc    Export the authenticated user's full dream archive as a single
//          JSON dossier. Mirrors the Dream documents but strips the heavy
//          384-dim embedding vectors and adds a small metadata header.
// @route   GET /api/dreams/export
// @access  Private
const exportDreams = async (req, res, next) => {
  try {
    const dreams = await Dream.find({ userId: req.user.id })
      .select('-embedding -__v')
      .sort({ createdAt: 1 })
      .lean();

    const payload = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      userId: req.user.id,
      totalDreams: dreams.length,
      dreams,
    };

    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="dreamsignal-archive-${stamp}.json"`
    );
    return res.send(JSON.stringify(payload, null, 2));
  } catch (error) {
    next(error);
  }
};

// @desc    Server-Sent Events stream of dream processing stage transitions.
//          Falls back to polling the existing status endpoint if the EventSource
//          fails. Authenticated via the existing protect middleware that also
//          accepts `?token=` query for EventSource compatibility.
// @route   GET /api/dreams/events/:id
// @access  Private
const streamDreamEvents = async (req, res, next) => {
  try {
    const dream = await Dream.findById(req.params.id).select('processingStatus processingError userId');
    if (!dream) return res.status(404).end();
    if (dream.userId.toString() !== req.user.id) return res.status(403).end();

    // SSE headers — disable any buffering proxies in the path.
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders?.();

    const send = (payload) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    // Emit current state immediately so the UI doesn't sit blank if it
    // subscribed late (e.g. the dream is already mid-processing or done).
    const initialStage =
      dream.processingStatus === 'complete' ? 'archived'
      : dream.processingStatus === 'failed' ? 'failed'
      : dream.processingStatus === 'processing' ? 'started'
      : 'pending';
    send({
      stage: initialStage,
      processingStatus: dream.processingStatus,
      processingError: dream.processingError || null,
      dreamId: String(dream._id),
      timestamp: new Date().toISOString(),
    });

    // If the dream is already terminal, close right away.
    if (dream.processingStatus === 'complete' || dream.processingStatus === 'failed') {
      return res.end();
    }

    const unsubscribe = dreamEvents.subscribe(req.params.id, (payload) => {
      send(payload);
      if (payload.processingStatus === 'complete' || payload.processingStatus === 'failed') {
        unsubscribe();
        res.end();
      }
    });

    // Heartbeat every 25s so intermediate proxies don't kill an idle stream.
    const heartbeat = setInterval(() => res.write(': keep-alive\n\n'), 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
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
      dreamId: dream._id.toString(),
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
  streamDreamEvents,
  exportDreams,
  recomputePatterns // Exported if needed by other routes
};
