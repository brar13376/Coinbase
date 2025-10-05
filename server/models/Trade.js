const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  buyOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  sellOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pair: {
    type: String,
    required: true,
    uppercase: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  totalValue: {
    type: Number,
    required: true,
    min: 0
  },
  fees: {
    buyer: {
      type: Number,
      default: 0
    },
    seller: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    }
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Indexes
tradeSchema.index({ pair: 1, timestamp: -1 });
tradeSchema.index({ buyerId: 1, timestamp: -1 });
tradeSchema.index({ sellerId: 1, timestamp: -1 });
tradeSchema.index({ buyOrderId: 1 });
tradeSchema.index({ sellOrderId: 1 });

// Method to calculate fees
tradeSchema.methods.calculateFees = function(makerFeeRate = 0.001, takerFeeRate = 0.001) {
  // In a real implementation, you would determine maker/taker based on order book
  // For simplicity, we'll assume both are takers
  const feeRate = takerFeeRate;
  
  this.fees.buyer = this.totalValue * feeRate;
  this.fees.seller = this.totalValue * feeRate;
  this.fees.total = this.fees.buyer + this.fees.seller;
};

// Method to get trade summary
tradeSchema.methods.getSummary = function() {
  return {
    id: this._id,
    pair: this.pair,
    quantity: this.quantity,
    price: this.price,
    totalValue: this.totalValue,
    fees: this.fees,
    timestamp: this.timestamp,
    status: this.status
  };
};

module.exports = mongoose.model('Trade', tradeSchema);