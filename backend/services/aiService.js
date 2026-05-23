const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Sends audio to FastAPI for transcription.
 * Implements 60s timeout and up to 2 retries on failure.
 */
const transcribeAudio = async (filePath, attempt = 1) => {
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const response = await axios.post(`${AI_SERVICE_URL}/transcribe`, form, {
      headers: form.getHeaders(),
      timeout: 60000 // 60 seconds timeout
    });

    return response.data;
  } catch (error) {
    console.error(`Transcription attempt ${attempt} failed:`, error.message);
    if (attempt <= 2) {
      console.log(`Retrying transcription... Attempt ${attempt + 1}`);
      return transcribeAudio(filePath, attempt + 1);
    }
    throw new Error(error.response?.data?.detail || 'Audio transcription pipeline failed after 3 attempts.');
  }
};

/**
 * Sends transcript and historical embeddings to FastAPI for analysis.
 * Timeout: 50 seconds.
 */
const analyzeDream = async (transcript, dreamId, userId, existingEmbeddings = []) => {
  try {
    const payload = {
      transcript,
      dream_id: dreamId.toString(),
      user_id: userId.toString(),
      existing_embeddings: existingEmbeddings.map(e => ({
        dream_id: e._id.toString(),
        embedding: e.embedding,
        title: e.analysis?.title || 'Untitled'
      }))
    };

    const response = await axios.post(`${AI_SERVICE_URL}/analyze`, payload, {
      timeout: 50000 // 50 seconds timeout
    });

    return response.data;
  } catch (error) {
    console.error('Dream analysis request failed:', error.message);
    throw new Error(error.response?.data?.detail || 'Dream analysis pipeline failed.');
  }
};

module.exports = {
  transcribeAudio,
  analyzeDream
};
