const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const { initializeKafka } = require('./services/kafkaService');
const { initializeRedis } = require('./services/redisService');
const winston = require('winston');
require('dotenv').config();

const adminRoutes = require('./routes/admin');
const rbacRoutes = require('./routes/rbac');
const credentialsRoutes = require('./routes/credentials');
const monitoringRoutes = require('./routes/monitoring');

// Logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/admin-service.log' })
  ]
});

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/coinbase-clone-admin', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  logger.info('Connected to MongoDB');
})
.catch((error) => {
  logger.error('MongoDB connection error:', error);
  process.exit(1);
});

// Initialize Redis
initializeRedis();

// Initialize Kafka
initializeKafka();

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/rbac', rbacRoutes);
app.use('/api/credentials', credentialsRoutes);
app.use('/api/monitoring', monitoringRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'admin-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Admin service error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    service: 'admin-service'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5008;

app.listen(PORT, () => {
  logger.info(`Admin service running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;