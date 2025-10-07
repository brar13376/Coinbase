// In-memory storage for development
const trades = new Map();
let nextId = 1;

class Trade {
  constructor(data) {
    this._id = nextId++;
    this.buyOrderId = data.buyOrderId;
    this.sellOrderId = data.sellOrderId;
    this.buyerId = data.buyerId;
    this.sellerId = data.sellerId;
    this.symbol = data.symbol;
    this.amount = data.amount;
    this.price = data.price;
    this.total = data.total;
    this.fee = data.fee || 0;
    this.createdAt = new Date();
  }

  async save() {
    trades.set(this._id, this);
    return this;
  }

  static async findOne(query) {
    for (const trade of trades.values()) {
      if (query._id && trade._id === query._id) {
        return trade;
      }
    }
    return null;
  }

  static async find(query = {}) {
    const results = [];
    for (const trade of trades.values()) {
      let matches = true;
      for (const [key, value] of Object.entries(query)) {
        if (trade[key] !== value) {
          matches = false;
          break;
        }
      }
      if (matches) {
        results.push(trade);
      }
    }
    return results;
  }

  static async create(data) {
    const trade = new this(data);
    await trade.save();
    return trade;
  }
}

module.exports = Trade;