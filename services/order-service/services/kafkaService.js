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
  clientId: 'order-service',
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
    consumer = kafka.consumer({ groupId: 'order-service-group' });

    await producer.connect();
    await consumer.connect();

    // Subscribe to relevant topics
    await consumer.subscribe({ 
      topics: [
        'order.created',
        'order.cancelled',
        'trade.executed',
        'market.data.updated',
        'user.balance.updated'
      ] 
    });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const data = JSON.parse(message.value.toString());
        logger.info(`Received message from topic ${topic}:`, data);
        
        // Handle different message types
        switch (topic) {
          case 'order.created':
            await handleOrderCreated(data);
            break;
          case 'order.cancelled':
            await handleOrderCancelled(data);
            break;
          case 'trade.executed':
            await handleTradeExecuted(data);
            break;
          case 'market.data.updated':
            await handleMarketDataUpdated(data);
            break;
          case 'user.balance.updated':
            await handleUserBalanceUpdated(data);
            break;
          default:
            logger.warn(`Unknown topic: ${topic}`);
        }
      },
    });

    logger.info('Kafka initialized successfully for order service');
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
        key: data.orderId || data.tradeId || data.userId || 'order-service',
        value: JSON.stringify({
          ...data,
          timestamp: new Date().toISOString(),
          service: 'order-service'
        })
      }]
    });

    logger.info(`Published event to topic ${topic}:`, data);
  } catch (error) {
    logger.error(`Failed to publish event to topic ${topic}:`, error);
  }
};

const handleOrderCreated = async (data) => {
  logger.info('Handling order created event:', data);
  // Additional order processing logic can be added here
};

const handleOrderCancelled = async (data) => {
  logger.info('Handling order cancelled event:', data);
  // Additional order cancellation logic can be added here
};

const handleTradeExecuted = async (data) => {
  logger.info('Handling trade executed event:', data);
  // Additional trade processing logic can be added here
};

const handleMarketDataUpdated = async (data) => {
  logger.info('Handling market data updated event:', data);
  // Additional market data processing logic can be added here
};

const handleUserBalanceUpdated = async (data) => {
  logger.info('Handling user balance updated event:', data);
  // Additional balance processing logic can be added here
};

module.exports = {
  initializeKafka,
  publishEvent
};