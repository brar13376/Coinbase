# 🚀 Complete Installation Guide - Coinbase Clone Exchange Platform

## 📋 Table of Contents
1. [What You Need Before Starting](#what-you-need-before-starting)
2. [Step 1: Download and Setup](#step-1-download-and-setup)
3. [Step 2: Install Required Software](#step-2-install-required-software)
4. [Step 3: Database Installation](#step-3-database-installation)
5. [Step 4: Configure Environment](#step-4-configure-environment)
6. [Step 5: Start the Platform](#step-5-start-the-platform)
7. [Step 6: Access Your Exchange](#step-6-access-your-exchange)
8. [Troubleshooting](#troubleshooting)
9. [Advanced Configuration](#advanced-configuration)

---

## What You Need Before Starting

### 🖥️ **Your Computer Requirements**
- **Operating System**: Windows 10/11, macOS 10.15+, or Ubuntu 18.04+
- **RAM**: At least 8GB (16GB recommended)
- **Storage**: At least 10GB free space
- **Internet**: Stable internet connection

### 🧠 **What This Platform Does**
This is a complete cryptocurrency exchange like Coinbase or Binance. It lets people:
- Buy and sell cryptocurrencies
- Create accounts and verify their identity
- Trade with real-time prices
- Manage their digital wallets
- Admin can control everything

---

## Step 1: Download and Setup

### 1.1 Open Your Terminal/Command Prompt

**On Windows:**
1. Press `Windows + R`
2. Type `cmd` and press Enter
3. A black window will open - this is your terminal

**On macOS:**
1. Press `Command + Space`
2. Type `Terminal` and press Enter
3. A window will open - this is your terminal

**On Ubuntu/Linux:**
1. Press `Ctrl + Alt + T`
2. A terminal window will open

### 1.2 Navigate to Your Desktop
Type this command and press Enter:
```bash
cd Desktop
```

### 1.3 Download the Project
Type this command and press Enter:
```bash
git clone https://github.com/your-username/coinbase-clone.git
```

**What this does:** This downloads all the code files to your computer.

### 1.4 Go Into the Project Folder
Type this command and press Enter:
```bash
cd coinbase-clone
```

**What this does:** This moves you into the project folder so you can work with the files.

---

## Step 2: Install Required Software

### 2.1 Install Node.js (JavaScript Runtime)

**On Windows:**
1. Go to https://nodejs.org
2. Click the green "Download" button
3. Run the downloaded file
4. Follow the installation wizard (click "Next" until it's done)

**On macOS:**
1. Go to https://nodejs.org
2. Click the green "Download" button
3. Run the downloaded file
4. Follow the installation wizard

**On Ubuntu/Linux:**
Type these commands one by one:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2.2 Install Git (Version Control)

**On Windows:**
1. Go to https://git-scm.com
2. Download and install Git
3. During installation, choose "Git from the command line and also from 3rd-party software"

**On macOS:**
1. Open Terminal
2. Type: `xcode-select --install`
3. Press Enter and follow instructions

**On Ubuntu/Linux:**
Type this command:
```bash
sudo apt-get install git
```

### 2.3 Install Docker (Container Platform)

**On Windows:**
1. Go to https://www.docker.com/products/docker-desktop
2. Download Docker Desktop
3. Install and restart your computer

**On macOS:**
1. Go to https://www.docker.com/products/docker-desktop
2. Download Docker Desktop
3. Install and restart your computer

**On Ubuntu/Linux:**
Type these commands:
```bash
sudo apt-get update
sudo apt-get install docker.io
sudo systemctl start docker
sudo systemctl enable docker
```

---

## Step 3: Database Installation

### 3.1 Install PostgreSQL (Main Database)

**On Windows:**
1. Go to https://www.postgresql.org/download/windows/
2. Download PostgreSQL installer
3. Run the installer
4. Remember the password you set for the 'postgres' user

**On macOS:**
Type this command:
```bash
brew install postgresql
brew services start postgresql
```

**On Ubuntu/Linux:**
Type these commands:
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 3.2 Install MongoDB (Document Database)

**On Windows:**
1. Go to https://www.mongodb.com/try/download/community
2. Download MongoDB Community Server
3. Install with default settings

**On macOS:**
Type this command:
```bash
brew install mongodb
brew services start mongodb
```

**On Ubuntu/Linux:**
Type these commands:
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 3.3 Install Redis (Cache Database)

**On Windows:**
1. Go to https://github.com/microsoftarchive/redis/releases
2. Download the latest Windows version
3. Extract and run redis-server.exe

**On macOS:**
Type this command:
```bash
brew install redis
brew services start redis
```

**On Ubuntu/Linux:**
Type these commands:
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

---

## Step 4: Configure Environment

### 4.1 Create Environment File

In your terminal, make sure you're in the coinbase-clone folder, then type:
```bash
cp .env.production .env
```

**What this does:** This creates a copy of the environment template file.

### 4.2 Edit the Environment File

**On Windows:**
1. Open File Explorer
2. Navigate to your coinbase-clone folder
3. Right-click on `.env` file
4. Select "Open with" → "Notepad"
5. Edit the following values:

```env
# Database Configuration
POSTGRES_PASSWORD=your_secure_password_here
MONGO_PASSWORD=your_secure_password_here
REDIS_PASSWORD=your_secure_password_here

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here

# API Keys (Get these from the respective websites)
BINANCE_API_KEY=your_binance_api_key
BINANCE_API_SECRET=your_binance_api_secret
COINBASE_API_KEY=your_coinbase_api_key
COINBASE_API_SECRET=your_coinbase_api_secret
```

**On macOS/Linux:**
Type this command:
```bash
nano .env
```

Then edit the same values as above.

### 4.3 Get API Keys (Optional but Recommended)

**For Binance:**
1. Go to https://www.binance.com
2. Create an account
3. Go to API Management
4. Create a new API key
5. Copy the key and secret to your .env file

**For Coinbase:**
1. Go to https://pro.coinbase.com
2. Create an account
3. Go to API Settings
4. Create a new API key
5. Copy the key and secret to your .env file

---

## Step 5: Start the Platform

### 5.1 Install All Dependencies

Type this command and wait for it to finish:
```bash
npm run install-all
```

**What this does:** This downloads all the required code libraries.

### 5.2 Run the Database Setup

Type this command:
```bash
node database/install-all.js
```

**What this does:** This sets up all the databases with the correct tables and data.

### 5.3 Start the Platform

Type this command:
```bash
npm run dev
```

**What this does:** This starts all the services (databases, servers, and website).

You should see output like:
```
✅ PostgreSQL connected
✅ MongoDB connected
✅ Redis connected
🚀 Server running on port 5000
🚀 Client running on port 3000
```

---

## Step 6: Access Your Exchange

### 6.1 Open Your Web Browser

Open any web browser (Chrome, Firefox, Safari, Edge).

### 6.2 Go to the Platform

Type this address in your browser:
```
http://localhost:3000
```

### 6.3 Create Your First Account

1. Click "Sign Up" or "Register"
2. Fill in your details:
   - First Name: Your first name
   - Last Name: Your last name
   - Email: Your email address
   - Password: A strong password
3. Click "Create Account"
4. Check your email and click the verification link

### 6.4 Access Admin Panel

1. Go to: `http://localhost:3000/admin`
2. Login with:
   - Email: `admin@coinbase-clone.com`
   - Password: `admin123`

**Important:** Change the admin password immediately after first login!

---

## Troubleshooting

### Problem: "Command not found" errors

**Solution:**
1. Make sure you installed Node.js correctly
2. Restart your terminal
3. Try typing: `node --version`
4. If it shows a version number, Node.js is installed

### Problem: Database connection errors

**Solution:**
1. Make sure PostgreSQL, MongoDB, and Redis are running
2. Check your .env file has the correct passwords
3. Try restarting the databases:
   - Windows: Restart the services in Services app
   - macOS: `brew services restart postgresql mongodb redis`
   - Linux: `sudo systemctl restart postgresql mongod redis`

### Problem: Port already in use

**Solution:**
1. Close other applications using ports 3000, 5000, 5432, 27017, 6379
2. Or change the ports in your .env file

### Problem: Permission denied errors

**Solution:**
1. On Windows: Run terminal as Administrator
2. On macOS/Linux: Use `sudo` before commands that need permission

---

## Advanced Configuration

### 7.1 Customize Trading Pairs

1. Go to Admin Panel
2. Click "System Settings"
3. Edit "Trading Pairs" to add/remove currencies

### 7.2 Configure Email Notifications

1. Edit your .env file
2. Add your email settings:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### 7.3 Set Up SSL/HTTPS

1. Get SSL certificates from Let's Encrypt
2. Update your .env file:
```env
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem
```

### 7.4 Configure Monitoring

1. Access Grafana at: `http://localhost:3001`
2. Login with admin credentials
3. Set up dashboards for monitoring

---

## Security Checklist

### ✅ **Before Going Live:**

1. **Change Default Passwords**
   - Admin password
   - Database passwords
   - API keys

2. **Enable 2FA**
   - Set up two-factor authentication
   - Use authenticator apps like Google Authenticator

3. **Configure Firewall**
   - Only allow necessary ports
   - Block unnecessary access

4. **Set Up Backups**
   - Regular database backups
   - Code repository backups

5. **Monitor Logs**
   - Check for suspicious activity
   - Set up alerts

---

## Getting Help

### 📚 **Documentation**
- Check the README.md file
- Look at the docs/ folder
- Read API documentation at `/api-docs`

### 🐛 **Report Issues**
- Create an issue on GitHub
- Include error messages and steps to reproduce

### 💬 **Community**
- Join our Discord server
- Ask questions in GitHub Discussions

---

## What Each Part Does

### 🗄️ **Databases:**
- **PostgreSQL**: Stores user accounts, orders, trades
- **MongoDB**: Stores documents, logs, configurations
- **Redis**: Caches data, manages sessions

### 🖥️ **Services:**
- **API Gateway**: Routes requests, handles security
- **Auth Service**: Manages user authentication
- **Trading Service**: Handles buy/sell orders
- **Wallet Service**: Manages cryptocurrency wallets
- **Market Data Service**: Provides real-time prices

### 🌐 **Frontend:**
- **React App**: The website users see
- **Trading Interface**: Where users buy/sell
- **Admin Dashboard**: Where admins manage everything

---

## Success! 🎉

If you followed all these steps, you now have a fully functional cryptocurrency exchange platform running on your computer!

### **Next Steps:**
1. Customize the design and branding
2. Add more cryptocurrencies
3. Set up payment processing
4. Deploy to a cloud server
5. Get regulatory compliance

### **Remember:**
- This is for educational purposes
- Don't use real money without proper security
- Always test thoroughly before going live
- Keep your software updated

---

**Happy Trading! 🚀💰**