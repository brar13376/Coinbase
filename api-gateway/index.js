const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const ExpressBrute = require('express-brute');
const RedisStore = require('express-brute-redis');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const redis = require('redis');
const jwt = require('jsonwebtoken');
const winston = require('winston');
require('dotenv').config();

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/gateway.log' })
  ]
});

// Redis client for caching and rate limiting
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => logger.error('Redis Client Error:', err));
redisClient.connect();

// Express Brute for brute force protection
const bruteStore = new RedisStore({
  client: redisClient
});

const bruteForce = new ExpressBrute(bruteStore, {
  freeRetries: 5,
  minWait: 5 * 60 * 1000, // 5 minutes
  maxWait: 15 * 60 * 1000, // 15 minutes
  lifetime: 24 * 60 * 60, // 24 hours
  refreshOnRequest: false
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

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Compression
app.use(compression());

// Logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  store: new rateLimit.MemoryStore()
});

app.use(limiter);

// Slow down repeated requests
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 100, // allow 100 requests per 15 minutes, then...
  delayMs: 500 // begin adding 500ms of delay per request above 100
});

app.use(speedLimiter);

// JWT verification middleware
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Token verification failed:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Admin role verification
const verifyAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Service discovery and routing
const services = {
  auth: {
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:5001',
    paths: ['/api/auth/*']
  },
  users: {
    url: process.env.USER_SERVICE_URL || 'http://localhost:5002',
    paths: ['/api/users/*']
  },
  orders: {
    url: process.env.ORDER_SERVICE_URL || 'http://localhost:5003',
    paths: ['/api/trading/*']
  },
  wallets: {
    url: process.env.WALLET_SERVICE_URL || 'http://localhost:5004',
    paths: ['/api/wallets/*']
  },
  marketData: {
    url: process.env.MARKET_DATA_SERVICE_URL || 'http://localhost:5005',
    paths: ['/api/market-data/*']
  },
  kyc: {
    url: process.env.KYC_SERVICE_URL || 'http://localhost:5006',
    paths: ['/api/kyc/*']
  },
  fiat: {
    url: process.env.FIAT_SERVICE_URL || 'http://localhost:5007',
    paths: ['/api/fiat/*']
  },
  admin: {
    url: process.env.ADMIN_SERVICE_URL || 'http://localhost:5008',
    paths: ['/api/admin/*']
  },
  notifications: {
    url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5009',
    paths: ['/api/notifications/*']
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: Object.keys(services)
  });
});

// API Documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Coinbase Clone API',
      version: '1.0.0',
      description: 'Cryptocurrency Exchange Platform API'
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./routes/*.js']
};

const specs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Public routes (no authentication required)
app.use('/api/auth', createProxyMiddleware({
  target: services.auth.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/auth': '/api/auth'
  },
  onError: (err, req, res) => {
    logger.error('Auth service error:', err);
    res.status(503).json({ error: 'Auth service unavailable' });
  }
}));

// Protected routes (authentication required)
app.use('/api/users', verifyToken, createProxyMiddleware({
  target: services.users.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/users': '/api/users'
  },
  onError: (err, req, res) => {
    logger.error('User service error:', err);
    res.status(503).json({ error: 'User service unavailable' });
  }
}));

app.use('/api/trading', verifyToken, createProxyMiddleware({
  target: services.orders.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/trading': '/api/trading'
  },
  onError: (err, req, res) => {
    logger.error('Order service error:', err);
    res.status(503).json({ error: 'Order service unavailable' });
  }
}));

app.use('/api/wallets', verifyToken, createProxyMiddleware({
  target: services.wallets.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/wallets': '/api/wallets'
  },
  onError: (err, req, res) => {
    logger.error('Wallet service error:', err);
    res.status(503).json({ error: 'Wallet service unavailable' });
  }
}));

app.use('/api/market-data', createProxyMiddleware({
  target: services.marketData.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/market-data': '/api/market-data'
  },
  onError: (err, req, res) => {
    logger.error('Market data service error:', err);
    res.status(503).json({ error: 'Market data service unavailable' });
  }
}));

app.use('/api/kyc', verifyToken, createProxyMiddleware({
  target: services.kyc.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/kyc': '/api/kyc'
  },
  onError: (err, req, res) => {
    logger.error('KYC service error:', err);
    res.status(503).json({ error: 'KYC service unavailable' });
  }
}));

app.use('/api/fiat', verifyToken, createProxyMiddleware({
  target: services.fiat.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/fiat': '/api/fiat'
  },
  onError: (err, req, res) => {
    logger.error('Fiat service error:', err);
    res.status(503).json({ error: 'Fiat service unavailable' });
  }
}));

// Admin routes (admin role required)
app.use('/api/admin', verifyToken, verifyAdmin, createProxyMiddleware({
  target: services.admin.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/admin': '/api/admin'
  },
  onError: (err, req, res) => {
    logger.error('Admin service error:', err);
    res.status(503).json({ error: 'Admin service unavailable' });
  }
}));

app.use('/api/notifications', verifyToken, createProxyMiddleware({
  target: services.notifications.url,
  changeOrigin: true,
  pathRewrite: {
    '^/api/notifications': '/api/notifications'
  },
  onError: (err, req, res) => {
    logger.error('Notification service error:', err);
    res.status(503).json({ error: 'Notification service unavailable' });
  }
}));

// Brute force protection for sensitive endpoints
app.use('/api/auth/login', bruteForce.prevent);
app.use('/api/auth/register', bruteForce.prevent);
app.use('/api/auth/forgot-password', bruteForce.prevent);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Gateway error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    requestId: req.id
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  logger.info(`Services configured: ${Object.keys(services).join(', ')}`);
});

module.exports = app;