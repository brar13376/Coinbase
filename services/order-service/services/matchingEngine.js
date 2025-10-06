const { v4: uuidv4 } = require('uuid');
const Decimal = require('decimal.js');
const winston = require('winston');
const { publishEvent } = require('./kafkaService');

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

class MatchingEngine {
  constructor() {
    this.orderBooks = new Map(); // pair -> { bids: [], asks: [] }
    this.pendingOrders = new Map(); // orderId -> order
    this.trades = [];
    this.io = null;
    this.isRunning = false;
  }

  initialize(io) {
    this.io = io;
    this.isRunning = true;
    logger.info('Matching engine initialized');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      orderBooks: this.orderBooks.size,
      pendingOrders: this.pendingOrders.size,
      totalTrades: this.trades.length
    };
  }

  // Add order to matching engine
  async addOrder(order) {
    try {
      const orderId = uuidv4();
      const orderWithId = {
        ...order,
        id: orderId,
        status: 'pending',
        createdAt: new Date(),
        filledQuantity: new Decimal(0),
        remainingQuantity: new Decimal(order.quantity)
      };

      this.pendingOrders.set(orderId, orderWithId);

      // Get or create order book for pair
      if (!this.orderBooks.has(order.pair)) {
        this.orderBooks.set(order.pair, {
          bids: [], // Buy orders (descending price)
          asks: []  // Sell orders (ascending price)
        });
      }

      const orderBook = this.orderBooks.get(order.pair);
      
      if (order.side === 'buy') {
        this.insertBuyOrder(orderBook.bids, orderWithId);
      } else {
        this.insertSellOrder(orderBook.asks, orderWithId);
      }

      // Attempt to match orders
      await this.matchOrders(order.pair);

      // Publish order created event
      await publishEvent('order.created', {
        orderId,
        userId: order.userId,
        pair: order.pair,
        side: order.side,
        type: order.type,
        quantity: order.quantity,
        price: order.price
      });

      return orderWithId;
    } catch (error) {
      logger.error('Error adding order:', error);
      throw error;
    }
  }

  // Insert buy order in descending price order
  insertBuyOrder(bids, order) {
    const price = new Decimal(order.price || 0);
    let inserted = false;

    for (let i = 0; i < bids.length; i++) {
      if (price.greaterThan(new Decimal(bids[i].price))) {
        bids.splice(i, 0, order);
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      bids.push(order);
    }
  }

  // Insert sell order in ascending price order
  insertSellOrder(asks, order) {
    const price = new Decimal(order.price || 0);
    let inserted = false;

    for (let i = 0; i < asks.length; i++) {
      if (price.lessThan(new Decimal(asks[i].price))) {
        asks.splice(i, 0, order);
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      asks.push(order);
    }
  }

  // Match orders for a specific pair
  async matchOrders(pair) {
    const orderBook = this.orderBooks.get(pair);
    if (!orderBook) return;

    const { bids, asks } = orderBook;

    while (bids.length > 0 && asks.length > 0) {
      const bestBid = bids[0];
      const bestAsk = asks[0];

      const bidPrice = new Decimal(bestBid.price);
      const askPrice = new Decimal(bestAsk.price);

      // Check if orders can match
      if (bidPrice.greaterThanOrEqualTo(askPrice)) {
        await this.executeTrade(bestBid, bestAsk, pair);
      } else {
        break; // No more matches possible
      }
    }

    // Clean up filled orders
    this.cleanupFilledOrders(pair);
  }

  // Execute a trade between two orders
  async executeTrade(buyOrder, sellOrder, pair) {
    try {
      const buyQuantity = new Decimal(buyOrder.remainingQuantity);
      const sellQuantity = new Decimal(sellOrder.remainingQuantity);
      const tradeQuantity = Decimal.min(buyQuantity, sellQuantity);
      const tradePrice = new Decimal(sellOrder.price); // Use ask price

      const trade = {
        id: uuidv4(),
        pair,
        buyOrderId: buyOrder.id,
        sellOrderId: sellOrder.id,
        buyerId: buyOrder.userId,
        sellerId: sellOrder.userId,
        quantity: tradeQuantity.toNumber(),
        price: tradePrice.toNumber(),
        totalValue: tradeQuantity.mul(tradePrice).toNumber(),
        timestamp: new Date(),
        fees: this.calculateFees(tradeQuantity, tradePrice)
      };

      // Update order quantities
      buyOrder.filledQuantity = buyOrder.filledQuantity.add(tradeQuantity);
      buyOrder.remainingQuantity = buyOrder.remainingQuantity.sub(tradeQuantity);
      sellOrder.filledQuantity = sellOrder.filledQuantity.add(tradeQuantity);
      sellOrder.remainingQuantity = sellOrder.remainingQuantity.sub(tradeQuantity);

      // Update order status
      if (buyOrder.remainingQuantity.lte(0)) {
        buyOrder.status = 'filled';
      } else {
        buyOrder.status = 'partially_filled';
      }

      if (sellOrder.remainingQuantity.lte(0)) {
        sellOrder.status = 'filled';
      } else {
        sellOrder.status = 'partially_filled';
      }

      // Store trade
      this.trades.push(trade);

      // Publish trade event
      await publishEvent('trade.executed', trade);

      // Emit real-time updates
      if (this.io) {
        this.io.to(`market-${pair}`).emit('trade', trade);
        this.io.to(`user-${buyOrder.userId}`).emit('trade', trade);
        this.io.to(`user-${sellOrder.userId}`).emit('trade', trade);
        this.io.to(`orders-${buyOrder.userId}`).emit('order-update', buyOrder);
        this.io.to(`orders-${sellOrder.userId}`).emit('order-update', sellOrder);
      }

      logger.info(`Trade executed: ${tradeQuantity} ${pair} at ${tradePrice}`);
    } catch (error) {
      logger.error('Error executing trade:', error);
      throw error;
    }
  }

  // Calculate trading fees
  calculateFees(quantity, price) {
    const makerFeeRate = new Decimal(0.001); // 0.1%
    const takerFeeRate = new Decimal(0.001); // 0.1%
    
    const totalValue = quantity.mul(price);
    const makerFee = totalValue.mul(makerFeeRate);
    const takerFee = totalValue.mul(takerFeeRate);

    return {
      maker: makerFee.toNumber(),
      taker: takerFee.toNumber(),
      total: makerFee.add(takerFee).toNumber()
    };
  }

  // Clean up filled orders from order book
  cleanupFilledOrders(pair) {
    const orderBook = this.orderBooks.get(pair);
    if (!orderBook) return;

    orderBook.bids = orderBook.bids.filter(order => order.status !== 'filled');
    orderBook.asks = orderBook.asks.filter(order => order.status !== 'filled');
  }

  // Cancel an order
  async cancelOrder(orderId) {
    try {
      const order = this.pendingOrders.get(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status === 'filled') {
        throw new Error('Cannot cancel filled order');
      }

      order.status = 'cancelled';
      this.pendingOrders.set(orderId, order);

      // Remove from order book
      const orderBook = this.orderBooks.get(order.pair);
      if (orderBook) {
        if (order.side === 'buy') {
          orderBook.bids = orderBook.bids.filter(o => o.id !== orderId);
        } else {
          orderBook.asks = orderBook.asks.filter(o => o.id !== orderId);
        }
      }

      // Publish order cancelled event
      await publishEvent('order.cancelled', {
        orderId,
        userId: order.userId,
        pair: order.pair
      });

      // Emit real-time update
      if (this.io) {
        this.io.to(`user-${order.userId}`).emit('order-update', order);
        this.io.to(`orders-${order.userId}`).emit('order-update', order);
      }

      logger.info(`Order cancelled: ${orderId}`);
      return order;
    } catch (error) {
      logger.error('Error cancelling order:', error);
      throw error;
    }
  }

  // Get order book for a pair
  getOrderBook(pair, limit = 20) {
    const orderBook = this.orderBooks.get(pair);
    if (!orderBook) {
      return { bids: [], asks: [] };
    }

    return {
      bids: orderBook.bids.slice(0, limit).map(order => ({
        price: order.price,
        quantity: order.remainingQuantity.toNumber()
      })),
      asks: orderBook.asks.slice(0, limit).map(order => ({
        price: order.price,
        quantity: order.remainingQuantity.toNumber()
      }))
    };
  }

  // Get recent trades for a pair
  getRecentTrades(pair, limit = 50) {
    return this.trades
      .filter(trade => trade.pair === pair)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  // Get user orders
  getUserOrders(userId, status = null) {
    let orders = Array.from(this.pendingOrders.values())
      .filter(order => order.userId === userId);

    if (status) {
      orders = orders.filter(order => order.status === status);
    }

    return orders.sort((a, b) => b.createdAt - a.createdAt);
  }
}

const matchingEngine = new MatchingEngine();

module.exports = matchingEngine;