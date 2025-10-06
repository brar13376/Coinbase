const express = require('express');
const { body, validationResult } = require('express-validator');
const matchingEngine = require('../services/matchingEngine');
const { publishEvent } = require('../services/kafkaService');
const { 
  checkOrderRateLimit, 
  acquireOrderLock, 
  releaseOrderLock,
  cacheUserOrders,
  getCachedUserOrders
} = require('../services/redisService');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

const router = express.Router();

// JWT verification middleware (simplified for microservice)
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // In production, verify JWT with auth service
    // For now, extract user info from token
    const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Token verification failed:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Create order
router.post('/orders', [
  body('pair').isLength({ min: 6, max: 10 }).withMessage('Invalid trading pair'),
  body('side').isIn(['buy', 'sell']).withMessage('Side must be buy or sell'),
  body('type').isIn(['market', 'limit', 'stop', 'stop_limit']).withMessage('Invalid order type'),
  body('quantity').isFloat({ min: 0.00000001 }).withMessage('Invalid quantity'),
  body('price').optional().isFloat({ min: 0.00000001 }).withMessage('Invalid price'),
  body('stopPrice').optional().isFloat({ min: 0.00000001 }).withMessage('Invalid stop price'),
  body('timeInForce').optional().isIn(['GTC', 'IOC', 'FOK']).withMessage('Invalid time in force')
], verifyToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { pair, side, type, quantity, price, stopPrice, timeInForce = 'GTC' } = req.body;
    const userId = req.user.userId;

    // Check rate limit
    const canPlaceOrder = await checkOrderRateLimit(userId);
    if (!canPlaceOrder) {
      return res.status(429).json({ error: 'Order rate limit exceeded' });
    }

    // Validate required fields based on order type
    if ((type === 'limit' || type === 'stop_limit') && !price) {
      return res.status(400).json({ error: 'Price is required for limit orders' });
    }

    if ((type === 'stop' || type === 'stop_limit') && !stopPrice) {
      return res.status(400).json({ error: 'Stop price is required for stop orders' });
    }

    // Create order object
    const order = {
      userId,
      pair: pair.toUpperCase(),
      side,
      type,
      quantity: parseFloat(quantity),
      price: price ? parseFloat(price) : null,
      stopPrice: stopPrice ? parseFloat(stopPrice) : null,
      timeInForce,
      status: 'pending',
      createdAt: new Date()
    };

    // Acquire lock to prevent duplicate orders
    const lockAcquired = await acquireOrderLock(`${userId}-${Date.now()}`);
    if (!lockAcquired) {
      return res.status(409).json({ error: 'Order processing in progress' });
    }

    try {
      // Add order to matching engine
      const createdOrder = await matchingEngine.addOrder(order);

      // Publish order created event
      await publishEvent('order.created', {
        orderId: createdOrder.id,
        userId: createdOrder.userId,
        pair: createdOrder.pair,
        side: createdOrder.side,
        type: createdOrder.type,
        quantity: createdOrder.quantity,
        price: createdOrder.price,
        status: createdOrder.status
      });

      logger.info(`Order created: ${createdOrder.id} for user ${userId}`);

      res.status(201).json({
        message: 'Order created successfully',
        order: {
          id: createdOrder.id,
          pair: createdOrder.pair,
          side: createdOrder.side,
          type: createdOrder.type,
          quantity: createdOrder.quantity,
          price: createdOrder.price,
          stopPrice: createdOrder.stopPrice,
          status: createdOrder.status,
          createdAt: createdOrder.createdAt
        }
      });
    } finally {
      await releaseOrderLock(`${userId}-${Date.now()}`);
    }
  } catch (error) {
    logger.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Get user orders
router.get('/orders', verifyToken, async (req, res) => {
  try {
    const { status, pair, limit = 50, offset = 0 } = req.query;
    const userId = req.user.userId;

    // Try to get from cache first
    let orders = await getCachedUserOrders(userId);
    
    if (!orders) {
      // Get from matching engine
      orders = matchingEngine.getUserOrders(userId, status);
      
      // Cache the result
      await cacheUserOrders(userId, orders);
    }

    // Apply filters
    if (pair) {
      orders = orders.filter(order => order.pair === pair.toUpperCase());
    }

    // Apply pagination
    const paginatedOrders = orders.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({
      orders: paginatedOrders.map(order => ({
        id: order.id,
        pair: order.pair,
        side: order.side,
        type: order.type,
        quantity: order.quantity,
        price: order.price,
        stopPrice: order.stopPrice,
        filledQuantity: order.filledQuantity.toNumber(),
        remainingQuantity: order.remainingQuantity.toNumber(),
        status: order.status,
        createdAt: order.createdAt
      })),
      pagination: {
        total: orders.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    logger.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to get orders' });
  }
});

// Get specific order
router.get('/orders/:orderId', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;

    const orders = matchingEngine.getUserOrders(userId);
    const order = orders.find(o => o.id === orderId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      order: {
        id: order.id,
        pair: order.pair,
        side: order.side,
        type: order.type,
        quantity: order.quantity,
        price: order.price,
        stopPrice: order.stopPrice,
        filledQuantity: order.filledQuantity.toNumber(),
        remainingQuantity: order.remainingQuantity.toNumber(),
        status: order.status,
        createdAt: order.createdAt
      }
    });
  } catch (error) {
    logger.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to get order' });
  }
});

// Cancel order
router.delete('/orders/:orderId', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;

    // Verify order belongs to user
    const orders = matchingEngine.getUserOrders(userId);
    const order = orders.find(o => o.id === orderId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Cancel order
    const cancelledOrder = await matchingEngine.cancelOrder(orderId);

    // Publish order cancelled event
    await publishEvent('order.cancelled', {
      orderId,
      userId,
      pair: order.pair
    });

    logger.info(`Order cancelled: ${orderId} by user ${userId}`);

    res.json({
      message: 'Order cancelled successfully',
      order: {
        id: cancelledOrder.id,
        status: cancelledOrder.status
      }
    });
  } catch (error) {
    logger.error('Cancel order error:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// Get order book
router.get('/orderbook/:pair', async (req, res) => {
  try {
    const { pair } = req.params;
    const { limit = 20 } = req.query;

    const orderBook = matchingEngine.getOrderBook(pair.toUpperCase(), parseInt(limit));

    res.json({
      pair: pair.toUpperCase(),
      bids: orderBook.bids,
      asks: orderBook.asks,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Get order book error:', error);
    res.status(500).json({ error: 'Failed to get order book' });
  }
});

// Get recent trades
router.get('/trades', verifyToken, async (req, res) => {
  try {
    const { pair, limit = 50, offset = 0 } = req.query;
    const userId = req.user.userId;

    let trades = [];

    if (pair) {
      trades = matchingEngine.getRecentTrades(pair.toUpperCase(), parseInt(limit));
    } else {
      // Get all trades for user
      const userOrders = matchingEngine.getUserOrders(userId);
      const userOrderIds = userOrders.map(o => o.id);
      
      // This would typically come from a database
      // For now, return empty array
      trades = [];
    }

    // Apply pagination
    const paginatedTrades = trades.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({
      trades: paginatedTrades.map(trade => ({
        id: trade.id,
        pair: trade.pair,
        quantity: trade.quantity,
        price: trade.price,
        totalValue: trade.totalValue,
        side: trade.buyerId === userId ? 'buy' : 'sell',
        timestamp: trade.timestamp
      })),
      pagination: {
        total: trades.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    logger.error('Get trades error:', error);
    res.status(500).json({ error: 'Failed to get trades' });
  }
});

// Get market statistics
router.get('/stats/:pair', async (req, res) => {
  try {
    const { pair } = req.params;
    const orderBook = matchingEngine.getOrderBook(pair.toUpperCase());
    const recentTrades = matchingEngine.getRecentTrades(pair.toUpperCase(), 100);

    // Calculate 24h volume (mock data)
    const volume24h = recentTrades.reduce((sum, trade) => sum + trade.totalValue, 0);
    
    // Calculate price change (mock data)
    const priceChange24h = 0; // This would be calculated from historical data
    const priceChangePercent24h = 0;

    res.json({
      pair: pair.toUpperCase(),
      volume24h,
      priceChange24h,
      priceChangePercent24h,
      lastPrice: recentTrades[0]?.price || 0,
      high24h: Math.max(...recentTrades.map(t => t.price), 0),
      low24h: Math.min(...recentTrades.map(t => t.price), 0),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Get market stats error:', error);
    res.status(500).json({ error: 'Failed to get market statistics' });
  }
});

module.exports = router;