const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const rootLogger = require('./logger').child({ scope: 'aiService' });

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Sends audio to FastAPI for transcription.
 * Implements 60s timeout and up to 2 retries on failure.
 *
 * @param {string} filePath
 * @param {object} [opts]
 * @param {string} [opts.requestId]  Forwarded as x-request-id so the AI
 *   service can correlate its logs with the originating HTTP request.
 * @param {object} [opts.log]        Optional pino logger (e.g. req.log).
 */
const transcribeAudio = async (filePath, opts = {}, attempt = 1) => {
  const { requestId, log = rootLogger } = opts;
  try {
    const form = new FormData();
    const originalName = path.basename(filePath);
    form.append('file', fs.createReadStream(filePath), originalName);

    const headers = { ...form.getHeaders() };
    if (requestId) headers['x-request-id'] = requestId;

    const response = await axios.post(`${AI_SERVICE_URL}/transcribe`, form, {
      headers,
      timeout: 60000, // 60 seconds timeout
    });

    return response.data;
  } catch (error) {
    const status = error.response?.status;
    const detail = error.response?.data?.detail;
    const detailText = typeof detail === 'string'
      ? detail
      : Array.isArray(detail)
        ? detail.map((d) => d.msg || d.message || JSON.stringify(d)).join('; ')
        : detail?.message || error.message;

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      log.error({ attempt, err: error.message, AI_SERVICE_URL }, 'AI service unreachable');
      throw new Error('Voice transcription service is offline. Start the AI service (port 8000) and try again.');
    }

    log.warn({ attempt, status, err: detailText }, 'Transcription attempt failed');
    if (attempt <= 2) {
      log.info({ nextAttempt: attempt + 1 }, 'Retrying transcription');
      return transcribeAudio(filePath, opts, attempt + 1);
    }
    throw new Error(detailText || 'Audio transcription pipeline failed after 3 attempts.');
  }
};

/**
 * Sends transcript and historical embeddings to FastAPI for analysis.
 * Timeout: 50 seconds.
 */
const analyzeDream = async (transcript, dreamId, userId, existingEmbeddings = [], opts = {}) => {
  const { requestId, log = rootLogger } = opts;
  try {
    const payload = {
      transcript,
      dream_id: dreamId.toString(),
      user_id: userId.toString(),
      existing_embeddings: existingEmbeddings.map((e) => ({
        dream_id: e._id.toString(),
        embedding: e.embedding,
        title: e.analysis?.title || 'Untitled',
      })),
    };

    const headers = {};
    if (requestId) headers['x-request-id'] = requestId;

    const response = await axios.post(`${AI_SERVICE_URL}/analyze`, payload, {
      timeout: 50000, // 50 seconds timeout
      headers,
    });

    return response.data;
  } catch (error) {
    log.error({ err: error.message }, 'Dream analysis request failed');
    throw new Error(error.response?.data?.detail || 'Dream analysis pipeline failed.');
  }
};

module.exports = {
  transcribeAudio,
  analyzeDream,
};
