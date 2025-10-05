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
  clientId: 'auth-service',
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
    consumer = kafka.consumer({ groupId: 'auth-service-group' });

    await producer.connect();
    await consumer.connect();

    // Subscribe to relevant topics
    await consumer.subscribe({ 
      topics: ['user.created', 'user.updated', 'user.deleted', 'auth.failed'] 
    });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const data = JSON.parse(message.value.toString());
        logger.info(`Received message from topic ${topic}:`, data);
        
        // Handle different message types
        switch (topic) {
          case 'user.created':
            await handleUserCreated(data);
            break;
          case 'user.updated':
            await handleUserUpdated(data);
            break;
          case 'user.deleted':
            await handleUserDeleted(data);
            break;
          case 'auth.failed':
            await handleAuthFailed(data);
            break;
          default:
            logger.warn(`Unknown topic: ${topic}`);
        }
      },
    });

    logger.info('Kafka initialized successfully');
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
        key: data.userId || data.id,
        value: JSON.stringify({
          ...data,
          timestamp: new Date().toISOString(),
          service: 'auth-service'
        })
      }]
    });

    logger.info(`Published event to topic ${topic}:`, data);
  } catch (error) {
    logger.error(`Failed to publish event to topic ${topic}:`, error);
  }
};

const handleUserCreated = async (data) => {
  // Handle user created event
  logger.info('Handling user created event:', data);
};

const handleUserUpdated = async (data) => {
  // Handle user updated event
  logger.info('Handling user updated event:', data);
};

const handleUserDeleted = async (data) => {
  // Handle user deleted event
  logger.info('Handling user deleted event:', data);
};

const handleAuthFailed = async (data) => {
  // Handle authentication failed event
  logger.info('Handling auth failed event:', data);
};

module.exports = {
  initializeKafka,
  publishEvent
};