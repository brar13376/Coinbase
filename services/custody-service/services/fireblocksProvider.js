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

class FireblocksProvider {
  constructor(apiKey, privateKey, baseURL = 'https://api.fireblocks.io') {
    this.apiKey = apiKey;
    this.privateKey = privateKey;
    this.baseURL = baseURL;
  }

  // Generate JWT token for Fireblocks API
  generateJWT() {
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      uri: this.baseURL,
      nonce: Math.random().toString(36).substring(2),
      iat: now,
      exp: now + 55, // 55 seconds expiration
      sub: this.apiKey,
      bodyHash: crypto.createHash('sha256').update('').digest('hex')
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createSign('RSA-SHA256')
      .update(`${encodedHeader}.${encodedPayload}`)
      .sign(this.privateKey, 'base64url');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  // Make authenticated request
  async makeRequest(method, endpoint, data = null) {
    try {
      const token = this.generateJWT();
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      logger.error('Fireblocks API error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get vault accounts
  async getVaultAccounts() {
    try {
      return await this.makeRequest('GET', '/v1/vault/accounts');
    } catch (error) {
      logger.error('Fireblocks getVaultAccounts error:', error);
      throw error;
    }
  }

  // Get vault account by ID
  async getVaultAccount(accountId) {
    try {
      return await this.makeRequest('GET', `/v1/vault/accounts/${accountId}`);
    } catch (error) {
      logger.error('Fireblocks getVaultAccount error:', error);
      throw error;
    }
  }

  // Get vault account assets
  async getVaultAccountAssets(accountId) {
    try {
      return await this.makeRequest('GET', `/v1/vault/accounts/${accountId}`);
    } catch (error) {
      logger.error('Fireblocks getVaultAccountAssets error:', error);
      throw error;
    }
  }

  // Create vault account
  async createVaultAccount(name, hiddenOnUI = false) {
    try {
      const data = {
        name,
        hiddenOnUI
      };
      return await this.makeRequest('POST', '/v1/vault/accounts', data);
    } catch (error) {
      logger.error('Fireblocks createVaultAccount error:', error);
      throw error;
    }
  }

  // Get transactions
  async getTransactions(before = null, after = null, status = null, limit = 200) {
    try {
      let endpoint = '/v1/transactions';
      const params = new URLSearchParams();
      
      if (before) params.append('before', before);
      if (after) params.append('after', after);
      if (status) params.append('status', status);
      if (limit) params.append('limit', limit);

      if (params.toString()) {
        endpoint += `?${params.toString()}`;
      }

      return await this.makeRequest('GET', endpoint);
    } catch (error) {
      logger.error('Fireblocks getTransactions error:', error);
      throw error;
    }
  }

  // Get transaction by ID
  async getTransaction(txId) {
    try {
      return await this.makeRequest('GET', `/v1/transactions/${txId}`);
    } catch (error) {
      logger.error('Fireblocks getTransaction error:', error);
      throw error;
    }
  }

  // Create transaction
  async createTransaction(assetId, source, destination, amount, note = null) {
    try {
      const data = {
        assetId,
        source: {
          type: source.type,
          id: source.id
        },
        destination: {
          type: destination.type,
          id: destination.id
        },
        amount: amount.toString()
      };

      if (note) {
        data.note = note;
      }

      return await this.makeRequest('POST', '/v1/transactions', data);
    } catch (error) {
      logger.error('Fireblocks createTransaction error:', error);
      throw error;
    }
  }

  // Cancel transaction
  async cancelTransaction(txId) {
    try {
      return await this.makeRequest('POST', `/v1/transactions/${txId}/cancel`);
    } catch (error) {
      logger.error('Fireblocks cancelTransaction error:', error);
      throw error;
    }
  }

  // Get supported assets
  async getSupportedAssets() {
    try {
      return await this.makeRequest('GET', '/v1/supported_assets');
    } catch (error) {
      logger.error('Fireblocks getSupportedAssets error:', error);
      throw error;
    }
  }

  // Get exchange accounts
  async getExchangeAccounts() {
    try {
      return await this.makeRequest('GET', '/v1/exchange_accounts');
    } catch (error) {
      logger.error('Fireblocks getExchangeAccounts error:', error);
      throw error;
    }
  }

  // Get external wallets
  async getExternalWallets() {
    try {
      return await this.makeRequest('GET', '/v1/external_wallets');
    } catch (error) {
      logger.error('Fireblocks getExternalWallets error:', error);
      throw error;
    }
  }

  // Get internal wallets
  async getInternalWallets() {
    try {
      return await this.makeRequest('GET', '/v1/internal_wallets');
    } catch (error) {
      logger.error('Fireblocks getInternalWallets error:', error);
      throw error;
    }
  }

  // Get network connections
  async getNetworkConnections() {
    try {
      return await this.makeRequest('GET', '/v1/network_connections');
    } catch (error) {
      logger.error('Fireblocks getNetworkConnections error:', error);
      throw error;
    }
  }

  // Get users
  async getUsers() {
    try {
      return await this.makeRequest('GET', '/v1/users');
    } catch (error) {
      logger.error('Fireblocks getUsers error:', error);
      throw error;
    }
  }

  // Get user by ID
  async getUser(userId) {
    try {
      return await this.makeRequest('GET', `/v1/users/${userId}`);
    } catch (error) {
      logger.error('Fireblocks getUser error:', error);
      throw error;
    }
  }

  // Get audit logs
  async getAuditLogs(before = null, after = null, limit = 200) {
    try {
      let endpoint = '/v1/audits';
      const params = new URLSearchParams();
      
      if (before) params.append('before', before);
      if (after) params.append('after', after);
      if (limit) params.append('limit', limit);

      if (params.toString()) {
        endpoint += `?${params.toString()}`;
      }

      return await this.makeRequest('GET', endpoint);
    } catch (error) {
      logger.error('Fireblocks getAuditLogs error:', error);
      throw error;
    }
  }

  // Test connectivity
  async testConnectivity() {
    try {
      await this.makeRequest('GET', '/v1/supported_assets');
      return { status: 'connected' };
    } catch (error) {
      logger.error('Fireblocks testConnectivity error:', error);
      throw error;
    }
  }
}

module.exports = FireblocksProvider;