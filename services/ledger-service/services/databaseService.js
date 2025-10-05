const { Sequelize } = require('sequelize');
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

let sequelize = null;

const initializeDatabase = async () => {
  try {
    sequelize = new Sequelize(process.env.POSTGRES_URL || 'postgresql://postgres:password@localhost:5432/coinbase_clone_ledger', {
      logging: false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    });

    // Test connection
    await sequelize.authenticate();
    logger.info('PostgreSQL connected successfully');

    // Define models
    defineModels();

    // Sync database
    await sequelize.sync({ alter: true });
    logger.info('Database synchronized');

  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
};

const defineModels = () => {
  // Transaction model
  const Transaction = sequelize.define('Transaction', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: Sequelize.UUID,
      allowNull: false,
      index: true
    },
    type: {
      type: Sequelize.ENUM('deposit', 'withdrawal', 'trade', 'fee', 'transfer', 'refund'),
      allowNull: false
    },
    status: {
      type: Sequelize.ENUM('pending', 'completed', 'failed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'
    },
    currency: {
      type: Sequelize.STRING(10),
      allowNull: false
    },
    amount: {
      type: Sequelize.DECIMAL(28, 18),
      allowNull: false
    },
    balance: {
      type: Sequelize.DECIMAL(28, 18),
      allowNull: false
    },
    reference: {
      type: Sequelize.STRING(255),
      allowNull: true
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    metadata: {
      type: Sequelize.JSONB,
      allowNull: true
    },
    processedAt: {
      type: Sequelize.DATE,
      allowNull: true
    }
  }, {
    tableName: 'transactions',
    timestamps: true,
    indexes: [
      { fields: ['userId', 'createdAt'] },
      { fields: ['type', 'status'] },
      { fields: ['currency', 'createdAt'] },
      { fields: ['reference'] }
    ]
  });

  // Account balance model
  const AccountBalance = sequelize.define('AccountBalance', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: Sequelize.UUID,
      allowNull: false,
      unique: 'user_currency'
    },
    currency: {
      type: Sequelize.STRING(10),
      allowNull: false,
      unique: 'user_currency'
    },
    balance: {
      type: Sequelize.DECIMAL(28, 18),
      allowNull: false,
      defaultValue: 0
    },
    lockedBalance: {
      type: Sequelize.DECIMAL(28, 18),
      allowNull: false,
      defaultValue: 0
    },
    totalDeposits: {
      type: Sequelize.DECIMAL(28, 18),
      allowNull: false,
      defaultValue: 0
    },
    totalWithdrawals: {
      type: Sequelize.DECIMAL(28, 18),
      allowNull: false,
      defaultValue: 0
    },
    totalTrades: {
      type: Sequelize.DECIMAL(28, 18),
      allowNull: false,
      defaultValue: 0
    }
  }, {
    tableName: 'account_balances',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['currency'] }
    ]
  });

  // Audit log model
  const AuditLog = sequelize.define('AuditLog', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: Sequelize.UUID,
      allowNull: true,
      index: true
    },
    action: {
      type: Sequelize.STRING(100),
      allowNull: false
    },
    resource: {
      type: Sequelize.STRING(100),
      allowNull: false
    },
    resourceId: {
      type: Sequelize.UUID,
      allowNull: true
    },
    oldValues: {
      type: Sequelize.JSONB,
      allowNull: true
    },
    newValues: {
      type: Sequelize.JSONB,
      allowNull: true
    },
    ipAddress: {
      type: Sequelize.INET,
      allowNull: true
    },
    userAgent: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    metadata: {
      type: Sequelize.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'audit_logs',
    timestamps: true,
    indexes: [
      { fields: ['userId', 'createdAt'] },
      { fields: ['action', 'createdAt'] },
      { fields: ['resource', 'resourceId'] },
      { fields: ['createdAt'] }
    ]
  });

  // Trade model
  const Trade = sequelize.define('Trade', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true
    },
    buyOrderId: {
      type: Sequelize.UUID,
      allowNull: false
    },
    sellOrderId: {
      type: Sequelize.UUID,
      allowNull: false
    },
    buyerId: {
      type: Sequelize.UUID,
      allowNull: false
    },
    sellerId: {
      type: Sequelize.UUID,
      allowNull: false
    },
    pair: {
      type: Sequelize.STRING(20),
      allowNull: false
    },
    quantity: {
      type: Sequelize.DECIMAL(28, 18),
      allowNull: false
    },
    price: {
      type: Sequelize.DECIMAL(28, 18),
      allowNull: false
    },
    totalValue: {
      type: Sequelize.DECIMAL(28, 18),
      allowNull: false
    },
    fees: {
      type: Sequelize.JSONB,
      allowNull: false
    },
    status: {
      type: Sequelize.ENUM('pending', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'pending'
    }
  }, {
    tableName: 'trades',
    timestamps: true,
    indexes: [
      { fields: ['pair', 'createdAt'] },
      { fields: ['buyerId', 'createdAt'] },
      { fields: ['sellerId', 'createdAt'] },
      { fields: ['buyOrderId'] },
      { fields: ['sellOrderId'] }
    ]
  });

  // Export models
  module.exports = {
    Transaction,
    AccountBalance,
    AuditLog,
    Trade,
    sequelize
  };
};

const getSequelize = () => {
  if (!sequelize) {
    throw new Error('Database not initialized');
  }
  return sequelize;
};

module.exports = {
  initializeDatabase,
  getSequelize
};