// In-memory storage for development
const wallets = new Map();
let nextId = 1;

class Wallet {
  constructor(data) {
    this._id = nextId++;
    this.userId = data.userId;
    this.currency = data.currency;
    this.balance = data.balance || 0;
    this.lockedBalance = data.lockedBalance || 0;
    this.address = data.address;
    this.privateKey = data.privateKey;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  async save() {
    this.updatedAt = new Date();
    wallets.set(this._id, this);
    return this;
  }

  static async findOne(query) {
    for (const wallet of wallets.values()) {
      if (query.userId && wallet.userId === query.userId) {
        return wallet;
      }
      if (query._id && wallet._id === query._id) {
        return wallet;
      }
      if (query.address && wallet.address === query.address) {
        return wallet;
      }
    }
    return null;
  }

  static async find(query = {}) {
    const results = [];
    for (const wallet of wallets.values()) {
      let matches = true;
      for (const [key, value] of Object.entries(query)) {
        if (wallet[key] !== value) {
          matches = false;
          break;
        }
      }
      if (matches) {
        results.push(wallet);
      }
    }
    return results;
  }

  static async create(data) {
    const wallet = new this(data);
    await wallet.save();
    return wallet;
  }
}

module.exports = Wallet;