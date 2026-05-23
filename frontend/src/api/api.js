import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Automatically inject JWT token from localStorage into headers of every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('dream_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// API Endpoints Mapping
export const authAPI = {
  signup: async (userData) => {
    const response = await api.post('/auth/signup', userData);
    return response.data;
  },
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  }
};

export const dreamsAPI = {
  createDream: async (formData) => {
    // Expects FormData object containing 'inputType', 'transcript' or 'audio'
    const response = await api.post('/dreams', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  getDreams: async (params = {}) => {
    // params can contain: page, limit, emotion, symbol, search, sortBy
    const response = await api.get('/dreams', { params });
    return response.data;
  },
  getDreamDetail: async (id) => {
    const response = await api.get(`/dreams/${id}`);
    return response.data;
  },
  deleteDream: async (id) => {
    const response = await api.delete(`/dreams/${id}`);
    return response.data;
  },
  getDreamStatus: async (id) => {
    const response = await api.get(`/dreams/status/${id}`);
    return response.data;
  }
};

export const analyticsAPI = {
  getPatterns: async () => {
    const response = await api.get('/analytics/patterns');
    return response.data;
  },
  getTimeline: async () => {
    const response = await api.get('/analytics/timeline');
    return response.data;
  },
  getSymbols: async () => {
    const response = await api.get('/analytics/symbols');
    return response.data;
  },
  getEmotions: async () => {
    const response = await api.get('/analytics/emotions');
    return response.data;
  }
};

export default api;
