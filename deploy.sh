#!/bin/bash

# Coinbase Clone Deployment Script
# This script deploys the complete cryptocurrency exchange platform

set -e

echo "🚀 Starting Coinbase Clone Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    print_status "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Check if .env file exists
check_env() {
    print_status "Checking environment configuration..."
    if [ ! -f ".env.production" ]; then
        print_warning ".env.production file not found. Creating from template..."
        cp .env.production .env.production.backup 2>/dev/null || true
        print_warning "Please update .env.production with your actual configuration before proceeding"
        print_warning "You can use the provided .env.production as a template"
        exit 1
    fi
    print_success "Environment configuration found"
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    mkdir -p logs
    mkdir -p data/postgres
    mkdir -p data/mongodb
    mkdir -p data/redis
    mkdir -p data/prometheus
    mkdir -p data/grafana
    mkdir -p data/elasticsearch
    mkdir -p ssl
    mkdir -p monitoring/rules
    mkdir -p monitoring/grafana/dashboards
    mkdir -p monitoring/grafana/datasources
    print_success "Directories created"
}

# Build all services
build_services() {
    print_status "Building all services..."
    
    # Build API Gateway
    print_status "Building API Gateway..."
    docker build -t coinbase-clone-api-gateway ./api-gateway
    
    # Build all microservices
    services=("auth-service" "user-service" "order-service" "wallet-service" "market-data-service" "kyc-service" "fiat-service" "admin-service" "notification-service" "ledger-service" "custody-service")
    
    for service in "${services[@]}"; do
        print_status "Building $service..."
        docker build -t "coinbase-clone-$service" "./services/$service"
    done
    
    # Build client
    print_status "Building React client..."
    docker build -t coinbase-clone-client ./client
    
    print_success "All services built successfully"
}

# Start infrastructure services
start_infrastructure() {
    print_status "Starting infrastructure services..."
    
    # Start databases and message queue
    docker-compose -f docker-compose.prod.yml up -d postgres mongodb redis zookeeper kafka
    
    # Wait for services to be ready
    print_status "Waiting for infrastructure services to be ready..."
    sleep 30
    
    print_success "Infrastructure services started"
}

# Start microservices
start_microservices() {
    print_status "Starting microservices..."
    
    # Start all microservices
    docker-compose -f docker-compose.prod.yml up -d \
        auth-service \
        user-service \
        order-service \
        wallet-service \
        market-data-service \
        kyc-service \
        fiat-service \
        admin-service \
        notification-service \
        ledger-service \
        custody-service
    
    # Wait for services to be ready
    print_status "Waiting for microservices to be ready..."
    sleep 60
    
    print_success "Microservices started"
}

# Start API Gateway and Client
start_frontend() {
    print_status "Starting API Gateway and Client..."
    
    docker-compose -f docker-compose.prod.yml up -d api-gateway client
    
    # Wait for services to be ready
    print_status "Waiting for frontend services to be ready..."
    sleep 30
    
    print_success "Frontend services started"
}

# Start monitoring and logging
start_monitoring() {
    print_status "Starting monitoring and logging services..."
    
    docker-compose -f docker-compose.prod.yml up -d \
        prometheus \
        grafana \
        elasticsearch \
        kibana
    
    # Wait for services to be ready
    print_status "Waiting for monitoring services to be ready..."
    sleep 30
    
    print_success "Monitoring services started"
}

# Start load balancer
start_load_balancer() {
    print_status "Starting load balancer..."
    
    docker-compose -f docker-compose.prod.yml up -d nginx
    
    print_success "Load balancer started"
}

# Health check
health_check() {
    print_status "Performing health checks..."
    
    # Check API Gateway
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        print_success "API Gateway is healthy"
    else
        print_warning "API Gateway health check failed"
    fi
    
    # Check Client
    if curl -f http://localhost:3001 > /dev/null 2>&1; then
        print_success "Client is healthy"
    else
        print_warning "Client health check failed"
    fi
    
    # Check Prometheus
    if curl -f http://localhost:9090 > /dev/null 2>&1; then
        print_success "Prometheus is healthy"
    else
        print_warning "Prometheus health check failed"
    fi
    
    # Check Grafana
    if curl -f http://localhost:3001 > /dev/null 2>&1; then
        print_success "Grafana is healthy"
    else
        print_warning "Grafana health check failed"
    fi
}

# Display access information
show_access_info() {
    print_success "🎉 Deployment completed successfully!"
    echo ""
    echo "📊 Access Information:"
    echo "====================="
    echo "🌐 Main Application: http://localhost:3001"
    echo "🔌 API Gateway: http://localhost:3000"
    echo "📈 Prometheus: http://localhost:9090"
    echo "📊 Grafana: http://localhost:3001 (admin/admin)"
    echo "🔍 Kibana: http://localhost:5601"
    echo "🗄️  PostgreSQL: localhost:5432"
    echo "🍃 MongoDB: localhost:27017"
    echo "🔴 Redis: localhost:6379"
    echo "📨 Kafka: localhost:9092"
    echo ""
    echo "🔐 Default Admin Credentials:"
    echo "Email: admin@coinbase-clone.com"
    echo "Password: admin123"
    echo ""
    echo "⚠️  Important Security Notes:"
    echo "1. Change all default passwords immediately"
    echo "2. Update API keys with your actual credentials"
    echo "3. Configure SSL certificates for production"
    echo "4. Set up proper firewall rules"
    echo "5. Enable 2FA for admin accounts"
    echo ""
    echo "📚 Documentation:"
    echo "Check the README.md file for detailed setup instructions"
}

# Main deployment function
main() {
    print_status "Starting Coinbase Clone deployment process..."
    
    check_docker
    check_env
    create_directories
    build_services
    start_infrastructure
    start_microservices
    start_frontend
    start_monitoring
    start_load_balancer
    health_check
    show_access_info
}

# Handle script arguments
case "${1:-}" in
    "build")
        check_docker
        build_services
        ;;
    "start")
        check_docker
        check_env
        start_infrastructure
        start_microservices
        start_frontend
        start_monitoring
        start_load_balancer
        ;;
    "stop")
        print_status "Stopping all services..."
        docker-compose -f docker-compose.prod.yml down
        print_success "All services stopped"
        ;;
    "restart")
        print_status "Restarting all services..."
        docker-compose -f docker-compose.prod.yml restart
        print_success "All services restarted"
        ;;
    "logs")
        print_status "Showing logs..."
        docker-compose -f docker-compose.prod.yml logs -f
        ;;
    "health")
        health_check
        ;;
    "clean")
        print_status "Cleaning up..."
        docker-compose -f docker-compose.prod.yml down -v
        docker system prune -f
        print_success "Cleanup completed"
        ;;
    *)
        main
        ;;
esac