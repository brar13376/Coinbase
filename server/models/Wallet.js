const mongoose = require('mongoose');
const crypto = require('crypto');

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  currency: {
    type: String,
    required: true,
    uppercase: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  lockedBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  address: {
    type: String,
    required: function() {
      return this.currency !== 'USD' && this.currency !== 'EUR';
    }
  },
  privateKey: {
    type: String,
    required: function() {
      return this.currency !== 'USD' && this.currency !== 'EUR';
    }
  },
  publicKey: {
    type: String,
    required: function() {
      return this.currency !== 'USD' && this.currency !== 'EUR';
    }
  },
  mnemonic: {
    type: String,
    required: function() {
      return this.currency !== 'USD' && this.currency !== 'EUR';
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastTransaction: Date,
  transactionCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
walletSchema.index({ userId: 1, currency: 1 }, { unique: true });
walletSchema.index({ address: 1 });
walletSchema.index({ currency: 1 });

// Virtual for available balance
walletSchema.virtual('availableBalance').get(function() {
  return this.balance - this.lockedBalance;
});

// Method to generate wallet address and keys
walletSchema.methods.generateWallet = function() {
  if (this.currency === 'USD' || this.currency === 'EUR') {
    return; // Fiat currencies don't need blockchain addresses
  }
  
  // Generate a random private key (32 bytes)
  const privateKey = crypto.randomBytes(32).toString('hex');
  this.privateKey = privateKey;
  
  // Generate public key from private key (simplified)
  const publicKey = crypto.createHash('sha256').update(privateKey).digest('hex');
  this.publicKey = publicKey;
  
  // Generate address from public key (simplified)
  this.address = '0x' + crypto.createHash('sha256').update(publicKey).digest('hex').substring(0, 40);
  
  // Generate mnemonic (simplified - in production, use proper BIP39)
  this.mnemonic = crypto.randomBytes(16).toString('hex');
};

// Method to add balance
walletSchema.methods.addBalance = function(amount) {
  if (amount <= 0) throw new Error('Amount must be positive');
  this.balance += amount;
  this.lastTransaction = new Date();
  this.transactionCount += 1;
};

// Method to subtract balance
walletSchema.methods.subtractBalance = function(amount) {
  if (amount <= 0) throw new Error('Amount must be positive');
  if (this.availableBalance < amount) throw new Error('Insufficient balance');
  this.balance -= amount;
  this.lastTransaction = new Date();
  this.transactionCount += 1;
};

// Method to lock balance
walletSchema.methods.lockBalance = function(amount) {
  if (amount <= 0) throw new Error('Amount must be positive');
  if (this.availableBalance < amount) throw new Error('Insufficient available balance');
  this.lockedBalance += amount;
};

// Method to unlock balance
walletSchema.methods.unlockBalance = function(amount) {
  if (amount <= 0) throw new Error('Amount must be positive');
  if (this.lockedBalance < amount) throw new Error('Insufficient locked balance');
  this.lockedBalance -= amount;
};

// Method to get wallet summary
walletSchema.methods.getSummary = function() {
  return {
    currency: this.currency,
    balance: this.balance,
    lockedBalance: this.lockedBalance,
    availableBalance: this.availableBalance,
    address: this.address,
    isActive: this.isActive,
    lastTransaction: this.lastTransaction,
    transactionCount: this.transactionCount
  };
};

module.exports = mongoose.model('Wallet', walletSchema);