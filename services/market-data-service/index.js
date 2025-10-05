const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const { initializeKafka } = require('./services/kafkaService');
const { initializeRedis } = require('./services/redisService');
const { initializeMarketDataProviders } = require('./services/marketDataProviders');
const winston = require('winston');
require('dotenv').config();

const marketDataRoutes = require('./routes/marketData');

// Logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/market-data-service.log' })
  ]
});

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ["GET", "POST"]
  }
});

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
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
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
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/coinbase-clone-market-data', {
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

// Initialize market data providers
initializeMarketDataProviders(io);

// Routes
app.use('/api/market-data', marketDataRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'market-data-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  // Join market data room
  socket.on('join-market-data', (pairs) => {
    if (Array.isArray(pairs)) {
      pairs.forEach(pair => {
        socket.join(`market-${pair}`);
      });
    } else {
      socket.join(`market-${pairs}`);
    }
    logger.info(`Client ${socket.id} joined market data for: ${pairs}`);
  });
  
  // Leave market data room
  socket.on('leave-market-data', (pairs) => {
    if (Array.isArray(pairs)) {
      pairs.forEach(pair => {
        socket.leave(`market-${pair}`);
      });
    } else {
      socket.leave(`market-${pairs}`);
    }
    logger.info(`Client ${socket.id} left market data for: ${pairs}`);
  });
  
  // Join user-specific room for personal updates
  socket.on('join-user-room', (userId) => {
    socket.join(`user-${userId}`);
    logger.info(`Client ${socket.id} joined user room: ${userId}`);
  });
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Market data service error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    service: 'market-data-service'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5005;

server.listen(PORT, () => {
  logger.info(`Market data service running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;