require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const dreamRoutes = require('./routes/dreamRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const errorHandler = require('./middleware/errorMiddleware');

const app = express();

// Connect to MongoDB Database
connectDB();

// Security HTTP Headers
app.use(helmet());

// Logging Middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// CORS configuration (Limit origin to React Dev server)
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

// Request body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static storage folder (for audio files playback)
app.use('/storage', express.static(path.join(__dirname, '../storage')));

// Rate Limiter: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { message: 'Too many requests from this IP, please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', limiter);

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/dreams', dreamRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 Route handler
app.use((req, res, next) => {
  res.status(404);
  next(new Error(`Not Found - ${req.originalUrl}`));
});

// Global Error Handler Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Express server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
