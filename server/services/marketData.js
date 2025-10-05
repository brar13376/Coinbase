const MarketData = require('../models/MarketData');
const logger = require('../utils/logger');
const { broadcastPriceUpdate, broadcastMarketData } = require('./websocket');

// Initialize market data with some popular trading pairs
const initializeMarketData = async () => {
  try {
    const defaultPairs = [
      { pair: 'BTC/USD', baseCurrency: 'BTC', quoteCurrency: 'USD', price: 45000 },
      { pair: 'ETH/USD', baseCurrency: 'ETH', quoteCurrency: 'USD', price: 3000 },
      { pair: 'BNB/USD', baseCurrency: 'BNB', quoteCurrency: 'USD', price: 300 },
      { pair: 'ADA/USD', baseCurrency: 'ADA', quoteCurrency: 'USD', price: 0.5 },
      { pair: 'SOL/USD', baseCurrency: 'SOL', quoteCurrency: 'USD', price: 100 },
      { pair: 'DOT/USD', baseCurrency: 'DOT', quoteCurrency: 'USD', price: 6 },
      { pair: 'MATIC/USD', baseCurrency: 'MATIC', quoteCurrency: 'USD', price: 0.8 },
      { pair: 'AVAX/USD', baseCurrency: 'AVAX', quoteCurrency: 'USD', price: 25 }
    ];

    for (const pairData of defaultPairs) {
      const existingPair = await MarketData.findOne({ pair: pairData.pair });
      if (!existingPair) {
        const marketData = new MarketData(pairData);
        await marketData.save();
        logger.info(`Initialized market data for ${pairData.pair}`);
      }
    }

    // Start price simulation
    startPriceSimulation();
  } catch (error) {
    logger.error('Initialize market data error:', error);
  }
};

// Simulate price movements
const startPriceSimulation = () => {
  setInterval(async () => {
    try {
      const marketDataList = await MarketData.find({ isActive: true });
      
      for (const marketData of marketDataList) {
        // Generate random price movement (-2% to +2%)
        const changePercent = (Math.random() - 0.5) * 0.04;
        const newPrice = marketData.price * (1 + changePercent);
        
        marketData.updatePrice(newPrice);
        await marketData.save();
        
        // Broadcast price update
        await broadcastPriceUpdate(marketData.pair, newPrice);
      }
    } catch (error) {
      logger.error('Price simulation error:', error);
    }
  }, 5000); // Update every 5 seconds
};

// Update order book
const updateOrderBook = async (pair, bids, asks) => {
  try {
    const marketData = await MarketData.findOne({ pair });
    if (!marketData) {
      logger.error(`Market data not found for pair: ${pair}`);
      return;
    }

    marketData.updateOrderBook(bids, asks);
    await marketData.save();
    
    // Broadcast order book update
    await broadcastMarketData(pair, {
      orderBook: marketData.orderBook,
      lastUpdated: marketData.lastUpdated
    });
  } catch (error) {
    logger.error('Update order book error:', error);
  }
};

// Add trade to market data
const addTrade = async (pair, price, quantity, side) => {
  try {
    const marketData = await MarketData.findOne({ pair });
    if (!marketData) {
      logger.error(`Market data not found for pair: ${pair}`);
      return;
    }

    marketData.addTrade(price, quantity, side);
    await marketData.save();
    
    // Broadcast trade update
    await broadcastMarketData(pair, {
      trades: marketData.trades.slice(-10), // Last 10 trades
      lastUpdated: marketData.lastUpdated
    });
  } catch (error) {
    logger.error('Add trade error:', error);
  }
};

// Get market data for a specific pair
const getMarketData = async (pair) => {
  try {
    const marketData = await MarketData.findOne({ pair });
    return marketData ? marketData.getSummary() : null;
  } catch (error) {
    logger.error('Get market data error:', error);
    return null;
  }
};

// Get all active market data
const getAllMarketData = async () => {
  try {
    const marketDataList = await MarketData.find({ isActive: true });
    return marketDataList.map(data => data.getSummary());
  } catch (error) {
    logger.error('Get all market data error:', error);
    return [];
  }
};

module.exports = {
  initializeMarketData,
  updateOrderBook,
  addTrade,
  getMarketData,
  getAllMarketData
};