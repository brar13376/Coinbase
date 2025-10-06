#!/usr/bin/env node

/**
 * Complete Database Installation Script
 * This script installs and configures all databases (PostgreSQL, MongoDB, Redis)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

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

// Check if command exists
const commandExists = (command) => {
    try {
        execSync(`which ${command}`, { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
};

// Install system dependencies
const installSystemDependencies = async () => {
    log.step('Installing system dependencies...');
    
    try {
        // Check if we're on Ubuntu/Debian
        if (commandExists('apt-get')) {
            log.info('Installing PostgreSQL, MongoDB, and Redis on Ubuntu/Debian...');
            execSync('sudo apt-get update', { stdio: 'inherit' });
            execSync('sudo apt-get install -y postgresql postgresql-contrib mongodb redis-server', { stdio: 'inherit' });
        }
        // Check if we're on CentOS/RHEL
        else if (commandExists('yum')) {
            log.info('Installing PostgreSQL, MongoDB, and Redis on CentOS/RHEL...');
            execSync('sudo yum install -y postgresql postgresql-server mongodb redis', { stdio: 'inherit' });
        }
        // Check if we're on macOS
        else if (commandExists('brew')) {
            log.info('Installing PostgreSQL, MongoDB, and Redis on macOS...');
            execSync('brew install postgresql mongodb redis', { stdio: 'inherit' });
        }
        // Check if we're on Windows
        else if (process.platform === 'win32') {
            log.warning('Windows detected. Please install PostgreSQL, MongoDB, and Redis manually.');
            log.info('Download links:');
            log.info('PostgreSQL: https://www.postgresql.org/download/windows/');
            log.info('MongoDB: https://www.mongodb.com/try/download/community');
            log.info('Redis: https://github.com/microsoftarchive/redis/releases');
        }
        else {
            log.warning('Unknown operating system. Please install PostgreSQL, MongoDB, and Redis manually.');
        }
        
        log.success('System dependencies installation completed');
        return true;
    } catch (error) {
        log.error(`Failed to install system dependencies: ${error.message}`);
        return false;
    }
};

// Start database services
const startDatabaseServices = async () => {
    log.step('Starting database services...');
    
    try {
        // Start PostgreSQL
        if (commandExists('systemctl')) {
            execSync('sudo systemctl start postgresql', { stdio: 'inherit' });
            execSync('sudo systemctl enable postgresql', { stdio: 'inherit' });
        } else if (commandExists('brew')) {
            execSync('brew services start postgresql', { stdio: 'inherit' });
        }
        log.success('PostgreSQL started');
        
        // Start MongoDB
        if (commandExists('systemctl')) {
            execSync('sudo systemctl start mongodb', { stdio: 'inherit' });
            execSync('sudo systemctl enable mongodb', { stdio: 'inherit' });
        } else if (commandExists('brew')) {
            execSync('brew services start mongodb', { stdio: 'inherit' });
        }
        log.success('MongoDB started');
        
        // Start Redis
        if (commandExists('systemctl')) {
            execSync('sudo systemctl start redis', { stdio: 'inherit' });
            execSync('sudo systemctl enable redis', { stdio: 'inherit' });
        } else if (commandExists('brew')) {
            execSync('brew services start redis', { stdio: 'inherit' });
        }
        log.success('Redis started');
        
        return true;
    } catch (error) {
        log.error(`Failed to start database services: ${error.message}`);
        return false;
    }
};

// Install Node.js dependencies
const installNodeDependencies = async () => {
    log.step('Installing Node.js dependencies...');
    
    try {
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
        
        log.success('Node.js dependencies installed successfully');
        return true;
    } catch (error) {
        log.error(`Failed to install Node.js dependencies: ${error.message}`);
        return false;
    }
};

// Initialize PostgreSQL
const initializePostgreSQL = async () => {
    log.step('Initializing PostgreSQL...');
    
    try {
        const { testConnection, createDatabase, runSQLScript } = require('./install.js');
        
        const config = {
            host: process.env.POSTGRES_HOST || 'localhost',
            port: process.env.POSTGRES_PORT || 5432,
            user: process.env.POSTGRES_USER || 'postgres',
            password: process.env.POSTGRES_PASSWORD || 'password',
            database: 'postgres'
        };
        
        // Test connection
        const connected = await testConnection(config);
        if (!connected) {
            throw new Error('Cannot connect to PostgreSQL');
        }
        
        // Create database
        const dbCreated = await createDatabase(config);
        if (!dbCreated) {
            throw new Error('Failed to create database');
        }
        
        // Run initialization script
        const scriptPath = path.join(__dirname, 'init.sql');
        const scriptExecuted = await runSQLScript({
            ...config,
            database: process.env.POSTGRES_DB || 'coinbase_clone'
        }, scriptPath);
        
        if (!scriptExecuted) {
            throw new Error('Failed to execute initialization script');
        }
        
        log.success('PostgreSQL initialized successfully');
        return true;
    } catch (error) {
        log.error(`PostgreSQL initialization failed: ${error.message}`);
        return false;
    }
};

// Initialize MongoDB
const initializeMongoDB = async () => {
    log.step('Initializing MongoDB...');
    
    try {
        const { initializeMongoDB } = require('./mongodb-init.js');
        await initializeMongoDB();
        log.success('MongoDB initialized successfully');
        return true;
    } catch (error) {
        log.error(`MongoDB initialization failed: ${error.message}`);
        return false;
    }
};

// Initialize Redis
const initializeRedis = async () => {
    log.step('Initializing Redis...');
    
    try {
        const { initializeRedis } = require('./redis-init.js');
        await initializeRedis();
        log.success('Redis initialized successfully');
        return true;
    } catch (error) {
        log.error(`Redis initialization failed: ${error.message}`);
        return false;
    }
};

// Create environment file
const createEnvironmentFile = async () => {
    log.step('Creating environment configuration...');
    
    try {
        const { createEnvFile } = require('./install.js');
        await createEnvFile();
        log.success('Environment file created successfully');
        return true;
    } catch (error) {
        log.error(`Failed to create environment file: ${error.message}`);
        return false;
    }
};

// Test all connections
const testConnections = async () => {
    log.step('Testing all database connections...');
    
    try {
        // Test PostgreSQL
        const { testConnection } = require('./install.js');
        const pgConfig = {
            host: process.env.POSTGRES_HOST || 'localhost',
            port: process.env.POSTGRES_PORT || 5432,
            user: process.env.POSTGRES_USER || 'postgres',
            password: process.env.POSTGRES_PASSWORD || 'password',
            database: process.env.POSTGRES_DB || 'coinbase_clone'
        };
        
        const pgConnected = await testConnection(pgConfig);
        if (pgConnected) {
            log.success('PostgreSQL connection: OK');
        } else {
            log.error('PostgreSQL connection: FAILED');
        }
        
        // Test MongoDB
        const { MongoClient } = require('mongodb');
        const mongoClient = new MongoClient(process.env.MONGODB_URI || 'mongodb://admin:password@localhost:27017/coinbase-clone?authSource=admin');
        try {
            await mongoClient.connect();
            log.success('MongoDB connection: OK');
            await mongoClient.close();
        } catch (error) {
            log.error('MongoDB connection: FAILED');
        }
        
        // Test Redis
        const redis = require('redis');
        const redisClient = redis.createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
            password: process.env.REDIS_PASSWORD || null
        });
        
        try {
            await redisClient.connect();
            log.success('Redis connection: OK');
            await redisClient.quit();
        } catch (error) {
            log.error('Redis connection: FAILED');
        }
        
        return true;
    } catch (error) {
        log.error(`Connection testing failed: ${error.message}`);
        return false;
    }
};

// Main installation function
const main = async () => {
    console.log(`${colors.bright}${colors.cyan}
╔══════════════════════════════════════════════════════════════╗
║              Coinbase Clone Complete Installer               ║
║                                                              ║
║  This script will install and configure all databases and    ║
║  dependencies for the Coinbase Clone platform.               ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}`);

    try {
        // Check if running as root
        if (process.getuid && process.getuid() === 0) {
            log.warning('Running as root. This is not recommended for security reasons.');
            const continueAsRoot = await question('Continue anyway? (y/n): ');
            if (continueAsRoot.toLowerCase() !== 'y' && continueAsRoot.toLowerCase() !== 'yes') {
                process.exit(1);
            }
        }
        
        // Install system dependencies
        const installSystem = await question('Install system dependencies (PostgreSQL, MongoDB, Redis)? (y/n): ');
        if (installSystem.toLowerCase() === 'y' || installSystem.toLowerCase() === 'yes') {
            await installSystemDependencies();
        }
        
        // Start database services
        const startServices = await question('Start database services? (y/n): ');
        if (startServices.toLowerCase() === 'y' || startServices.toLowerCase() === 'yes') {
            await startDatabaseServices();
        }
        
        // Install Node.js dependencies
        const installNode = await question('Install Node.js dependencies? (y/n): ');
        if (installNode.toLowerCase() === 'y' || installNode.toLowerCase() === 'yes') {
            await installNodeDependencies();
        }
        
        // Create environment file
        await createEnvironmentFile();
        
        // Initialize PostgreSQL
        const initPostgres = await question('Initialize PostgreSQL? (y/n): ');
        if (initPostgres.toLowerCase() === 'y' || initPostgres.toLowerCase() === 'yes') {
            await initializePostgreSQL();
        }
        
        // Initialize MongoDB
        const initMongo = await question('Initialize MongoDB? (y/n): ');
        if (initMongo.toLowerCase() === 'y' || initMongo.toLowerCase() === 'yes') {
            await initializeMongoDB();
        }
        
        // Initialize Redis
        const initRedis = await question('Initialize Redis? (y/n): ');
        if (initRedis.toLowerCase() === 'y' || initRedis.toLowerCase() === 'yes') {
            await initializeRedis();
        }
        
        // Test connections
        const testConn = await question('Test all database connections? (y/n): ');
        if (testConn.toLowerCase() === 'y' || testConn.toLowerCase() === 'yes') {
            await testConnections();
        }
        
        log.success('🎉 Complete installation finished successfully!');
        log.info('Next steps:');
        log.info('1. Update the .env file with your actual API keys');
        log.info('2. Start the services with: npm run dev');
        log.info('3. Access the platform at: http://localhost:3000');
        log.info('4. Admin credentials: admin@coinbase-clone.com / admin123');
        
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
    installSystemDependencies,
    startDatabaseServices,
    installNodeDependencies,
    initializePostgreSQL,
    initializeMongoDB,
    initializeRedis,
    createEnvironmentFile,
    testConnections
};