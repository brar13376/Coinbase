# Coinbase Clone - Full-Stack Cryptocurrency Exchange Platform

A comprehensive cryptocurrency exchange platform built with React, Node.js, and MongoDB, featuring all the core functionality of Coinbase.com.

## 🚀 Features

### 🔐 Authentication & Security
- **User Registration & Login** with email verification
- **OAuth2 Integration** (Google, Facebook)
- **Two-Factor Authentication (2FA)** with TOTP
- **Password Reset** functionality
- **JWT-based** session management
- **Rate limiting** and security headers
- **Account lockout** after failed attempts

### 👤 User Management
- **Profile Management** with address information
- **KYC Verification System** with document upload
- **Trading Limits** based on verification status
- **User Preferences** (currency, language, notifications)
- **Account Status Management** (active, suspended, banned)

### 💰 Wallet System
- **Multi-currency Wallets** (BTC, ETH, BNB, ADA, SOL, DOT, MATIC, AVAX, USD, EUR)
- **Secure Key Generation** for crypto wallets
- **Balance Management** (available, locked balances)
- **Transaction History** tracking
- **QR Code Generation** for wallet addresses

### 📊 Trading Engine
- **Real-time Order Book** with WebSocket updates
- **Multiple Order Types** (Market, Limit, Stop, Stop-Limit)
- **Order Management** (create, cancel, view history)
- **Trade Execution** with fee calculation
- **Price Charts** with candlestick data
- **Recent Trades** display

### 💱 Market Data
- **Real-time Price Updates** via WebSocket
- **24h Price Changes** and volume data
- **Market Statistics** (high, low, volume)
- **Price History Charts** with multiple timeframes
- **Order Book Visualization**

### 💳 Fiat Integration
- **Deposit Methods** (Bank Transfer, Credit/Debit Card)
- **Withdrawal Options** (Bank Transfer, Wire Transfer)
- **Transaction History** tracking
- **Daily/Monthly Limits** enforcement
- **Mock Payment Processing** (ready for real integration)

### 🛡️ Security & Compliance
- **Data Encryption** for sensitive information
- **Secure Asset Custody** with key management
- **Audit Logging** for all transactions
- **Compliance Features** for regulatory requirements
- **Admin Monitoring** capabilities

### 👨‍💼 Admin Dashboard
- **User Management** with search and filtering
- **Order & Trade Monitoring**
- **Market Data Management**
- **System Statistics** and analytics
- **KYC Review** and approval system
- **Activity Logs** and monitoring

## 🏗️ Architecture

### Frontend (React)
- **React 18** with functional components and hooks
- **React Router** for navigation
- **React Query** for data fetching and caching
- **Zustand** for state management
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **Socket.io Client** for real-time updates
- **React Hook Form** for form handling

### Backend (Node.js)
- **Express.js** REST API server
- **MongoDB** with Mongoose ODM
- **Socket.io** for WebSocket connections
- **Passport.js** for authentication
- **JWT** for token-based auth
- **Bcrypt** for password hashing
- **Multer** for file uploads
- **Winston** for logging
- **Rate Limiting** for API protection

### Database Schema
- **Users** - User accounts and profiles
- **Wallets** - Cryptocurrency wallets
- **Orders** - Trading orders
- **Trades** - Executed trades
- **MarketData** - Real-time market information

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd coinbase-clone
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install server dependencies
   cd server
   npm install
   
   # Install client dependencies
   cd ../client
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Copy environment file
   cp server/.env.example server/.env
   
   # Edit server/.env with your configuration
   ```

4. **Database Setup**
   ```bash
   # Start MongoDB service
   # Update MONGODB_URI in server/.env
   ```

5. **Start the application**
   ```bash
   # From root directory
   npm run dev
   
   # Or start individually
   npm run server  # Starts backend on port 5000
   npm run client  # Starts frontend on port 3000
   ```

### Environment Variables

Create a `server/.env` file with the following variables:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/coinbase-clone
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=7d
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
SESSION_SECRET=your-session-secret-here
ENCRYPTION_KEY=your-32-character-encryption-key
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
COINBASE_API_KEY=your-coinbase-api-key
COINBASE_API_SECRET=your-coinbase-api-secret
BINANCE_API_KEY=your-binance-api-key
BINANCE_API_SECRET=your-binance-api-secret
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_SECRET_KEY=your-stripe-secret-key
PLAID_CLIENT_ID=your-plaid-client-id
PLAID_SECRET=your-plaid-secret
PLAID_ENV=sandbox
```

## 📱 Usage

### User Features
1. **Register** a new account
2. **Verify email** address
3. **Complete KYC** verification
4. **Create wallets** for different cryptocurrencies
5. **Trade** cryptocurrencies on the exchange
6. **Deposit/Withdraw** fiat currencies
7. **Manage profile** and security settings

### Admin Features
1. **Monitor users** and their activities
2. **Review KYC** submissions
3. **Manage orders** and trades
4. **Update market data**
5. **View system statistics**
6. **Access audit logs**

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/verify-email/:token` - Email verification
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset
- `POST /api/auth/setup-2fa` - Setup 2FA
- `POST /api/auth/enable-2fa` - Enable 2FA
- `POST /api/auth/disable-2fa` - Disable 2FA

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `PUT /api/users/change-password` - Change password
- `GET /api/users/wallets` - Get user wallets
- `POST /api/users/wallets` - Create wallet
- `GET /api/users/trading-limits` - Get trading limits
- `PUT /api/users/preferences` - Update preferences

### Trading
- `POST /api/trading/orders` - Create order
- `GET /api/trading/orders` - Get user orders
- `GET /api/trading/orders/:id` - Get specific order
- `DELETE /api/trading/orders/:id` - Cancel order
- `GET /api/trading/trades` - Get user trades
- `GET /api/trading/orderbook/:pair` - Get order book

### Market Data
- `GET /api/market-data` - Get all market data
- `GET /api/market-data/:pair` - Get specific pair data
- `GET /api/market-data/:pair/history` - Get price history
- `GET /api/market-data/:pair/trades` - Get recent trades
- `GET /api/market-data/:pair/orderbook` - Get order book
- `GET /api/market-data/:pair/stats` - Get market statistics

### KYC
- `GET /api/kyc/status` - Get KYC status
- `POST /api/kyc/documents` - Upload documents
- `POST /api/kyc/selfie` - Upload selfie
- `POST /api/kyc/submit` - Submit for review
- `POST /api/kyc/approve/:userId` - Approve KYC (Admin)
- `POST /api/kyc/reject/:userId` - Reject KYC (Admin)

### Fiat
- `POST /api/fiat/deposit` - Initiate deposit
- `POST /api/fiat/withdraw` - Initiate withdrawal
- `GET /api/fiat/deposit-methods` - Get deposit methods
- `GET /api/fiat/withdrawal-methods` - Get withdrawal methods
- `GET /api/fiat/transactions` - Get transaction history

### Admin
- `GET /api/admin/dashboard` - Get dashboard stats
- `GET /api/admin/users` - Get all users
- `GET /api/admin/users/:id` - Get user details
- `PUT /api/admin/users/:id/status` - Update user status
- `GET /api/admin/orders` - Get all orders
- `GET /api/admin/trades` - Get all trades
- `GET /api/admin/market-data` - Get market data
- `PUT /api/admin/market-data/:pair` - Update market data

## 🔒 Security Features

- **Password Hashing** with bcrypt
- **JWT Tokens** for authentication
- **Rate Limiting** to prevent abuse
- **Input Validation** and sanitization
- **CORS Protection** configured
- **Helmet.js** for security headers
- **Session Management** with secure cookies
- **2FA Support** with TOTP
- **Account Lockout** after failed attempts
- **Audit Logging** for all actions

## 🚀 Deployment

### Production Considerations
1. **Environment Variables** - Set all required environment variables
2. **Database** - Use a production MongoDB instance
3. **SSL/TLS** - Enable HTTPS for security
4. **Rate Limiting** - Configure appropriate limits
5. **Monitoring** - Set up logging and monitoring
6. **Backup** - Implement database backups
7. **Scaling** - Consider horizontal scaling for high traffic

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This is a demonstration project and should not be used in production without proper security audits, compliance reviews, and additional testing. Cryptocurrency exchanges require extensive security measures and regulatory compliance.

## 🆘 Support

For support and questions, please open an issue in the repository.

---

**Built with ❤️ for educational purposes**