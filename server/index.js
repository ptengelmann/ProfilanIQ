require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');

// Import routes
const profileRoute = require('./routes/profile');

// Import Advanced Logger
const AdvancedLogger = require('./utils/AdvancedLogger');
const logger = new AdvancedLogger();

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Security and Performance Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());
app.use(limiter);

// Request ID and logger middleware
app.use((req, res, next) => {
  req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  req.logger = logger;
  req.startTime = Date.now();
  next();
});

// Enhanced request logging
app.use((req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    const duration = Date.now() - req.startTime;
    logger.info('Request completed', {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      contentLength: data ? data.length : 0
    });
    
    originalSend.call(this, data);
  };
  
  next();
});

// CORS Configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing with enhanced limits
app.use(express.json({ 
  limit: '50mb',
  verify: (req, res, buf, encoding) => {
    if (buf && buf.length) {
      req.rawBody = buf.toString(encoding || 'utf8');
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Morgan for HTTP request logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Health check route
app.get('/api/health', (req, res) => {
  logger.info('Health check requested', { requestId: req.requestId });
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '2.1.0', // Updated version for enhanced logging
    environment: process.env.NODE_ENV || 'development',
    memory: process.memoryUsage(),
    requestId: req.requestId
  });
});

// API Routes
app.use('/api/profile', profileRoute);

// 404 handler
app.use('*', (req, res) => {
  logger.warn('Route not found', {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip
  });
  
  res.status(404).json({
    error: 'Route not found',
    message: `The endpoint ${req.method} ${req.originalUrl} does not exist`,
    availableEndpoints: [
      'GET /api/health',
      'POST /api/profile'
    ],
    requestId: req.requestId
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error('Unhandled error', {
    requestId: req.requestId,
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  res.status(error.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    requestId: req.requestId,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close((err) => {
    if (err) {
      logger.error('Error during graceful shutdown', { error: err.message });
      process.exit(1);
    }
    
    logger.info('Server closed successfully');
    process.exit(0);
  });
  
  setTimeout(() => {
    logger.error('Forcefully shutting down server');
    process.exit(1);
  }, 10000);
};

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  logger.info('='.repeat(60));
  logger.info('🚀 ProfilanIQ Server Started Successfully');
  logger.info('='.repeat(60));
  logger.info(`📍 Server: http://localhost:${PORT}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`📊 API Endpoints:`);
  logger.info(`   GET  /api/health - Health check`);
  logger.info(`   POST /api/profile - CSV profiling`);
  logger.info(`💾 Max Upload: 50MB`);
  logger.info(`📁 Logs Directory: ${path.join(__dirname, 'logs')}`);
  logger.info('='.repeat(60));
});

// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason: reason.toString(), promise: promise.toString() });
  process.exit(1);
});

module.exports = app;