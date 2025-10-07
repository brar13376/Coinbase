// In-memory storage for development
const orders = new Map();
let nextId = 1;

class Order {
  constructor(data) {
    this._id = nextId++;
    this.userId = data.userId;
    this.symbol = data.symbol;
    this.type = data.type; // 'buy' or 'sell'
    this.side = data.side; // 'market' or 'limit'
    this.amount = data.amount;
    this.price = data.price;
    this.status = data.status || 'pending';
    this.filledAmount = data.filledAmount || 0;
    this.remainingAmount = data.remainingAmount || data.amount;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  async save() {
    this.updatedAt = new Date();
    orders.set(this._id, this);
    return this;
  }

  static async findOne(query) {
    for (const order of orders.values()) {
      if (query._id && order._id === query._id) {
        return order;
      }
    }
    return null;
  }

  static async find(query = {}) {
    const results = [];
    for (const order of orders.values()) {
      let matches = true;
      for (const [key, value] of Object.entries(query)) {
        if (order[key] !== value) {
          matches = false;
          break;
        }
      }
      if (matches) {
        results.push(order);
      }
    }
    return results;
  }

  static async create(data) {
    const order = new this(data);
    await order.save();
    return order;
  }
}

module.exports = Order;