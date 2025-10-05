#!/bin/bash

# Coinbase Clone Complete Installation Script
# This script installs EVERYTHING needed to run the exchange

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Detect OS
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command_exists apt-get; then
            echo "ubuntu"
        elif command_exists yum; then
            echo "centos"
        else
            echo "linux"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

# Install system dependencies
install_system_deps() {
    local os=$(detect_os)
    step "Installing system dependencies for $os..."
    
    case $os in
        "ubuntu")
            sudo apt-get update
            sudo apt-get install -y curl wget git build-essential software-properties-common
            ;;
        "centos")
            sudo yum update -y
            sudo yum install -y curl wget git gcc gcc-c++ make
            ;;
        "macos")
            if ! command_exists brew; then
                log "Installing Homebrew..."
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            fi
            ;;
        "windows")
            warning "Windows detected. Please install Git and Node.js manually."
            ;;
    esac
}

# Install Node.js
install_nodejs() {
    if command_exists node; then
        local version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$version" -ge 18 ]; then
            success "Node.js $version is already installed"
            return
        fi
    fi
    
    step "Installing Node.js 18..."
    local os=$(detect_os)
    
    case $os in
        "ubuntu"|"centos")
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            if command_exists apt-get; then
                sudo apt-get install -y nodejs
            else
                sudo yum install -y nodejs npm
            fi
            ;;
        "macos")
            brew install node@18
            ;;
    esac
}

# Install databases
install_databases() {
    local os=$(detect_os)
    step "Installing databases..."
    
    case $os in
        "ubuntu")
            # PostgreSQL
            sudo apt-get install -y postgresql postgresql-contrib
            sudo systemctl start postgresql
            sudo systemctl enable postgresql
            
            # MongoDB
            wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
            echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
            sudo apt-get update
            sudo apt-get install -y mongodb-org
            sudo systemctl start mongod
            sudo systemctl enable mongod
            
            # Redis
            sudo apt-get install -y redis-server
            sudo systemctl start redis
            sudo systemctl enable redis
            ;;
        "centos")
            # PostgreSQL
            sudo yum install -y postgresql postgresql-server postgresql-contrib
            sudo postgresql-setup initdb
            sudo systemctl start postgresql
            sudo systemctl enable postgresql
            
            # MongoDB
            echo "[mongodb-org-6.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/7/mongodb-org/6.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-6.0.asc" | sudo tee /etc/yum.repos.d/mongodb-org-6.0.repo
            sudo yum install -y mongodb-org
            sudo systemctl start mongod
            sudo systemctl enable mongod
            
            # Redis
            sudo yum install -y redis
            sudo systemctl start redis
            sudo systemctl enable redis
            ;;
        "macos")
            brew install postgresql mongodb redis
            brew services start postgresql
            brew services start mongodb
            brew services start redis
            ;;
    esac
}

# Install project dependencies
install_project_deps() {
    step "Installing project dependencies..."
    
    # Root dependencies
    npm install
    
    # Client dependencies
    cd client && npm install && cd ..
    
    # Server dependencies
    cd server && npm install && cd ..
    
    # API gateway dependencies
    cd api-gateway && npm install && cd ..
    
    # Microservices dependencies
    cd services
    find . -name "package.json" -exec dirname {} \; | xargs -I {} sh -c "cd \"{}\" && npm install"
    cd ..
}

# Setup databases
setup_databases() {
    step "Setting up databases..."
    
    # Wait for databases to be ready
    sleep 5
    
    # Run database initialization
    node database/install-all.js
}

# Create environment file
create_env_file() {
    step "Creating environment configuration..."
    
    if [ ! -f ".env" ]; then
        cp .env.production .env
        success "Environment file created"
    else
        warning "Environment file already exists"
    fi
}

# Start the platform
start_platform() {
    step "Starting the platform..."
    
    # Start in background
    npm run dev &
    
    # Wait for services to start
    sleep 15
    
    success "Platform started successfully!"
}

# Health check
health_check() {
    step "Performing health check..."
    
    local services=("http://localhost:3000" "http://localhost:5001" "http://localhost:5003")
    local healthy=0
    
    for service in "${services[@]}"; do
        if curl -f "$service/health" >/dev/null 2>&1; then
            success "$service is healthy"
            ((healthy++))
        else
            warning "$service is not responding"
        fi
    done
    
    if [ $healthy -eq ${#services[@]} ]; then
        success "All services are healthy!"
    else
        warning "Some services are not responding. Check logs for details."
    fi
}

# Display success message
show_success() {
    echo -e "${GREEN}
╔══════════════════════════════════════════════════════════════╗
║                    🎉 INSTALLATION COMPLETE! 🎉              ║
║                                                              ║
║  Your Coinbase Clone exchange is now running!                ║
║                                                              ║
║  🌐 Main Application: http://localhost:3000                  ║
║  👨‍💼 Admin Panel: http://localhost:3000/admin              ║
║  📚 API Docs: http://localhost:3000/api-docs                ║
║                                                              ║
║  🔐 Admin Credentials:                                       ║
║     Email: admin@coinbase-clone.com                          ║
║     Password: admin123                                       ║
║                                                              ║
║  ⚠️  IMPORTANT: Change the admin password immediately!       ║
║                                                              ║
║  Next steps:                                                 ║
║  1. Open http://localhost:3000 in your browser              ║
║  2. Create your first user account                           ║
║  3. Access admin panel and change passwords                 ║
║  4. Configure your API keys in .env file                    ║
║                                                              ║
║  Need help? Check the documentation:                         ║
║  - INSTALLATION_GUIDE.md                                    ║
║  - TROUBLESHOOTING.md                                       ║
║  - DEVELOPER_GUIDE.md                                       ║
╚══════════════════════════════════════════════════════════════╝
${NC}"
}

# Main installation function
main() {
    echo -e "${MAGENTA}
╔══════════════════════════════════════════════════════════════╗
║              🚀 Coinbase Clone Complete Installer 🚀         ║
║                                                              ║
║  This script will automatically install and configure        ║
║  your complete cryptocurrency exchange platform.             ║
║                                                              ║
║  Estimated time: 10-30 minutes (depending on internet)      ║
║  What you'll get:                                            ║
║  ✅ Complete trading platform                                ║
║  ✅ User management system                                   ║
║  ✅ Admin dashboard                                          ║
║  ✅ Real-time market data                                    ║
║  ✅ Security features                                        ║
║  ✅ Mobile responsive design                                 ║
╚══════════════════════════════════════════════════════════════╝
${NC}"
    
    # Check if running as root
    if [ "$EUID" -eq 0 ]; then
        warning "Running as root. This is not recommended for security reasons."
        read -p "Continue anyway? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # Installation steps
    install_system_deps
    install_nodejs
    install_databases
    install_project_deps
    create_env_file
    setup_databases
    start_platform
    health_check
    show_success
}

# Handle script arguments
case "${1:-}" in
    "install")
        main
        ;;
    "start")
        start_platform
        ;;
    "stop")
        pkill -f "npm run dev" || true
        success "Platform stopped"
        ;;
    "restart")
        pkill -f "npm run dev" || true
        sleep 2
        start_platform
        ;;
    "health")
        health_check
        ;;
    "clean")
        step "Cleaning up..."
        pkill -f "npm run dev" || true
        rm -rf node_modules client/node_modules server/node_modules api-gateway/node_modules services/*/node_modules
        success "Cleanup completed"
        ;;
    *)
        main
        ;;
esac