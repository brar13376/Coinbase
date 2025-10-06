const mongoose = require('mongoose');

const marketDataSchema = new mongoose.Schema({
  pair: {
    type: String,
    required: true,
    uppercase: true,
    unique: true
  },
  baseCurrency: {
    type: String,
    required: true,
    uppercase: true
  },
  quoteCurrency: {
    type: String,
    required: true,
    uppercase: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  priceChange24h: {
    type: Number,
    default: 0
  },
  priceChangePercent24h: {
    type: Number,
    default: 0
  },
  volume24h: {
    type: Number,
    default: 0
  },
  high24h: {
    type: Number,
    default: 0
  },
  low24h: {
    type: Number,
    default: 0
  },
  marketCap: {
    type: Number,
    default: 0
  },
  circulatingSupply: {
    type: Number,
    default: 0
  },
  totalSupply: {
    type: Number,
    default: 0
  },
  orderBook: {
    bids: [{
      price: Number,
      quantity: Number
    }],
    asks: [{
      price: Number,
      quantity: Number
    }]
  },
  trades: [{
    price: Number,
    quantity: Number,
    timestamp: Date,
    side: {
      type: String,
      enum: ['buy', 'sell']
    }
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
marketDataSchema.index({ pair: 1 });
marketDataSchema.index({ lastUpdated: -1 });
marketDataSchema.index({ isActive: 1 });

// Method to update price data
marketDataSchema.methods.updatePrice = function(newPrice) {
  const oldPrice = this.price;
  this.price = newPrice;
  
  // Update 24h high/low
  if (this.high24h === 0 || newPrice > this.high24h) {
    this.high24h = newPrice;
  }
  if (this.low24h === 0 || newPrice < this.low24h) {
    this.low24h = newPrice;
  }
  
  // Calculate price change
  if (oldPrice > 0) {
    this.priceChange24h = newPrice - oldPrice;
    this.priceChangePercent24h = ((newPrice - oldPrice) / oldPrice) * 100;
  }
  
  this.lastUpdated = new Date();
};

// Method to add trade
marketDataSchema.methods.addTrade = function(price, quantity, side) {
  this.trades.push({
    price,
    quantity,
    side,
    timestamp: new Date()
  });
  
  // Keep only last 100 trades
  if (this.trades.length > 100) {
    this.trades = this.trades.slice(-100);
  }
  
  this.lastUpdated = new Date();
};

// Method to update order book
marketDataSchema.methods.updateOrderBook = function(bids, asks) {
  this.orderBook = {
    bids: bids.slice(0, 20), // Keep top 20 bids
    asks: asks.slice(0, 20)  // Keep top 20 asks
  };
  this.lastUpdated = new Date();
};

// Method to get market summary
marketDataSchema.methods.getSummary = function() {
  return {
    pair: this.pair,
    baseCurrency: this.baseCurrency,
    quoteCurrency: this.quoteCurrency,
    price: this.price,
    priceChange24h: this.priceChange24h,
    priceChangePercent24h: this.priceChangePercent24h,
    volume24h: this.volume24h,
    high24h: this.high24h,
    low24h: this.low24h,
    marketCap: this.marketCap,
    lastUpdated: this.lastUpdated
  };
};

module.exports = mongoose.model('MarketData', marketDataSchema);