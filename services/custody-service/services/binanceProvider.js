const axios = require('axios');
const crypto = require('crypto');
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

class BinanceProvider {
  constructor(apiKey, apiSecret, isTestnet = false) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseURL = isTestnet 
      ? 'https://testnet.binance.vision/api/v3'
      : 'https://api.binance.com/api/v3';
    this.futuresURL = isTestnet
      ? 'https://testnet.binancefuture.com/fapi/v1'
      : 'https://fapi.binance.com/fapi/v1';
  }

  // Generate signature for Binance API
  generateSignature(queryString) {
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(queryString)
      .digest('hex');
  }

  // Get account information
  async getAccountInfo() {
    try {
      const timestamp = Date.now();
      const queryString = `timestamp=${timestamp}`;
      const signature = this.generateSignature(queryString);

      const response = await axios.get(`${this.baseURL}/account`, {
        params: {
          timestamp,
          signature
        },
        headers: {
          'X-MBX-APIKEY': this.apiKey
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Binance getAccountInfo error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get trading pairs
  async getTradingPairs() {
    try {
      const response = await axios.get(`${this.baseURL}/exchangeInfo`);
      return response.data.symbols.map(symbol => ({
        symbol: symbol.symbol,
        baseAsset: symbol.baseAsset,
        quoteAsset: symbol.quoteAsset,
        status: symbol.status,
        isSpotTradingAllowed: symbol.isSpotTradingAllowed,
        isMarginTradingAllowed: symbol.isMarginTradingAllowed
      }));
    } catch (error) {
      logger.error('Binance getTradingPairs error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get 24hr ticker price change statistics
  async get24hrTicker(symbol = null) {
    try {
      const url = symbol ? `${this.baseURL}/ticker/24hr?symbol=${symbol}` : `${this.baseURL}/ticker/24hr`;
      const response = await axios.get(url);
      
      if (symbol) {
        return response.data;
      }
      return response.data;
    } catch (error) {
      logger.error('Binance get24hrTicker error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get order book
  async getOrderBook(symbol, limit = 100) {
    try {
      const response = await axios.get(`${this.baseURL}/depth`, {
        params: { symbol, limit }
      });
      return response.data;
    } catch (error) {
      logger.error('Binance getOrderBook error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get recent trades
  async getRecentTrades(symbol, limit = 500) {
    try {
      const response = await axios.get(`${this.baseURL}/trades`, {
        params: { symbol, limit }
      });
      return response.data;
    } catch (error) {
      logger.error('Binance getRecentTrades error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Place a new order
  async placeOrder(symbol, side, type, quantity, price = null, timeInForce = 'GTC') {
    try {
      const timestamp = Date.now();
      const params = {
        symbol,
        side: side.toUpperCase(),
        type: type.toUpperCase(),
        quantity: quantity.toString(),
        timestamp
      };

      if (price) {
        params.price = price.toString();
      }

      if (timeInForce) {
        params.timeInForce = timeInForce;
      }

      const queryString = Object.keys(params)
        .map(key => `${key}=${encodeURIComponent(params[key])}`)
        .join('&');

      const signature = this.generateSignature(queryString);

      const response = await axios.post(`${this.baseURL}/order`, {
        ...params,
        signature
      }, {
        headers: {
          'X-MBX-APIKEY': this.apiKey,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Binance placeOrder error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Cancel an order
  async cancelOrder(symbol, orderId) {
    try {
      const timestamp = Date.now();
      const queryString = `symbol=${symbol}&orderId=${orderId}&timestamp=${timestamp}`;
      const signature = this.generateSignature(queryString);

      const response = await axios.delete(`${this.baseURL}/order`, {
        params: {
          symbol,
          orderId,
          timestamp,
          signature
        },
        headers: {
          'X-MBX-APIKEY': this.apiKey
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Binance cancelOrder error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get order status
  async getOrderStatus(symbol, orderId) {
    try {
      const timestamp = Date.now();
      const queryString = `symbol=${symbol}&orderId=${orderId}&timestamp=${timestamp}`;
      const signature = this.generateSignature(queryString);

      const response = await axios.get(`${this.baseURL}/order`, {
        params: {
          symbol,
          orderId,
          timestamp,
          signature
        },
        headers: {
          'X-MBX-APIKEY': this.apiKey
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Binance getOrderStatus error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get all orders
  async getAllOrders(symbol, limit = 500) {
    try {
      const timestamp = Date.now();
      const queryString = `symbol=${symbol}&limit=${limit}&timestamp=${timestamp}`;
      const signature = this.generateSignature(queryString);

      const response = await axios.get(`${this.baseURL}/allOrders`, {
        params: {
          symbol,
          limit,
          timestamp,
          signature
        },
        headers: {
          'X-MBX-APIKEY': this.apiKey
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Binance getAllOrders error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get account trade list
  async getAccountTrades(symbol, limit = 500) {
    try {
      const timestamp = Date.now();
      const queryString = `symbol=${symbol}&limit=${limit}&timestamp=${timestamp}`;
      const signature = this.generateSignature(queryString);

      const response = await axios.get(`${this.baseURL}/myTrades`, {
        params: {
          symbol,
          limit,
          timestamp,
          signature
        },
        headers: {
          'X-MBX-APIKEY': this.apiKey
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Binance getAccountTrades error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get deposit history
  async getDepositHistory(coin = null, status = null, limit = 1000) {
    try {
      const timestamp = Date.now();
      let queryString = `timestamp=${timestamp}`;
      
      if (coin) queryString += `&coin=${coin}`;
      if (status) queryString += `&status=${status}`;
      if (limit) queryString += `&limit=${limit}`;

      const signature = this.generateSignature(queryString);

      const response = await axios.get(`${this.baseURL}/capital/deposit/hisrec`, {
        params: {
          timestamp,
          signature,
          ...(coin && { coin }),
          ...(status && { status }),
          ...(limit && { limit })
        },
        headers: {
          'X-MBX-APIKEY': this.apiKey
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Binance getDepositHistory error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get withdrawal history
  async getWithdrawalHistory(coin = null, status = null, limit = 1000) {
    try {
      const timestamp = Date.now();
      let queryString = `timestamp=${timestamp}`;
      
      if (coin) queryString += `&coin=${coin}`;
      if (status) queryString += `&status=${status}`;
      if (limit) queryString += `&limit=${limit}`;

      const signature = this.generateSignature(queryString);

      const response = await axios.get(`${this.baseURL}/capital/withdraw/history`, {
        params: {
          timestamp,
          signature,
          ...(coin && { coin }),
          ...(status && { status }),
          ...(limit && { limit })
        },
        headers: {
          'X-MBX-APIKEY': this.apiKey
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Binance getWithdrawalHistory error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get system status
  async getSystemStatus() {
    try {
      const response = await axios.get(`${this.baseURL}/systemStatus`);
      return response.data;
    } catch (error) {
      logger.error('Binance getSystemStatus error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Test connectivity
  async testConnectivity() {
    try {
      const response = await axios.get(`${this.baseURL}/ping`);
      return response.data;
    } catch (error) {
      logger.error('Binance testConnectivity error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get server time
  async getServerTime() {
    try {
      const response = await axios.get(`${this.baseURL}/time`);
      return response.data;
    } catch (error) {
      logger.error('Binance getServerTime error:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = BinanceProvider;