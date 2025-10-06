#!/usr/bin/env node

/**
 * Coinbase Clone Database Auto-Installer
 * This script automatically installs and configures the database
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Console output functions
const log = {
    info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
    step: (msg) => console.log(`${colors.cyan}[STEP]${colors.reset} ${msg}`)
};

// Create readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Promisify readline question
const question = (query) => {
    return new Promise((resolve) => {
        rl.question(query, resolve);
    });
};

// Generate random password
const generatePassword = (length = 16) => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
};

// Generate JWT secret
const generateJWTSecret = () => {
    return crypto.randomBytes(64).toString('hex');
};

// Generate encryption key
const generateEncryptionKey = () => {
    return crypto.randomBytes(32).toString('hex');
};

// Load environment variables
const loadEnvFile = () => {
    const envPath = path.join(process.cwd(), '.env');
    const envProdPath = path.join(process.cwd(), '.env.production');
    
    if (fs.existsSync(envPath)) {
        require('dotenv').config({ path: envPath });
    } else if (fs.existsSync(envProdPath)) {
        require('dotenv').config({ path: envProdPath });
    } else {
        log.warning('No .env file found. Using default values.');
    }
};

// Database connection configuration
const getDbConfig = () => {
    return {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'password',
        database: process.env.POSTGRES_DB || 'postgres'
    };
};

// Test database connection
const testConnection = async (config) => {
    const client = new Client(config);
    try {
        await client.connect();
        log.success('Database connection successful');
        await client.end();
        return true;
    } catch (error) {
        log.error(`Database connection failed: ${error.message}`);
        return false;
    }
};

// Create database if it doesn't exist
const createDatabase = async (config) => {
    const client = new Client({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: 'postgres' // Connect to default postgres database
    });

    try {
        await client.connect();
        log.step('Creating database...');
        
        const dbName = process.env.POSTGRES_DB || 'coinbase_clone';
        await client.query(`CREATE DATABASE ${dbName}`);
        log.success(`Database '${dbName}' created successfully`);
        
        await client.end();
        return true;
    } catch (error) {
        if (error.code === '42P04') {
            log.warning('Database already exists');
            return true;
        }
        log.error(`Failed to create database: ${error.message}`);
        return false;
    }
};

// Run SQL script
const runSQLScript = async (config, scriptPath) => {
    const client = new Client(config);
    try {
        await client.connect();
        log.step(`Running SQL script: ${scriptPath}`);
        
        const sql = fs.readFileSync(scriptPath, 'utf8');
        await client.query(sql);
        
        log.success('SQL script executed successfully');
        await client.end();
        return true;
    } catch (error) {
        log.error(`Failed to run SQL script: ${error.message}`);
        await client.end();
        return false;
    }
};

// Create .env file with generated values
const createEnvFile = async () => {
    const envPath = path.join(process.cwd(), '.env');
    const envProdPath = path.join(process.cwd(), '.env.production');
    
    const targetPath = fs.existsSync(envProdPath) ? envProdPath : envPath;
    
    const envContent = `# Coinbase Clone Environment Configuration
# Generated automatically by database installer

# Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${generatePassword(16)}
POSTGRES_DB=coinbase_clone
POSTGRES_URL=postgresql://postgres:${generatePassword(16)}@localhost:5432/coinbase_clone

# MongoDB Configuration
MONGODB_URI=mongodb://admin:${generatePassword(16)}@localhost:27017/coinbase-clone?authSource=admin

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=${generatePassword(16)}

# JWT Configuration
JWT_SECRET=${generateJWTSecret()}
JWT_EXPIRE=7d

# Security
ENCRYPTION_KEY=${generateEncryptionKey()}
SESSION_SECRET=${generatePassword(32)}

# API Keys (Replace with your actual keys)
BINANCE_API_KEY=your-binance-api-key
BINANCE_API_SECRET=your-binance-api-secret
COINBASE_API_KEY=your-coinbase-api-key
COINBASE_API_SECRET=your-coinbase-api-secret
FIREBLOCKS_API_KEY=your-fireblocks-api-key
FIREBLOCKS_PRIVATE_KEY=your-fireblocks-private-key
BITGO_API_KEY=your-bitgo-api-key

# Payment Processing
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_SECRET_KEY=your-stripe-secret-key
PLAID_CLIENT_ID=your-plaid-client-id
PLAID_SECRET=your-plaid-secret
PLAID_ENV=sandbox

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Monitoring
GRAFANA_PASSWORD=${generatePassword(16)}

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Logging
LOG_LEVEL=info

# Kafka
KAFKA_BROKERS=localhost:9092

# Node Environment
NODE_ENV=development
`;

    fs.writeFileSync(targetPath, envContent);
    log.success(`Environment file created: ${targetPath}`);
    return true;
};

// Install dependencies
const installDependencies = async () => {
    log.step('Installing dependencies...');
    
    try {
        const { execSync } = require('child_process');
        
        // Install root dependencies
        log.info('Installing root dependencies...');
        execSync('npm install', { stdio: 'inherit' });
        
        // Install client dependencies
        log.info('Installing client dependencies...');
        execSync('cd client && npm install', { stdio: 'inherit' });
        
        // Install server dependencies
        log.info('Installing server dependencies...');
        execSync('cd server && npm install', { stdio: 'inherit' });
        
        // Install API gateway dependencies
        log.info('Installing API gateway dependencies...');
        execSync('cd api-gateway && npm install', { stdio: 'inherit' });
        
        // Install microservices dependencies
        log.info('Installing microservices dependencies...');
        execSync('cd services && find . -name "package.json" -exec dirname {} \\; | xargs -I {} sh -c "cd \\"{}\\" && npm install"', { stdio: 'inherit' });
        
        log.success('All dependencies installed successfully');
        return true;
    } catch (error) {
        log.error(`Failed to install dependencies: ${error.message}`);
        return false;
    }
};

// Main installation function
const main = async () => {
    console.log(`${colors.bright}${colors.cyan}
╔══════════════════════════════════════════════════════════════╗
║                Coinbase Clone Database Installer             ║
║                                                              ║
║  This script will automatically install and configure the    ║
║  database for the Coinbase Clone platform.                   ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}`);

    try {
        // Load environment variables
        loadEnvFile();
        
        // Get database configuration
        const dbConfig = getDbConfig();
        
        log.step('Testing database connection...');
        const connectionTest = await testConnection(dbConfig);
        
        if (!connectionTest) {
            log.error('Cannot proceed without database connection');
            process.exit(1);
        }
        
        // Create database
        log.step('Creating database...');
        const dbCreated = await createDatabase(dbConfig);
        
        if (!dbCreated) {
            log.error('Failed to create database');
            process.exit(1);
        }
        
        // Update config to use the new database
        const finalConfig = {
            ...dbConfig,
            database: process.env.POSTGRES_DB || 'coinbase_clone'
        };
        
        // Run initialization script
        log.step('Running database initialization script...');
        const scriptPath = path.join(__dirname, 'init.sql');
        const scriptExecuted = await runSQLScript(finalConfig, scriptPath);
        
        if (!scriptExecuted) {
            log.error('Failed to execute initialization script');
            process.exit(1);
        }
        
        // Create environment file
        log.step('Creating environment configuration...');
        await createEnvFile();
        
        // Install dependencies
        const installDeps = await question('Install all dependencies? (y/n): ');
        if (installDeps.toLowerCase() === 'y' || installDeps.toLowerCase() === 'yes') {
            await installDependencies();
        }
        
        log.success('Database installation completed successfully!');
        log.info('Next steps:');
        log.info('1. Update the .env file with your actual API keys');
        log.info('2. Start the services with: npm run dev');
        log.info('3. Access the platform at: http://localhost:3000');
        
    } catch (error) {
        log.error(`Installation failed: ${error.message}`);
        process.exit(1);
    } finally {
        rl.close();
    }
};

// Run the installer
if (require.main === module) {
    main();
}

module.exports = {
    testConnection,
    createDatabase,
    runSQLScript,
    createEnvFile,
    installDependencies
};