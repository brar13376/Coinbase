const { Kafka } = require('kafkajs');
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

const kafka = Kafka({
  clientId: 'ledger-service',
  brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

let producer = null;
let consumer = null;

const initializeKafka = async () => {
  try {
    producer = kafka.producer();
    consumer = kafka.consumer({ groupId: 'ledger-service-group' });

    await producer.connect();
    await consumer.connect();

    // Subscribe to relevant topics
    await consumer.subscribe({ 
      topics: [
        'trade.executed',
        'order.created',
        'order.cancelled',
        'user.balance.updated',
        'deposit.completed',
        'withdrawal.completed',
        'fee.charged'
      ] 
    });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const data = JSON.parse(message.value.toString());
        logger.info(`Received message from topic ${topic}:`, data);
        
        // Handle different message types
        switch (topic) {
          case 'trade.executed':
            await handleTradeExecuted(data);
            break;
          case 'order.created':
            await handleOrderCreated(data);
            break;
          case 'order.cancelled':
            await handleOrderCancelled(data);
            break;
          case 'user.balance.updated':
            await handleUserBalanceUpdated(data);
            break;
          case 'deposit.completed':
            await handleDepositCompleted(data);
            break;
          case 'withdrawal.completed':
            await handleWithdrawalCompleted(data);
            break;
          case 'fee.charged':
            await handleFeeCharged(data);
            break;
          default:
            logger.warn(`Unknown topic: ${topic}`);
        }
      },
    });

    logger.info('Kafka initialized successfully for ledger service');
  } catch (error) {
    logger.error('Kafka initialization failed:', error);
  }
};

const publishEvent = async (topic, data) => {
  try {
    if (!producer) {
      throw new Error('Kafka producer not initialized');
    }

    await producer.send({
      topic,
      messages: [{
        key: data.transactionId || data.userId || 'ledger-service',
        value: JSON.stringify({
          ...data,
          timestamp: new Date().toISOString(),
          service: 'ledger-service'
        })
      }]
    });

    logger.info(`Published event to topic ${topic}:`, data);
  } catch (error) {
    logger.error(`Failed to publish event to topic ${topic}:`, error);
  }
};

const handleTradeExecuted = async (data) => {
  try {
    const { Transaction, Trade, AccountBalance } = require('./databaseService');
    
    // Create trade record
    const trade = await Trade.create({
      id: data.id,
      buyOrderId: data.buyOrderId,
      sellOrderId: data.sellOrderId,
      buyerId: data.buyerId,
      sellerId: data.sellerId,
      pair: data.pair,
      quantity: data.quantity,
      price: data.price,
      totalValue: data.totalValue,
      fees: data.fees,
      status: 'completed'
    });

    // Update buyer balance
    const [buyerBalance, buyerCreated] = await AccountBalance.findOrCreate({
      where: { userId: data.buyerId, currency: data.pair.split('/')[0] },
      defaults: { balance: 0, lockedBalance: 0 }
    });

    await buyerBalance.increment('balance', { by: data.quantity });
    await buyerBalance.increment('totalTrades', { by: data.quantity });

    // Update seller balance
    const [sellerBalance, sellerCreated] = await AccountBalance.findOrCreate({
      where: { userId: data.sellerId, currency: data.pair.split('/')[0] },
      defaults: { balance: 0, lockedBalance: 0 }
    });

    await sellerBalance.decrement('balance', { by: data.quantity });
    await sellerBalance.increment('totalTrades', { by: data.quantity });

    // Create transaction records
    await Transaction.create({
      userId: data.buyerId,
      type: 'trade',
      status: 'completed',
      currency: data.pair.split('/')[0],
      amount: data.quantity,
      balance: buyerBalance.balance + data.quantity,
      reference: trade.id,
      description: `Bought ${data.quantity} ${data.pair.split('/')[0]} at ${data.price}`,
      metadata: { tradeId: trade.id, pair: data.pair }
    });

    await Transaction.create({
      userId: data.sellerId,
      type: 'trade',
      status: 'completed',
      currency: data.pair.split('/')[0],
      amount: -data.quantity,
      balance: sellerBalance.balance - data.quantity,
      reference: trade.id,
      description: `Sold ${data.quantity} ${data.pair.split('/')[0]} at ${data.price}`,
      metadata: { tradeId: trade.id, pair: data.pair }
    });

    logger.info(`Trade recorded: ${trade.id}`);
  } catch (error) {
    logger.error('Error handling trade executed:', error);
  }
};

const handleOrderCreated = async (data) => {
  try {
    const { Transaction, AccountBalance } = require('./databaseService');
    
    // Lock balance for order
    const [balance, created] = await AccountBalance.findOrCreate({
      where: { userId: data.userId, currency: data.pair.split('/')[1] },
      defaults: { balance: 0, lockedBalance: 0 }
    });

    const lockAmount = data.side === 'buy' ? data.quantity * data.price : data.quantity;
    await balance.increment('lockedBalance', { by: lockAmount });

    // Create transaction record
    await Transaction.create({
      userId: data.userId,
      type: 'trade',
      status: 'pending',
      currency: data.pair.split('/')[1],
      amount: -lockAmount,
      balance: balance.balance,
      reference: data.orderId,
      description: `Order created: ${data.side} ${data.quantity} ${data.pair}`,
      metadata: { orderId: data.orderId, pair: data.pair, side: data.side }
    });

    logger.info(`Order balance locked: ${data.orderId}`);
  } catch (error) {
    logger.error('Error handling order created:', error);
  }
};

const handleOrderCancelled = async (data) => {
  try {
    const { Transaction, AccountBalance } = require('./databaseService');
    
    // Unlock balance for cancelled order
    const balance = await AccountBalance.findOne({
      where: { userId: data.userId, currency: data.pair.split('/')[1] }
    });

    if (balance) {
      // This would need to be calculated based on the original order
      // For now, we'll just log it
      logger.info(`Order cancelled, balance should be unlocked: ${data.orderId}`);
    }

    logger.info(`Order cancelled: ${data.orderId}`);
  } catch (error) {
    logger.error('Error handling order cancelled:', error);
  }
};

const handleUserBalanceUpdated = async (data) => {
  try {
    const { AccountBalance } = require('./databaseService');
    
    await AccountBalance.upsert({
      userId: data.userId,
      currency: data.currency,
      balance: data.balance,
      lockedBalance: data.lockedBalance || 0
    });

    logger.info(`User balance updated: ${data.userId} - ${data.currency}`);
  } catch (error) {
    logger.error('Error handling user balance updated:', error);
  }
};

const handleDepositCompleted = async (data) => {
  try {
    const { Transaction, AccountBalance } = require('./databaseService');
    
    // Update balance
    const [balance, created] = await AccountBalance.findOrCreate({
      where: { userId: data.userId, currency: data.currency },
      defaults: { balance: 0, lockedBalance: 0 }
    });

    await balance.increment('balance', { by: data.amount });
    await balance.increment('totalDeposits', { by: data.amount });

    // Create transaction record
    await Transaction.create({
      userId: data.userId,
      type: 'deposit',
      status: 'completed',
      currency: data.currency,
      amount: data.amount,
      balance: balance.balance + data.amount,
      reference: data.reference,
      description: `Deposit: ${data.amount} ${data.currency}`,
      metadata: { depositId: data.depositId, method: data.method }
    });

    logger.info(`Deposit completed: ${data.userId} - ${data.amount} ${data.currency}`);
  } catch (error) {
    logger.error('Error handling deposit completed:', error);
  }
};

const handleWithdrawalCompleted = async (data) => {
  try {
    const { Transaction, AccountBalance } = require('./databaseService');
    
    // Update balance
    const balance = await AccountBalance.findOne({
      where: { userId: data.userId, currency: data.currency }
    });

    if (balance) {
      await balance.decrement('balance', { by: data.amount });
      await balance.increment('totalWithdrawals', { by: data.amount });

      // Create transaction record
      await Transaction.create({
        userId: data.userId,
        type: 'withdrawal',
        status: 'completed',
        currency: data.currency,
        amount: -data.amount,
        balance: balance.balance - data.amount,
        reference: data.reference,
        description: `Withdrawal: ${data.amount} ${data.currency}`,
        metadata: { withdrawalId: data.withdrawalId, method: data.method }
      });
    }

    logger.info(`Withdrawal completed: ${data.userId} - ${data.amount} ${data.currency}`);
  } catch (error) {
    logger.error('Error handling withdrawal completed:', error);
  }
};

const handleFeeCharged = async (data) => {
  try {
    const { Transaction, AccountBalance } = require('./databaseService');
    
    // Update balance
    const balance = await AccountBalance.findOne({
      where: { userId: data.userId, currency: data.currency }
    });

    if (balance) {
      await balance.decrement('balance', { by: data.amount });

      // Create transaction record
      await Transaction.create({
        userId: data.userId,
        type: 'fee',
        status: 'completed',
        currency: data.currency,
        amount: -data.amount,
        balance: balance.balance - data.amount,
        reference: data.reference,
        description: `Fee: ${data.amount} ${data.currency}`,
        metadata: { feeType: data.feeType, orderId: data.orderId }
      });
    }

    logger.info(`Fee charged: ${data.userId} - ${data.amount} ${data.currency}`);
  } catch (error) {
    logger.error('Error handling fee charged:', error);
  }
};

module.exports = {
  initializeKafka,
  publishEvent
};