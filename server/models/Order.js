const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pair: {
    type: String,
    required: true,
    uppercase: true
  },
  side: {
    type: String,
    enum: ['buy', 'sell'],
    required: true
  },
  type: {
    type: String,
    enum: ['market', 'limit', 'stop', 'stop_limit'],
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  price: {
    type: Number,
    required: function() {
      return this.type === 'limit' || this.type === 'stop_limit';
    },
    min: 0
  },
  stopPrice: {
    type: Number,
    required: function() {
      return this.type === 'stop' || this.type === 'stop_limit';
    },
    min: 0
  },
  filledQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  remainingQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'partially_filled', 'filled', 'cancelled', 'rejected'],
    default: 'pending'
  },
  averagePrice: {
    type: Number,
    default: 0
  },
  totalValue: {
    type: Number,
    required: true,
    min: 0
  },
  fees: {
    maker: {
      type: Number,
      default: 0
    },
    taker: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    }
  },
  timeInForce: {
    type: String,
    enum: ['GTC', 'IOC', 'FOK'],
    default: 'GTC'
  },
  clientOrderId: String,
  fills: [{
    price: Number,
    quantity: Number,
    timestamp: {
      type: Date,
      default: Date.now
    },
    tradeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trade'
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: Date
}, {
  timestamps: true
});

// Indexes
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ pair: 1, side: 1, status: 1 });
orderSchema.index({ status: 1, createdAt: 1 });
orderSchema.index({ clientOrderId: 1 });

// Pre-save middleware to calculate remaining quantity
orderSchema.pre('save', function(next) {
  this.remainingQuantity = this.quantity - this.filledQuantity;
  this.updatedAt = new Date();
  next();
});

// Method to calculate average price
orderSchema.methods.calculateAveragePrice = function() {
  if (this.fills.length === 0) return 0;
  
  let totalValue = 0;
  let totalQuantity = 0;
  
  this.fills.forEach(fill => {
    totalValue += fill.price * fill.quantity;
    totalQuantity += fill.quantity;
  });
  
  return totalQuantity > 0 ? totalValue / totalQuantity : 0;
};

// Method to add fill
orderSchema.methods.addFill = function(price, quantity, tradeId) {
  if (quantity <= 0) throw new Error('Fill quantity must be positive');
  if (quantity > this.remainingQuantity) throw new Error('Fill quantity exceeds remaining quantity');
  
  this.fills.push({
    price,
    quantity,
    tradeId,
    timestamp: new Date()
  });
  
  this.filledQuantity += quantity;
  this.averagePrice = this.calculateAveragePrice();
  
  // Update status
  if (this.remainingQuantity <= 0) {
    this.status = 'filled';
  } else if (this.filledQuantity > 0) {
    this.status = 'partially_filled';
  }
};

// Method to cancel order
orderSchema.methods.cancel = function() {
  if (this.status === 'filled') {
    throw new Error('Cannot cancel filled order');
  }
  if (this.status === 'cancelled') {
    throw new Error('Order already cancelled');
  }
  
  this.status = 'cancelled';
  this.updatedAt = new Date();
};

// Method to get order summary
orderSchema.methods.getSummary = function() {
  return {
    id: this._id,
    pair: this.pair,
    side: this.side,
    type: this.type,
    quantity: this.quantity,
    price: this.price,
    stopPrice: this.stopPrice,
    filledQuantity: this.filledQuantity,
    remainingQuantity: this.remainingQuantity,
    status: this.status,
    averagePrice: this.averagePrice,
    totalValue: this.totalValue,
    fees: this.fees,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('Order', orderSchema);