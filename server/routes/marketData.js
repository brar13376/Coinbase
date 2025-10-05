const express = require('express');
const MarketData = require('../models/MarketData');
const logger = require('../utils/logger');

const router = express.Router();

// Get all market data
router.get('/', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const marketData = await MarketData.find({ isActive: true })
      .sort({ lastUpdated: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const summaries = marketData.map(data => data.getSummary());

    res.json({ marketData: summaries });
  } catch (error) {
    logger.error('Get market data error:', error);
    res.status(500).json({ error: 'Failed to get market data' });
  }
});

// Get specific pair market data
router.get('/:pair', async (req, res) => {
  try {
    const { pair } = req.params;
    
    const marketData = await MarketData.findOne({ pair: pair.toUpperCase() });
    if (!marketData) {
      return res.status(404).json({ error: 'Trading pair not found' });
    }

    res.json({ marketData: marketData.getSummary() });
  } catch (error) {
    logger.error('Get pair market data error:', error);
    res.status(500).json({ error: 'Failed to get market data' });
  }
});

// Get price history (candlestick data)
router.get('/:pair/history', async (req, res) => {
  try {
    const { pair } = req.params;
    const { interval = '1h', limit = 100 } = req.query;
    
    // In production, this would fetch from a time-series database
    // For now, return mock data
    const mockHistory = generateMockPriceHistory(interval, parseInt(limit));
    
    res.json({ 
      pair: pair.toUpperCase(),
      interval,
      history: mockHistory
    });
  } catch (error) {
    logger.error('Get price history error:', error);
    res.status(500).json({ error: 'Failed to get price history' });
  }
});

// Get recent trades
router.get('/:pair/trades', async (req, res) => {
  try {
    const { pair } = req.params;
    const { limit = 50 } = req.query;
    
    const marketData = await MarketData.findOne({ pair: pair.toUpperCase() });
    if (!marketData) {
      return res.status(404).json({ error: 'Trading pair not found' });
    }

    const recentTrades = marketData.trades
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, parseInt(limit));

    res.json({ 
      pair: pair.toUpperCase(),
      trades: recentTrades
    });
  } catch (error) {
    logger.error('Get recent trades error:', error);
    res.status(500).json({ error: 'Failed to get recent trades' });
  }
});

// Get order book
router.get('/:pair/orderbook', async (req, res) => {
  try {
    const { pair } = req.params;
    const { limit = 20 } = req.query;
    
    const marketData = await MarketData.findOne({ pair: pair.toUpperCase() });
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

// Get market statistics
router.get('/:pair/stats', async (req, res) => {
  try {
    const { pair } = req.params;
    
    const marketData = await MarketData.findOne({ pair: pair.toUpperCase() });
    if (!marketData) {
      return res.status(404).json({ error: 'Trading pair not found' });
    }

    const stats = {
      pair: marketData.pair,
      price: marketData.price,
      priceChange24h: marketData.priceChange24h,
      priceChangePercent24h: marketData.priceChangePercent24h,
      volume24h: marketData.volume24h,
      high24h: marketData.high24h,
      low24h: marketData.low24h,
      marketCap: marketData.marketCap,
      circulatingSupply: marketData.circulatingSupply,
      totalSupply: marketData.totalSupply,
      lastUpdated: marketData.lastUpdated
    };

    res.json({ stats });
  } catch (error) {
    logger.error('Get market stats error:', error);
    res.status(500).json({ error: 'Failed to get market statistics' });
  }
});

// Generate mock price history
function generateMockPriceHistory(interval, limit) {
  const history = [];
  const now = new Date();
  const intervalMs = getIntervalMs(interval);
  
  let basePrice = 50000; // Starting price for BTC
  
  for (let i = 0; i < limit; i++) {
    const timestamp = new Date(now.getTime() - (limit - i) * intervalMs);
    
    // Generate realistic price movement
    const change = (Math.random() - 0.5) * 0.02; // ±1% change
    basePrice *= (1 + change);
    
    const open = basePrice;
    const close = basePrice * (1 + (Math.random() - 0.5) * 0.01);
    const high = Math.max(open, close) * (1 + Math.random() * 0.005);
    const low = Math.min(open, close) * (1 - Math.random() * 0.005);
    const volume = Math.random() * 1000000;
    
    history.push({
      timestamp,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: parseFloat(volume.toFixed(2))
    });
    
    basePrice = close;
  }
  
  return history;
}

function getIntervalMs(interval) {
  const intervals = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000
  };
  
  return intervals[interval] || intervals['1h'];
}

module.exports = router;