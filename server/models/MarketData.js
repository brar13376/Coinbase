// In-memory storage for development
const marketData = new Map();

class MarketData {
  constructor(data) {
    this.symbol = data.symbol;
    this.price = data.price;
    this.change24h = data.change24h || 0;
    this.volume24h = data.volume24h || 0;
    this.high24h = data.high24h || data.price;
    this.low24h = data.low24h || data.price;
    this.lastUpdated = new Date();
  }

  async save() {
    marketData.set(this.symbol, this);
    return this;
  }

  static async findOne(query) {
    if (query.symbol) {
      return marketData.get(query.symbol) || null;
    }
    return null;
  }

  static async find(query = {}) {
    const results = [];
    for (const data of marketData.values()) {
      let matches = true;
      for (const [key, value] of Object.entries(query)) {
        if (data[key] !== value) {
          matches = false;
          break;
        }
      }
      if (matches) {
        results.push(data);
      }
    }
    return results;
  }

  static async create(data) {
    const marketDataItem = new this(data);
    await marketDataItem.save();
    return marketDataItem;
  }

  static async updateOne(query, update) {
    const item = await this.findOne(query);
    if (!item) return { modifiedCount: 0 };
    
    if (update.$set) {
      Object.assign(item, update.$set);
    }
    
    await item.save();
    return { modifiedCount: 1 };
  }
}

module.exports = MarketData;