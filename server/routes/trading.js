const express = require('express');
const passport = require('passport');
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const Trade = require('../models/Trade');
const Wallet = require('../models/Wallet');
const MarketData = require('../models/MarketData');
const logger = require('../utils/logger');

const router = express.Router();

// Create order
router.post('/orders', [
  body('pair').isLength({ min: 6, max: 10 }),
  body('side').isIn(['buy', 'sell']),
  body('type').isIn(['market', 'limit', 'stop', 'stop_limit']),
  body('quantity').isFloat({ min: 0.00000001 }),
  body('price').optional().isFloat({ min: 0.00000001 }),
  body('stopPrice').optional().isFloat({ min: 0.00000001 }),
  body('timeInForce').optional().isIn(['GTC', 'IOC', 'FOK'])
], passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { pair, side, type, quantity, price, stopPrice, timeInForce = 'GTC' } = req.body;
    const userId = req.user.userId;

    // Validate required fields based on order type
    if ((type === 'limit' || type === 'stop_limit') && !price) {
      return res.status(400).json({ error: 'Price is required for limit orders' });
    }

    if ((type === 'stop' || type === 'stop_limit') && !stopPrice) {
      return res.status(400).json({ error: 'Stop price is required for stop orders' });
    }

    // Get current market price for market orders
    let orderPrice = price;
    if (type === 'market') {
      const marketData = await MarketData.findOne({ pair });
      if (!marketData) {
        return res.status(400).json({ error: 'Invalid trading pair' });
      }
      orderPrice = marketData.price;
    }

    // Calculate total value
    const totalValue = quantity * orderPrice;

    // Check if user has sufficient balance
    const [baseCurrency, quoteCurrency] = pair.split('/');
    const walletCurrency = side === 'buy' ? quoteCurrency : baseCurrency;
    
    const wallet = await Wallet.findOne({ userId, currency: walletCurrency });
    if (!wallet) {
      return res.status(400).json({ error: `No ${walletCurrency} wallet found` });
    }

    if (side === 'buy' && wallet.availableBalance < totalValue) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    if (side === 'sell' && wallet.availableBalance < quantity) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Create order
    const order = new Order({
      userId,
      pair,
      side,
      type,
      quantity,
      price: orderPrice,
      stopPrice,
      totalValue,
      timeInForce
    });

    // Lock balance
    if (side === 'buy') {
      wallet.lockBalance(totalValue);
    } else {
      wallet.lockBalance(quantity);
    }

    await Promise.all([order.save(), wallet.save()]);

    // Process order (simplified - in production, use proper order matching engine)
    await processOrder(order);

    logger.info(`Order created: ${order._id} for user ${userId}`);

    res.status(201).json({
      message: 'Order created successfully',
      order: order.getSummary()
    });
  } catch (error) {
    logger.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Get user orders
router.get('/orders', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { status, pair, limit = 50, offset = 0 } = req.query;
    const userId = req.user.userId;

    const filter = { userId };
    if (status) filter.status = status;
    if (pair) filter.pair = pair;

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const orderSummaries = orders.map(order => order.getSummary());

    res.json({ orders: orderSummaries });
  } catch (error) {
    logger.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to get orders' });
  }
});

// Get specific order
router.get('/orders/:orderId', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;

    const order = await Order.findOne({ _id: orderId, userId });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order: order.getSummary() });
  } catch (error) {
    logger.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to get order' });
  }
});

// Cancel order
router.delete('/orders/:orderId', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;

    const order = await Order.findOne({ _id: orderId, userId });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status === 'filled') {
      return res.status(400).json({ error: 'Cannot cancel filled order' });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({ error: 'Order already cancelled' });
    }

    // Unlock balance
    const [baseCurrency, quoteCurrency] = order.pair.split('/');
    const walletCurrency = order.side === 'buy' ? quoteCurrency : baseCurrency;
    
    const wallet = await Wallet.findOne({ userId, currency: walletCurrency });
    if (wallet) {
      if (order.side === 'buy') {
        wallet.unlockBalance(order.totalValue - (order.filledQuantity * order.averagePrice));
      } else {
        wallet.unlockBalance(order.remainingQuantity);
      }
      await wallet.save();
    }

    order.cancel();
    await order.save();

    logger.info(`Order cancelled: ${orderId} by user ${userId}`);

    res.json({ message: 'Order cancelled successfully' });
  } catch (error) {
    logger.error('Cancel order error:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// Get user trades
router.get('/trades', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { pair, limit = 50, offset = 0 } = req.query;
    const userId = req.user.userId;

    const filter = {
      $or: [{ buyerId: userId }, { sellerId: userId }]
    };
    if (pair) filter.pair = pair;

    const trades = await Trade.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const tradeSummaries = trades.map(trade => trade.getSummary());

    res.json({ trades: tradeSummaries });
  } catch (error) {
    logger.error('Get trades error:', error);
    res.status(500).json({ error: 'Failed to get trades' });
  }
});

// Get order book
router.get('/orderbook/:pair', async (req, res) => {
  try {
    const { pair } = req.params;
    const { limit = 20 } = req.query;

    const marketData = await MarketData.findOne({ pair });
    if (!marketData) {
      return res.status(404).json({ error: 'Trading pair not found' });
    }

    const orderBook = {
      pair: marketData.pair,
      bids: marketData.orderBook.bids.slice(0, parseInt(limit)),
      asks: marketData.orderBook.asks.slice(0, parseInt(limit)),
      lastUpdated: marketData.lastUpdated
    };

    res.json(orderBook);
  } catch (error) {
    logger.error('Get order book error:', error);
    res.status(500).json({ error: 'Failed to get order book' });
  }
});

// Process order (simplified order matching)
async function processOrder(order) {
  try {
    if (order.type === 'market') {
      // For market orders, execute immediately at current market price
      const marketData = await MarketData.findOne({ pair: order.pair });
      if (!marketData) return;

      // Create a mock trade
      const trade = new Trade({
        buyOrderId: order.side === 'buy' ? order._id : null,
        sellOrderId: order.side === 'sell' ? order._id : null,
        buyerId: order.side === 'buy' ? order.userId : null,
        sellerId: order.side === 'sell' ? order.userId : null,
        pair: order.pair,
        quantity: order.quantity,
        price: marketData.price,
        totalValue: order.quantity * marketData.price,
        status: 'completed'
      });

      trade.calculateFees();
      await trade.save();

      // Update order
      order.addFill(marketData.price, order.quantity, trade._id);
      await order.save();

      // Update wallets
      await updateWalletsAfterTrade(trade);

      // Update market data
      marketData.addTrade(marketData.price, order.quantity, order.side);
      await marketData.save();
    }
  } catch (error) {
    logger.error('Process order error:', error);
  }
}

// Update wallets after trade
async function updateWalletsAfterTrade(trade) {
  try {
    const [baseCurrency, quoteCurrency] = trade.pair.split('/');
    
    // Update buyer wallet
    if (trade.buyerId) {
      const buyerBaseWallet = await Wallet.findOne({ userId: trade.buyerId, currency: baseCurrency });
      const buyerQuoteWallet = await Wallet.findOne({ userId: trade.buyerId, currency: quoteCurrency });
      
      if (buyerBaseWallet) {
        buyerBaseWallet.addBalance(trade.quantity);
        await buyerBaseWallet.save();
      }
      
      if (buyerQuoteWallet) {
        buyerQuoteWallet.subtractBalance(trade.totalValue + trade.fees.buyer);
        await buyerQuoteWallet.save();
      }
    }

    // Update seller wallet
    if (trade.sellerId) {
      const sellerBaseWallet = await Wallet.findOne({ userId: trade.sellerId, currency: baseCurrency });
      const sellerQuoteWallet = await Wallet.findOne({ userId: trade.sellerId, currency: quoteCurrency });
      
      if (sellerBaseWallet) {
        sellerBaseWallet.subtractBalance(trade.quantity);
        await sellerBaseWallet.save();
      }
      
      if (sellerQuoteWallet) {
        sellerQuoteWallet.addBalance(trade.totalValue - trade.fees.seller);
        await sellerQuoteWallet.save();
      }
    }
  } catch (error) {
    logger.error('Update wallets error:', error);
  }
}

module.exports = router;