const logger = require('../utils/logger');
const MarketData = require('../models/MarketData');

let io;

const initializeWebSocket = (socketIo) => {
  io = socketIo;
  
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);
    
    // Join market data room
    socket.on('join-market-data', (pairs) => {
      if (Array.isArray(pairs)) {
        pairs.forEach(pair => {
          socket.join(`market-${pair}`);
        });
      } else {
        socket.join(`market-${pairs}`);
      }
      logger.info(`Client ${socket.id} joined market data for: ${pairs}`);
    });
    
    // Leave market data room
    socket.on('leave-market-data', (pairs) => {
      if (Array.isArray(pairs)) {
        pairs.forEach(pair => {
          socket.leave(`market-${pair}`);
        });
      } else {
        socket.leave(`market-${pairs}`);
      }
      logger.info(`Client ${socket.id} left market data for: ${pairs}`);
    });
    
    // Join user-specific room for personal updates
    socket.on('join-user-room', (userId) => {
      socket.join(`user-${userId}`);
      logger.info(`Client ${socket.id} joined user room: ${userId}`);
    });
    
    // Handle order updates
    socket.on('subscribe-orders', (userId) => {
      socket.join(`orders-${userId}`);
      logger.info(`Client ${socket.id} subscribed to orders for user: ${userId}`);
    });
    
    // Handle trade updates
    socket.on('subscribe-trades', (userId) => {
      socket.join(`trades-${userId}`);
      logger.info(`Client ${socket.id} subscribed to trades for user: ${userId}`);
    });
    
    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });
};

// Broadcast market data updates
const broadcastMarketData = async (pair, data) => {
  if (!io) return;
  
  try {
    io.to(`market-${pair}`).emit('market-data-update', {
      pair,
      data,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Broadcast market data error:', error);
  }
};

// Broadcast price updates
const broadcastPriceUpdate = async (pair, price) => {
  if (!io) return;
  
  try {
    io.to(`market-${pair}`).emit('price-update', {
      pair,
      price,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Broadcast price update error:', error);
  }
};

// Broadcast trade updates
const broadcastTradeUpdate = async (trade) => {
  if (!io) return;
  
  try {
    // Broadcast to market data subscribers
    io.to(`market-${trade.pair}`).emit('trade-update', {
      pair: trade.pair,
      price: trade.price,
      quantity: trade.quantity,
      side: trade.side,
      timestamp: trade.timestamp
    });
    
    // Broadcast to specific user rooms
    if (trade.buyerId) {
      io.to(`user-${trade.buyerId}`).emit('trade-executed', trade);
      io.to(`trades-${trade.buyerId}`).emit('trade-update', trade);
    }
    
    if (trade.sellerId) {
      io.to(`user-${trade.sellerId}`).emit('trade-executed', trade);
      io.to(`trades-${trade.sellerId}`).emit('trade-update', trade);
    }
  } catch (error) {
    logger.error('Broadcast trade update error:', error);
  }
};

// Broadcast order updates
const broadcastOrderUpdate = async (order) => {
  if (!io) return;
  
  try {
    io.to(`user-${order.userId}`).emit('order-update', order);
    io.to(`orders-${order.userId}`).emit('order-update', order);
  } catch (error) {
    logger.error('Broadcast order update error:', error);
  }
};

// Broadcast wallet updates
const broadcastWalletUpdate = async (userId, wallet) => {
  if (!io) return;
  
  try {
    io.to(`user-${userId}`).emit('wallet-update', wallet);
  } catch (error) {
    logger.error('Broadcast wallet update error:', error);
  }
};

// Broadcast system notifications
const broadcastSystemNotification = async (message, type = 'info') => {
  if (!io) return;
  
  try {
    io.emit('system-notification', {
      message,
      type,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Broadcast system notification error:', error);
  }
};

// Broadcast to specific user
const broadcastToUser = async (userId, event, data) => {
  if (!io) return;
  
  try {
    io.to(`user-${userId}`).emit(event, data);
  } catch (error) {
    logger.error('Broadcast to user error:', error);
  }
};

module.exports = {
  initializeWebSocket,
  broadcastMarketData,
  broadcastPriceUpdate,
  broadcastTradeUpdate,
  broadcastOrderUpdate,
  broadcastWalletUpdate,
  broadcastSystemNotification,
  broadcastToUser
};