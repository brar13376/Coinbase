const axios = require('axios');
const WebSocket = require('ws');
const winston = require('winston');
const { publishEvent } = require('./kafkaService');
const { setCache, getCache } = require('./redisService');

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

class MarketDataProvider {
  constructor(name, baseURL, wsURL = null) {
    this.name = name;
    this.baseURL = baseURL;
    this.wsURL = wsURL;
    this.wsConnection = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 5000;
    this.io = null;
  }

  setSocketIO(io) {
    this.io = io;
  }

  async initialize() {
    try {
      // Initialize WebSocket connection if available
      if (this.wsURL) {
        await this.connectWebSocket();
      }
      
      // Initialize REST API data
      await this.initializeRestData();
      
      logger.info(`${this.name} provider initialized successfully`);
    } catch (error) {
      logger.error(`Failed to initialize ${this.name} provider:`, error);
    }
  }

  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      try {
        this.wsConnection = new WebSocket(this.wsURL);
        
        this.wsConnection.on('open', () => {
          logger.info(`${this.name} WebSocket connected`);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        });

        this.wsConnection.on('message', (data) => {
          this.handleWebSocketMessage(data);
        });

        this.wsConnection.on('close', () => {
          logger.warn(`${this.name} WebSocket disconnected`);
          this.isConnected = false;
          this.handleReconnect();
        });

        this.wsConnection.on('error', (error) => {
          logger.error(`${this.name} WebSocket error:`, error);
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      logger.info(`Attempting to reconnect ${this.name} WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connectWebSocket().catch(error => {
          logger.error(`Reconnection attempt ${this.reconnectAttempts} failed:`, error);
        });
      }, this.reconnectInterval);
    } else {
      logger.error(`Max reconnection attempts reached for ${this.name}`);
    }
  }

  handleWebSocketMessage(data) {
    try {
      const message = JSON.parse(data.toString());
      this.processMarketData(message);
    } catch (error) {
      logger.error(`Error processing WebSocket message from ${this.name}:`, error);
    }
  }

  async processMarketData(data) {
    // This method should be overridden by specific providers
    logger.debug(`Processing market data from ${this.name}:`, data);
  }

  async initializeRestData() {
    // This method should be overridden by specific providers
    logger.info(`Initializing REST data for ${this.name}`);
  }

  async getTicker(symbol) {
    // This method should be overridden by specific providers
    throw new Error('getTicker method not implemented');
  }

  async getOrderBook(symbol) {
    // This method should be overridden by specific providers
    throw new Error('getOrderBook method not implemented');
  }

  async getTrades(symbol) {
    // This method should be overridden by specific providers
    throw new Error('getTrades method not implemented');
  }

  async getKlines(symbol, interval, limit = 100) {
    // This method should be overridden by specific providers
    throw new Error('getKlines method not implemented');
  }
}

class BinanceProvider extends MarketDataProvider {
  constructor() {
    super('Binance', 'https://api.binance.com/api/v3', 'wss://stream.binance.com:9443/ws/');
    this.streams = new Map();
  }

  async initializeRestData() {
    try {
      // Get exchange info
      const exchangeInfo = await axios.get(`${this.baseURL}/exchangeInfo`);
      const symbols = exchangeInfo.data.symbols
        .filter(symbol => symbol.status === 'TRADING')
        .map(symbol => ({
          symbol: symbol.symbol,
          baseAsset: symbol.baseAsset,
          quoteAsset: symbol.quoteAsset,
          status: symbol.status
        }));

      // Cache symbols
      await setCache('binance_symbols', symbols, 3600);
      
      // Get 24hr ticker for all symbols
      const ticker24hr = await axios.get(`${this.baseURL}/ticker/24hr`);
      const tickers = ticker24hr.data.map(ticker => ({
        symbol: ticker.symbol,
        price: parseFloat(ticker.lastPrice),
        priceChange: parseFloat(ticker.priceChange),
        priceChangePercent: parseFloat(ticker.priceChangePercent),
        volume: parseFloat(ticker.volume),
        highPrice: parseFloat(ticker.highPrice),
        lowPrice: parseFloat(ticker.lowPrice),
        openPrice: parseFloat(ticker.openPrice),
        count: parseInt(ticker.count)
      }));

      // Cache tickers
      await setCache('binance_tickers', tickers, 30);

      logger.info(`Initialized ${symbols.length} symbols and ${tickers.length} tickers from Binance`);
    } catch (error) {
      logger.error('Failed to initialize Binance REST data:', error);
    }
  }

  async connectWebSocket() {
    await super.connectWebSocket();
    
    // Subscribe to all ticker streams
    const streams = ['btcusdt@ticker', 'ethusdt@ticker', 'bnbusdt@ticker', 'adausdt@ticker'];
    const streamNames = streams.join('/');
    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streamNames}`;
    
    this.wsConnection = new WebSocket(wsUrl);
    
    this.wsConnection.on('open', () => {
      logger.info('Binance WebSocket connected');
      this.isConnected = true;
    });

    this.wsConnection.on('message', (data) => {
      this.handleWebSocketMessage(data);
    });

    this.wsConnection.on('close', () => {
      logger.warn('Binance WebSocket disconnected');
      this.isConnected = false;
      this.handleReconnect();
    });
  }

  async processMarketData(data) {
    try {
      if (data.stream && data.data) {
        const stream = data.stream;
        const tickerData = data.data;

        if (stream.includes('@ticker')) {
          const ticker = {
            symbol: tickerData.s,
            price: parseFloat(tickerData.c),
            priceChange: parseFloat(tickerData.P),
            priceChangePercent: parseFloat(tickerData.P),
            volume: parseFloat(tickerData.v),
            highPrice: parseFloat(tickerData.h),
            lowPrice: parseFloat(tickerData.l),
            openPrice: parseFloat(tickerData.o),
            count: parseInt(tickerData.n),
            timestamp: tickerData.E
          };

          // Cache the ticker
          await setCache(`ticker:${ticker.symbol}`, ticker, 30);

          // Publish to Kafka
          await publishEvent('market.data.updated', {
            provider: 'binance',
            symbol: ticker.symbol,
            price: ticker.price,
            priceChange: ticker.priceChange,
            priceChangePercent: ticker.priceChangePercent,
            volume: ticker.volume,
            timestamp: ticker.timestamp
          });

          // Emit to WebSocket clients
          if (this.io) {
            this.io.to(`market-${ticker.symbol}`).emit('ticker-update', ticker);
          }

          logger.debug(`Updated ticker for ${ticker.symbol}: ${ticker.price}`);
        }
      }
    } catch (error) {
      logger.error('Error processing Binance market data:', error);
    }
  }

  async getTicker(symbol) {
    try {
      const response = await axios.get(`${this.baseURL}/ticker/24hr?symbol=${symbol}`);
      return {
        symbol: response.data.symbol,
        price: parseFloat(response.data.lastPrice),
        priceChange: parseFloat(response.data.priceChange),
        priceChangePercent: parseFloat(response.data.priceChangePercent),
        volume: parseFloat(response.data.volume),
        highPrice: parseFloat(response.data.highPrice),
        lowPrice: parseFloat(response.data.lowPrice),
        openPrice: parseFloat(response.data.openPrice),
        count: parseInt(response.data.count)
      };
    } catch (error) {
      logger.error(`Failed to get ticker for ${symbol}:`, error);
      throw error;
    }
  }

  async getOrderBook(symbol, limit = 100) {
    try {
      const response = await axios.get(`${this.baseURL}/depth?symbol=${symbol}&limit=${limit}`);
      return {
        symbol: symbol,
        bids: response.data.bids.map(bid => [parseFloat(bid[0]), parseFloat(bid[1])]),
        asks: response.data.asks.map(ask => [parseFloat(ask[0]), parseFloat(ask[1])]),
        timestamp: response.data.lastUpdateId
      };
    } catch (error) {
      logger.error(`Failed to get order book for ${symbol}:`, error);
      throw error;
    }
  }

  async getTrades(symbol, limit = 100) {
    try {
      const response = await axios.get(`${this.baseURL}/trades?symbol=${symbol}&limit=${limit}`);
      return response.data.map(trade => ({
        id: trade.id,
        symbol: trade.symbol,
        price: parseFloat(trade.price),
        quantity: parseFloat(trade.qty),
        side: trade.isBuyerMaker ? 'sell' : 'buy',
        timestamp: trade.time
      }));
    } catch (error) {
      logger.error(`Failed to get trades for ${symbol}:`, error);
      throw error;
    }
  }

  async getKlines(symbol, interval, limit = 100) {
    try {
      const response = await axios.get(`${this.baseURL}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
      return response.data.map(kline => ({
        openTime: kline[0],
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
        closeTime: kline[6],
        quoteAssetVolume: parseFloat(kline[7]),
        numberOfTrades: parseInt(kline[8]),
        takerBuyBaseAssetVolume: parseFloat(kline[9]),
        takerBuyQuoteAssetVolume: parseFloat(kline[10])
      }));
    } catch (error) {
      logger.error(`Failed to get klines for ${symbol}:`, error);
      throw error;
    }
  }
}

class CoinbaseProvider extends MarketDataProvider {
  constructor() {
    super('Coinbase', 'https://api.exchange.coinbase.com', 'wss://ws-feed.exchange.coinbase.com');
  }

  async initializeRestData() {
    try {
      // Get products
      const products = await axios.get(`${this.baseURL}/products`);
      const activeProducts = products.data
        .filter(product => product.status === 'online')
        .map(product => ({
          id: product.id,
          baseCurrency: product.base_currency,
          quoteCurrency: product.quote_currency,
          status: product.status
        }));

      // Cache products
      await setCache('coinbase_products', activeProducts, 3600);

      logger.info(`Initialized ${activeProducts.length} products from Coinbase`);
    } catch (error) {
      logger.error('Failed to initialize Coinbase REST data:', error);
    }
  }

  async getTicker(symbol) {
    try {
      const response = await axios.get(`${this.baseURL}/products/${symbol}/ticker`);
      return {
        symbol: symbol,
        price: parseFloat(response.data.price),
        priceChange: 0, // Coinbase doesn't provide 24h change in ticker
        priceChangePercent: 0,
        volume: 0, // Coinbase doesn't provide volume in ticker
        highPrice: 0,
        lowPrice: 0,
        openPrice: 0,
        count: 0
      };
    } catch (error) {
      logger.error(`Failed to get ticker for ${symbol}:`, error);
      throw error;
    }
  }

  async getOrderBook(symbol, level = 2) {
    try {
      const response = await axios.get(`${this.baseURL}/products/${symbol}/book?level=${level}`);
      return {
        symbol: symbol,
        bids: response.data.bids.map(bid => [parseFloat(bid[0]), parseFloat(bid[1])]),
        asks: response.data.asks.map(ask => [parseFloat(ask[0]), parseFloat(ask[1])]),
        timestamp: response.data.sequence
      };
    } catch (error) {
      logger.error(`Failed to get order book for ${symbol}:`, error);
      throw error;
    }
  }

  async getTrades(symbol, limit = 100) {
    try {
      const response = await axios.get(`${this.baseURL}/products/${symbol}/trades?limit=${limit}`);
      return response.data.map(trade => ({
        id: trade.trade_id,
        symbol: symbol,
        price: parseFloat(trade.price),
        quantity: parseFloat(trade.size),
        side: trade.side,
        timestamp: new Date(trade.time).getTime()
      }));
    } catch (error) {
      logger.error(`Failed to get trades for ${symbol}:`, error);
      throw error;
    }
  }
}

// Initialize all providers
const providers = {
  binance: new BinanceProvider(),
  coinbase: new CoinbaseProvider()
};

const initializeMarketDataProviders = async (io) => {
  try {
    // Set Socket.IO for all providers
    Object.values(providers).forEach(provider => {
      provider.setSocketIO(io);
    });

    // Initialize all providers
    await Promise.all(
      Object.values(providers).map(provider => provider.initialize())
    );

    logger.info('All market data providers initialized');
  } catch (error) {
    logger.error('Failed to initialize market data providers:', error);
  }
};

const getProvider = (name) => {
  return providers[name];
};

const getAllProviders = () => {
  return providers;
};

module.exports = {
  MarketDataProvider,
  BinanceProvider,
  CoinbaseProvider,
  initializeMarketDataProviders,
  getProvider,
  getAllProviders
};