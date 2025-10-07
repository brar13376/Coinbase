const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// In-memory storage for development
const users = new Map();
let nextId = 1;

class User {
  constructor(data) {
    this._id = nextId++;
    this.email = data.email;
    this.password = data.password;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.dateOfBirth = new Date(data.dateOfBirth);
    this.phone = data.phone;
    this.address = data.address || {};
    this.googleId = data.googleId;
    this.facebookId = data.facebookId;
    this.isEmailVerified = data.isEmailVerified || false;
    this.emailVerificationToken = data.emailVerificationToken;
    this.emailVerificationExpires = data.emailVerificationExpires;
    this.passwordResetToken = data.passwordResetToken;
    this.passwordResetExpires = data.passwordResetExpires;
    this.twoFactorSecret = data.twoFactorSecret;
    this.twoFactorEnabled = data.twoFactorEnabled || false;
    this.kycStatus = data.kycStatus || 'not_started';
    this.kycDocuments = data.kycDocuments || [];
    this.selfieImage = data.selfieImage;
    this.accountStatus = data.accountStatus || 'pending_verification';
    this.tradingLimits = data.tradingLimits || {
      daily: 10000,
      monthly: 100000
    };
    this.lastLogin = data.lastLogin;
    this.loginAttempts = data.loginAttempts || 0;
    this.lockUntil = data.lockUntil;
    this.preferences = data.preferences || {
      currency: 'USD',
      language: 'en',
      notifications: {
        email: true,
        sms: false,
        push: true
      }
    };
    this.securityQuestions = data.securityQuestions || [];
    this.apiKeys = data.apiKeys || [];
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  // Virtual for account lock status
  get isLocked() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
  }

  // Pre-save middleware to hash password
  async save() {
    if (this.password && !this.password.startsWith('$2')) {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
    }
    this.updatedAt = new Date();
    users.set(this._id, this);
    return this;
  }

  // Method to compare password
  async comparePassword(candidatePassword) {
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
  }

  // Method to generate email verification token
  generateEmailVerificationToken() {
    const token = crypto.randomBytes(32).toString('hex');
    this.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
    this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    return token;
  }

  // Method to generate password reset token
  generatePasswordResetToken() {
    const token = crypto.randomBytes(32).toString('hex');
    this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
    this.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    return token;
  }

  // Method to increment login attempts
  async incLoginAttempts() {
    // If we have a previous lock that has expired, restart at 1
    if (this.lockUntil && this.lockUntil < Date.now()) {
      this.lockUntil = undefined;
      this.loginAttempts = 1;
    } else {
      this.loginAttempts += 1;
    }
    
    // Lock account after 5 failed attempts for 2 hours
    if (this.loginAttempts >= 5 && !this.isLocked) {
      this.lockUntil = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
    }
    
    await this.save();
  }

  // Method to reset login attempts
  async resetLoginAttempts() {
    this.loginAttempts = 0;
    this.lockUntil = undefined;
    await this.save();
  }

  // Method to get public profile
  getPublicProfile() {
    const userObject = { ...this };
    delete userObject.password;
    delete userObject.twoFactorSecret;
    delete userObject.emailVerificationToken;
    delete userObject.passwordResetToken;
    delete userObject.securityQuestions;
    delete userObject.apiKeys;
    return userObject;
  }

  // Static methods for database operations
  static async findOne(query) {
    for (const user of users.values()) {
      if (query.email && user.email === query.email) {
        return user;
      }
      if (query._id && user._id === query._id) {
        return user;
      }
      if (query.googleId && user.googleId === query.googleId) {
        return user;
      }
      if (query.facebookId && user.facebookId === query.facebookId) {
        return user;
      }
      if (query.emailVerificationToken && user.emailVerificationToken === query.emailVerificationToken) {
        return user;
      }
      if (query.passwordResetToken && user.passwordResetToken === query.passwordResetToken) {
        return user;
      }
    }
    return null;
  }

  static async findById(id) {
    return users.get(parseInt(id)) || null;
  }

  static async find(query = {}) {
    const results = [];
    for (const user of users.values()) {
      let matches = true;
      for (const [key, value] of Object.entries(query)) {
        if (user[key] !== value) {
          matches = false;
          break;
        }
      }
      if (matches) {
        results.push(user);
      }
    }
    return results;
  }

  static async countDocuments(query = {}) {
    const results = await this.find(query);
    return results.length;
  }

  static async deleteOne(query) {
    for (const [id, user] of users.entries()) {
      if (query._id && user._id === query._id) {
        users.delete(id);
        return { deletedCount: 1 };
      }
      if (query.email && user.email === query.email) {
        users.delete(id);
        return { deletedCount: 1 };
      }
    }
    return { deletedCount: 0 };
  }

  static async updateOne(query, update) {
    const user = await this.findOne(query);
    if (!user) return { modifiedCount: 0 };
    
    if (update.$set) {
      Object.assign(user, update.$set);
    }
    if (update.$unset) {
      for (const key of Object.keys(update.$unset)) {
        delete user[key];
      }
    }
    if (update.$inc) {
      for (const [key, value] of Object.entries(update.$inc)) {
        user[key] = (user[key] || 0) + value;
      }
    }
    
    await user.save();
    return { modifiedCount: 1 };
  }

  // Method to update user
  async updateOne(update) {
    if (update.$set) {
      Object.assign(this, update.$set);
    }
    if (update.$unset) {
      for (const key of Object.keys(update.$unset)) {
        delete this[key];
      }
    }
    if (update.$inc) {
      for (const [key, value] of Object.entries(update.$inc)) {
        this[key] = (this[key] || 0) + value;
      }
    }
    
    await this.save();
    return { modifiedCount: 1 };
  }
}

module.exports = User;