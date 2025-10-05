# 👨‍💻 Developer Guide - Coinbase Clone Exchange

## 🏗️ Architecture Overview

### Microservices Structure
```
┌─────────────────┐    ┌─────────────────┐
│   React Client  │    │  Admin Dashboard│
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          └──────────┬───────────┘
                     │
            ┌────────▼────────┐
            │   API Gateway   │
            └────────┬────────┘
                     │
    ┌───────────────┼───────────────┐
    │               │               │
┌───▼───┐    ┌─────▼─────┐    ┌────▼────┐
│ Auth  │    │   User    │    │  Order  │
│Service│    │ Service   │    │ Service │
└───────┘    └───────────┘    └─────────┘
    │               │               │
    └───────────────┼───────────────┘
                    │
            ┌───────▼───────┐
            │   Databases   │
            │ PostgreSQL   │
            │ MongoDB      │
            │ Redis        │
            └──────────────┘
```

---

## 🚀 Getting Started for Developers

### Prerequisites
- Node.js 18+
- Git
- PostgreSQL 13+
- MongoDB 6.0+
- Redis 6.0+
- Docker (optional)

### Development Setup

#### 1. Clone and Install
```bash
git clone https://github.com/your-username/coinbase-clone.git
cd coinbase-clone
npm run install-all
```

#### 2. Environment Configuration
```bash
cp .env.production .env
# Edit .env with your configuration
```

#### 3. Database Setup
```bash
# Initialize all databases
node database/install-all.js

# Or initialize individually
node database/install.js          # PostgreSQL
node database/mongodb-init.js     # MongoDB
node database/redis-init.js init  # Redis
```

#### 4. Start Development
```bash
# Start all services
npm run dev

# Or start individually
npm run server    # Backend only
npm run client    # Frontend only
```

---

## 📁 Project Structure

```
coinbase-clone/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom hooks
│   │   ├── store/          # State management
│   │   ├── services/       # API services
│   │   └── utils/          # Utility functions
│   └── package.json
├── server/                 # Monolithic backend (legacy)
├── api-gateway/           # API Gateway service
├── services/              # Microservices
│   ├── auth-service/      # Authentication
│   ├── user-service/      # User management
│   ├── order-service/     # Trading orders
│   ├── wallet-service/    # Wallet management
│   ├── market-data-service/ # Market data
│   ├── kyc-service/       # KYC verification
│   ├── fiat-service/      # Fiat transactions
│   ├── admin-service/     # Admin functions
│   ├── notification-service/ # Notifications
│   ├── ledger-service/    # Transaction ledger
│   └── custody-service/   # Asset custody
├── database/              # Database scripts
├── monitoring/            # Monitoring configs
├── nginx/                 # Load balancer config
└── docker-compose.yml     # Docker orchestration
```

---

## 🔧 Development Workflow

### Adding New Features

#### 1. Create Feature Branch
```bash
git checkout -b feature/new-trading-feature
```

#### 2. Implement Backend
```bash
# Add new API endpoint
# File: services/order-service/routes/orders.js
router.post('/api/orders/advanced', (req, res) => {
  // Implementation
});
```

#### 3. Implement Frontend
```bash
# Add new component
# File: client/src/components/AdvancedTrading.js
const AdvancedTrading = () => {
  // Implementation
};
```

#### 4. Add Tests
```bash
# Backend tests
# File: services/order-service/tests/orders.test.js
describe('Advanced Orders', () => {
  it('should create advanced order', async () => {
    // Test implementation
  });
});
```

#### 5. Update Documentation
```bash
# Update API docs
# File: api-gateway/swagger.json
```

### Code Style Guidelines

#### JavaScript/Node.js
```javascript
// Use const/let, not var
const user = await User.findById(id);
let isActive = true;

// Use async/await, not callbacks
async function createOrder(orderData) {
  try {
    const order = await Order.create(orderData);
    return order;
  } catch (error) {
    logger.error('Failed to create order:', error);
    throw error;
  }
}

// Use descriptive variable names
const userAccountBalance = await getAccountBalance(userId);
const isOrderFilled = order.status === 'filled';

// Use JSDoc for functions
/**
 * Creates a new trading order
 * @param {Object} orderData - Order data
 * @param {string} orderData.pair - Trading pair
 * @param {string} orderData.side - Buy or sell
 * @param {number} orderData.quantity - Order quantity
 * @returns {Promise<Object>} Created order
 */
async function createOrder(orderData) {
  // Implementation
}
```

#### React Components
```jsx
// Use functional components with hooks
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'react-query';

const TradingInterface = ({ pair, onOrderCreated }) => {
  const [orderData, setOrderData] = useState({
    side: 'buy',
    quantity: '',
    price: ''
  });

  const { data: marketData } = useQuery(
    ['marketData', pair],
    () => fetchMarketData(pair)
  );

  const createOrderMutation = useMutation(createOrder, {
    onSuccess: (order) => {
      onOrderCreated(order);
      toast.success('Order created successfully!');
    }
  });

  return (
    <div className="trading-interface">
      {/* Component JSX */}
    </div>
  );
};

export default TradingInterface;
```

---

## 🗄️ Database Schema

### PostgreSQL Tables

#### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    kyc_status VARCHAR(20) DEFAULT 'pending',
    account_status VARCHAR(20) DEFAULT 'active',
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Orders Table
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    pair VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell')),
    type VARCHAR(20) NOT NULL,
    quantity DECIMAL(28,18) NOT NULL,
    price DECIMAL(28,18),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### MongoDB Collections

#### Market Data Collection
```javascript
{
  _id: ObjectId,
  pair: "BTC/USD",
  baseCurrency: "BTC",
  quoteCurrency: "USD",
  price: 45000.00,
  priceChange24h: 1500.00,
  volume24h: 2500000000.00,
  isActive: true,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔌 API Development

### Creating New Endpoints

#### 1. Define Route
```javascript
// File: services/order-service/routes/orders.js
router.post('/api/orders/advanced', [
  body('pair').isLength({ min: 6, max: 10 }),
  body('side').isIn(['buy', 'sell']),
  body('quantity').isFloat({ min: 0.00000001 })
], verifyToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const order = await createAdvancedOrder(req.body);
    res.status(201).json({ order });
  } catch (error) {
    logger.error('Create advanced order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});
```

#### 2. Add to API Gateway
```javascript
// File: api-gateway/index.js
app.use('/api/orders', createProxyMiddleware({
  target: 'http://order-service:5003',
  changeOrigin: true
}));
```

#### 3. Update Swagger Documentation
```javascript
// File: api-gateway/swagger.json
{
  "/api/orders/advanced": {
    "post": {
      "summary": "Create advanced order",
      "parameters": [
        {
          "name": "pair",
          "in": "body",
          "required": true,
          "schema": { "type": "string" }
        }
      ],
      "responses": {
        "201": {
          "description": "Order created successfully"
        }
      }
    }
  }
}
```

---

## 🧪 Testing

### Unit Tests
```javascript
// File: services/order-service/tests/orders.test.js
const request = require('supertest');
const app = require('../index');

describe('Order API', () => {
  test('should create order', async () => {
    const orderData = {
      pair: 'BTC/USD',
      side: 'buy',
      type: 'market',
      quantity: 0.1
    };

    const response = await request(app)
      .post('/api/orders')
      .send(orderData)
      .expect(201);

    expect(response.body.order).toHaveProperty('id');
    expect(response.body.order.pair).toBe('BTC/USD');
  });
});
```

### Integration Tests
```javascript
// File: tests/integration/trading.test.js
describe('Trading Integration', () => {
  test('should execute trade', async () => {
    // Create buy order
    const buyOrder = await createOrder({
      pair: 'BTC/USD',
      side: 'buy',
      quantity: 0.1,
      price: 45000
    });

    // Create sell order
    const sellOrder = await createOrder({
      pair: 'BTC/USD',
      side: 'sell',
      quantity: 0.1,
      price: 45000
    });

    // Wait for trade execution
    await waitForTrade(buyOrder.id, sellOrder.id);

    // Verify trade was created
    const trades = await getTrades('BTC/USD');
    expect(trades).toHaveLength(1);
  });
});
```

### Running Tests
```bash
# Run all tests
npm test

# Run specific service tests
cd services/order-service
npm test

# Run with coverage
npm run test:coverage
```

---

## 🔒 Security Best Practices

### Authentication
```javascript
// JWT token verification
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

### Input Validation
```javascript
// Using express-validator
const { body, validationResult } = require('express-validator');

const validateOrder = [
  body('pair').isLength({ min: 6, max: 10 }).withMessage('Invalid pair'),
  body('side').isIn(['buy', 'sell']).withMessage('Invalid side'),
  body('quantity').isFloat({ min: 0.00000001 }).withMessage('Invalid quantity'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];
```

### Rate Limiting
```javascript
// Rate limiting middleware
const rateLimit = require('express-rate-limit');

const tradingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many trading requests'
});

app.use('/api/trading', tradingLimiter);
```

---

## 📊 Monitoring and Logging

### Logging
```javascript
// Winston logger configuration
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Usage
logger.info('User logged in', { userId: user.id });
logger.error('Order creation failed', { error: error.message, orderData });
```

### Metrics
```javascript
// Prometheus metrics
const promClient = require('prom-client');

const orderCounter = new promClient.Counter({
  name: 'orders_total',
  help: 'Total number of orders',
  labelNames: ['status', 'pair']
});

// Increment counter
orderCounter.inc({ status: 'created', pair: 'BTC/USD' });
```

---

## 🚀 Deployment

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose logs -f

# Scale services
docker-compose up -d --scale order-service=3
```

### Environment-Specific Configuration
```javascript
// config/database.js
const config = {
  development: {
    postgres: {
      host: 'localhost',
      port: 5432,
      database: 'coinbase_clone_dev'
    }
  },
  production: {
    postgres: {
      host: process.env.POSTGRES_HOST,
      port: process.env.POSTGRES_PORT,
      database: process.env.POSTGRES_DB
    }
  }
};

module.exports = config[process.env.NODE_ENV || 'development'];
```

---

## 🔧 Debugging

### Debug Mode
```bash
# Enable debug logging
DEBUG=coinbase-clone:* npm run dev

# Debug specific module
DEBUG=coinbase-clone:orders npm run dev
```

### Database Debugging
```bash
# PostgreSQL
psql -h localhost -U postgres -d coinbase_clone
\dt  # List tables
\d users  # Describe table

# MongoDB
mongo
use coinbase-clone
db.users.find()
```

### Performance Profiling
```javascript
// Add performance monitoring
const startTime = Date.now();
// ... your code ...
const duration = Date.now() - startTime;
logger.info('Operation completed', { duration, operation: 'createOrder' });
```

---

## 📚 Additional Resources

### Documentation
- [API Documentation](http://localhost:3000/api-docs)
- [Database Schema](database/schema.md)
- [Deployment Guide](DEPLOYMENT.md)

### Tools
- [Postman Collection](docs/postman/coinbase-clone.postman_collection.json)
- [Database Migrations](database/migrations/)
- [Monitoring Dashboards](monitoring/grafana/)

### Community
- [GitHub Issues](https://github.com/your-username/coinbase-clone/issues)
- [Discord Server](https://discord.gg/coinbase-clone)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/coinbase-clone)

---

**Happy Coding! 🚀**