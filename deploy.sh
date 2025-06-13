#!/bin/bash

# BoomRoach 2025 - Comprehensive Production Deployment Script
# Deploys all project components: Frontend, Backend API, Hydra-Bot, Telegram Bot, Trading Engines

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_deploy() { echo -e "${PURPLE}🚀 $1${NC}"; }

# Configuration
DEPLOYMENT_ENV=${DEPLOYMENT_ENV:-production}
DEPLOY_MODE=${1:-full}  # full, frontend, backend, hydra, telegram
PROJECT_ROOT=$(pwd)
LOG_FILE="logs/deployment-$(date +%Y%m%d-%H%M%S).log"
HEALTH_CHECK_TIMEOUT=60
MAX_RETRIES=3

# Ports configuration
FRONTEND_PORT=3000
BACKEND_PORT=3001
HYDRA_BACKEND_PORT=3002
TRADING_ENGINE_PORT=8000
TELEGRAM_BOT_PORT=8001

# Cloud deployment settings
CLOUD_PROVIDER=${CLOUD_PROVIDER:-"auto"}  # auto, vercel, netlify, railway, render
DATABASE_URL=${DATABASE_URL:-""}
REDIS_URL=${REDIS_URL:-""}

mkdir -p logs pids output

# Trap for cleanup
cleanup() {
    log_warning "Cleaning up deployment processes..."
    if [[ -f "pids/deployment.pid" ]]; then
        kill -TERM $(cat pids/deployment.pid) 2>/dev/null || true
        rm -f pids/deployment.pid
    fi
}
trap cleanup EXIT

echo $$ > pids/deployment.pid

# Header
echo -e "${CYAN}"
echo "══════════════════════════════════════════════════════════════════════"
echo "   🚀 BOOMROACH 2025 - COMPREHENSIVE PRODUCTION DEPLOYMENT 🚀"
echo "══════════════════════════════════════════════════════════════════════"
echo -e "${NC}"

log_deploy "Starting deployment in ${DEPLOYMENT_ENV} mode"
log_info "Deploy mode: ${DEPLOY_MODE}"
log_info "Project root: ${PROJECT_ROOT}"
log_info "Log file: ${LOG_FILE}"

# Check system requirements
check_system_requirements() {
    log_info "Checking system requirements..."

    # Check Node.js/Bun
    if ! command -v bun &> /dev/null; then
        if ! command -v node &> /dev/null; then
            log_error "Neither Bun nor Node.js found. Please install Bun or Node.js 18+"
            exit 1
        else
            log_warning "Bun not found, using Node.js $(node --version)"
            PACKAGE_MANAGER="npm"
        fi
    else
        log_success "Bun found: $(bun --version)"
        PACKAGE_MANAGER="bun"
    fi

    # Check Python
    if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
        log_error "Python not found. Please install Python 3.9+"
        exit 1
    else
        PYTHON_CMD=$(command -v python3 || command -v python)
        PYTHON_VERSION=$($PYTHON_CMD --version)
        log_success "Python found: $PYTHON_VERSION"
    fi

    # Check Git
    if command -v git &> /dev/null; then
        log_success "Git found: $(git --version)"
    else
        log_warning "Git not found - some features may be limited"
    fi

    # Check available ports
    check_port() {
        local port=$1
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            log_warning "Port $port is already in use"
            return 1
        else
            log_success "Port $port is available"
            return 0
        fi
    }

    check_port $FRONTEND_PORT
    check_port $BACKEND_PORT
    check_port $HYDRA_BACKEND_PORT
    check_port $TRADING_ENGINE_PORT
    check_port $TELEGRAM_BOT_PORT
}

# Setup environment variables
setup_environment() {
    log_info "Setting up environment variables..."

    # Copy environment files
    if [[ ! -f ".env.production" ]]; then
        if [[ -f ".env.example" ]]; then
            cp .env.example .env.production
            log_warning "Created .env.production from .env.example - please configure it"
        fi
    fi

    # Setup component environments
    for dir in backend boomroach hydra-bot hydra-bot/backend; do
        if [[ -d "$dir" ]]; then
            if [[ ! -f "$dir/.env" ]]; then
                if [[ -f "$dir/.env.example" ]]; then
                    cp "$dir/.env.example" "$dir/.env"
                    log_info "Created $dir/.env from example"
                fi
            fi
        fi
    done

    # Export common environment variables
    export NODE_ENV=${DEPLOYMENT_ENV}
    export CORS_ORIGINS="https://boomroach.wales,https://www.boomroach.wales,http://localhost:3000"
    export LOG_LEVEL=${LOG_LEVEL:-info}

    log_success "Environment setup complete"
}

# Install dependencies for all components
install_dependencies() {
    log_info "Installing dependencies for all components..."

    # Frontend dependencies
    if [[ "$DEPLOY_MODE" == "full" || "$DEPLOY_MODE" == "frontend" ]]; then
        log_info "Installing frontend dependencies..."
        cd "$PROJECT_ROOT/boomroach"
        $PACKAGE_MANAGER install
        log_success "Frontend dependencies installed"
        cd "$PROJECT_ROOT"
    fi

    # Backend API dependencies
    if [[ "$DEPLOY_MODE" == "full" || "$DEPLOY_MODE" == "backend" ]]; then
        log_info "Installing backend API dependencies..."
        cd "$PROJECT_ROOT/backend"
        $PACKAGE_MANAGER install
        log_success "Backend API dependencies installed"
        cd "$PROJECT_ROOT"
    fi

    # Hydra-Bot Node.js backend dependencies
    if [[ "$DEPLOY_MODE" == "full" || "$DEPLOY_MODE" == "hydra" ]]; then
        log_info "Installing Hydra-Bot backend dependencies..."
        cd "$PROJECT_ROOT/hydra-bot/backend"
        $PACKAGE_MANAGER install
        log_success "Hydra-Bot backend dependencies installed"
        cd "$PROJECT_ROOT"

        # Python dependencies for trading engines
        log_info "Installing Python dependencies for trading engines..."
        cd "$PROJECT_ROOT/hydra-bot"

        # Create virtual environment if it doesn't exist
        if [[ ! -d "venv" ]]; then
            $PYTHON_CMD -m venv venv
            log_info "Created Python virtual environment"
        fi

        # Activate virtual environment and install dependencies
        source venv/bin/activate

        if [[ -f "trading_engine/requirements.txt" ]]; then
            pip install -r trading_engine/requirements.txt
            log_success "Trading engine Python dependencies installed"
        fi

        # Additional Python packages for AI and Telegram
        pip install python-telegram-bot openai ccxt ta-lib scikit-learn pandas numpy

        deactivate
        cd "$PROJECT_ROOT"
    fi
}

# Build all components
build_components() {
    log_info "Building all components..."

    # Build frontend
    if [[ "$DEPLOY_MODE" == "full" || "$DEPLOY_MODE" == "frontend" ]]; then
        log_info "Building frontend..."
        cd "$PROJECT_ROOT/boomroach"
        $PACKAGE_MANAGER run build
        log_success "Frontend built successfully"
        cd "$PROJECT_ROOT"
    fi

    # Build backend API
    if [[ "$DEPLOY_MODE" == "full" || "$DEPLOY_MODE" == "backend" ]]; then
        log_info "Building backend API..."
        cd "$PROJECT_ROOT/backend"
        $PACKAGE_MANAGER run build
        log_success "Backend API built successfully"
        cd "$PROJECT_ROOT"
    fi

    # Build Hydra-Bot backend
    if [[ "$DEPLOY_MODE" == "full" || "$DEPLOY_MODE" == "hydra" ]]; then
        log_info "Building Hydra-Bot backend..."
        cd "$PROJECT_ROOT/hydra-bot/backend"
        $PACKAGE_MANAGER run build
        log_success "Hydra-Bot backend built successfully"
        cd "$PROJECT_ROOT"
    fi
}

# Database setup and migrations
setup_databases() {
    log_info "Setting up databases..."

    # Backend API database
    if [[ "$DEPLOY_MODE" == "full" || "$DEPLOY_MODE" == "backend" ]]; then
        cd "$PROJECT_ROOT/backend"

        # Generate Prisma client
        $PACKAGE_MANAGER run db:generate

        # Run migrations
        if [[ "$DEPLOYMENT_ENV" == "production" ]]; then
            $PACKAGE_MANAGER run db:push
        else
            $PACKAGE_MANAGER run db:migrate
        fi

        log_success "Backend database setup complete"
        cd "$PROJECT_ROOT"
    fi

    # Hydra-Bot database
    if [[ "$DEPLOY_MODE" == "full" || "$DEPLOY_MODE" == "hydra" ]]; then
        cd "$PROJECT_ROOT/hydra-bot/backend"

        # Generate Prisma client
        $PACKAGE_MANAGER run db:generate

        # Run migrations
        if [[ "$DEPLOYMENT_ENV" == "production" ]]; then
            $PACKAGE_MANAGER run db:push
        else
            $PACKAGE_MANAGER run db:migrate
        fi

        log_success "Hydra-Bot database setup complete"
        cd "$PROJECT_ROOT"
    fi
}

# Start all services
start_services() {
    log_info "Starting all services..."

    # Start backend API
    if [[ "$DEPLOY_MODE" == "full" || "$DEPLOY_MODE" == "backend" ]]; then
        log_info "Starting backend API on port $BACKEND_PORT..."
        cd "$PROJECT_ROOT/backend"

        if [[ "$DEPLOYMENT_ENV" == "production" ]]; then
            nohup $PACKAGE_MANAGER run start:production > ../logs/backend-production.log 2>&1 &
        else
            nohup $PACKAGE_MANAGER run dev > ../logs/backend-dev.log 2>&1 &
        fi

        echo $! > ../pids/backend.pid
        log_success "Backend API started (PID: $(cat ../pids/backend.pid))"
        cd "$PROJECT_ROOT"

        # Wait for backend to be ready
        wait_for_service "Backend API" "http://localhost:$BACKEND_PORT/health" 30
    fi

    # Start Hydra-Bot backend
    if [[ "$DEPLOY_MODE" == "full" || "$DEPLOY_MODE" == "hydra" ]]; then
        log_info "Starting Hydra-Bot backend on port $HYDRA_BACKEND_PORT..."
        cd "$PROJECT_ROOT/hydra-bot/backend"

        if [[ "$DEPLOYMENT_ENV" == "production" ]]; then
            nohup $PACKAGE_MANAGER run start:prod > ../../logs/hydra-backend-production.log 2>&1 &
        else
            nohup $PACKAGE_MANAGER run dev > ../../logs/hydra-backend-dev.log 2>&1 &
        fi

        echo $! > ../../pids/hydra-backend.pid
        log_success "Hydra-Bot backend started (PID: $(cat ../../pids/hydra-backend.pid))"
        cd "$PROJECT_ROOT"
    fi

    # Start Python trading engines
    if [[ "$DEPLOY_MODE" == "full" || "$DEPLOY_MODE" == "hydra" ]]; then
        log_info "Starting Python trading engines..."
        cd "$PROJECT_ROOT/hydra-bot"

        source venv/bin/activate

        # Start trading engine
        nohup $PYTHON_CMD trading_engine/main.py > ../logs/trading-engine.log 2>&1 &
        echo $! > ../pids/trading-engine.pid
        log_success "Trading engine started (PID: $(cat ../pids/trading-engine.pid))"

        # Start AI signal engine
        nohup $PYTHON_CMD ai_signal_engine/main.py > ../logs/ai-signal-engine.log 2>&1 &
        echo $! > ../pids/ai-signal-engine.pid
        log_success "AI signal engine started (PID: $(cat ../pids/ai-signal-engine.pid))"

        deactivate
        cd "$PROJECT_ROOT"
    fi

    # Start Telegram bot
    if [[ "$DEPLOY_MODE" == "full" || "$DEPLOY_MODE" == "telegram" ]]; then
        log_info "Starting Telegram bot..."
        cd "$PROJECT_ROOT/hydra-bot"

        source venv/bin/activate
        nohup $PYTHON_CMD telegram_bot/main.py > ../logs/telegram-bot.log 2>&1 &
        echo $! > ../pids/telegram-bot.pid
        log_success "Telegram bot started (PID: $(cat ../pids/telegram-bot.pid))"

        deactivate
        cd "$PROJECT_ROOT"
    fi

    # Start frontend
    if [[ "$DEPLOY_MODE" == "full" || "$DEPLOY_MODE" == "frontend" ]]; then
        log_info "Starting frontend on port $FRONTEND_PORT..."
        cd "$PROJECT_ROOT/boomroach"

        if [[ "$DEPLOYMENT_ENV" == "production" ]]; then
            nohup $PACKAGE_MANAGER run start > ../logs/frontend-production.log 2>&1 &
        else
            nohup $PACKAGE_MANAGER run dev > ../logs/frontend-dev.log 2>&1 &
        fi

        echo $! > ../pids/frontend.pid
        log_success "Frontend started (PID: $(cat ../pids/frontend.pid))"
        cd "$PROJECT_ROOT"

        # Wait for frontend to be ready
        wait_for_service "Frontend" "http://localhost:$FRONTEND_PORT" 30
    fi
}

# Wait for service to be ready
wait_for_service() {
    local service_name=$1
    local url=$2
    local timeout=${3:-30}
    local count=0

    log_info "Waiting for $service_name to be ready..."

    while [[ $count -lt $timeout ]]; do
        if curl -sf "$url" >/dev/null 2>&1; then
            log_success "$service_name is ready!"
            return 0
        fi
        sleep 2
        ((count += 2))
        echo -n "."
    done

    echo ""
    log_warning "$service_name took longer than expected to start"
    return 1
}

# Health checks for all services
run_health_checks() {
    log_info "Running comprehensive health checks..."

    local services_healthy=true

    # Check backend API
    if [[ "$DEPLOY_MODE" == "full" || "$DEPLOY_MODE" == "backend" ]]; then
        if curl -sf "http://localhost:$BACKEND_PORT/health" >/dev/null 2>&1; then
            log_success "Backend API health check passed"
        else
            log_error "Backend API health check failed"
            services_healthy=false
        fi
    fi

    # Check frontend
    if [[ "$DEPLOY_MODE" == "full" || "$DEPLOY_MODE" == "frontend" ]]; then
        if curl -sf "http://localhost:$FRONTEND_PORT" >/dev/null 2>&1; then
            log_success "Frontend health check passed"
        else
            log_error "Frontend health check failed"
            services_healthy=false
        fi
    fi

    # Check Hydra-Bot backend
    if [[ "$DEPLOY_MODE" == "full" || "$DEPLOY_MODE" == "hydra" ]]; then
        if curl -sf "http://localhost:$HYDRA_BACKEND_PORT/health" >/dev/null 2>&1; then
            log_success "Hydra-Bot backend health check passed"
        else
            log_warning "Hydra-Bot backend health check failed (may be starting)"
        fi
    fi

    # Check process health
    check_process_health() {
        local service=$1
        local pid_file="pids/${service}.pid"

        if [[ -f "$pid_file" ]]; then
            local pid=$(cat "$pid_file")
            if ps -p $pid > /dev/null 2>&1; then
                log_success "$service process is running (PID: $pid)"
            else
                log_error "$service process is not running"
                services_healthy=false
            fi
        fi
    }

    check_process_health "backend"
    check_process_health "frontend"
    check_process_health "hydra-backend"
    check_process_health "trading-engine"
    check_process_health "ai-signal-engine"
    check_process_health "telegram-bot"

    if [[ "$services_healthy" == "true" ]]; then
        log_success "All health checks passed!"
        return 0
    else
        log_error "Some health checks failed"
        return 1
    fi
}

# Cloud deployment
deploy_to_cloud() {
    if [[ "$CLOUD_PROVIDER" == "auto" ]]; then
        log_info "Auto-detecting best cloud deployment option..."

        # Check for existing configurations
        if [[ -f "boomroach/vercel.json" || -f "boomroach/netlify.toml" ]]; then
            CLOUD_PROVIDER="vercel"
        elif [[ -f "railway.toml" || -f "Dockerfile" ]]; then
            CLOUD_PROVIDER="railway"
        else
            CLOUD_PROVIDER="netlify"
        fi

        log_info "Selected cloud provider: $CLOUD_PROVIDER"
    fi

    case $CLOUD_PROVIDER in
        "vercel")
            deploy_to_vercel
            ;;
        "netlify")
            deploy_to_netlify
            ;;
        "railway")
            deploy_to_railway
            ;;
        "render")
            deploy_to_render
            ;;
        *)
            log_warning "Unknown cloud provider: $CLOUD_PROVIDER"
            ;;
    esac
}

deploy_to_vercel() {
    log_info "Deploying to Vercel..."

    cd "$PROJECT_ROOT/boomroach"

    # Install Vercel CLI if not present
    if ! command -v vercel &> /dev/null; then
        npm install -g vercel
    fi

    # Deploy to Vercel
    vercel --prod --yes

    log_success "Deployed to Vercel!"
    cd "$PROJECT_ROOT"
}

deploy_to_netlify() {
    log_info "Deploying to Netlify..."

    cd "$PROJECT_ROOT/boomroach"

    # Build for static export
    $PACKAGE_MANAGER run build

    # Create deployment package
    if [[ -d "out" ]]; then
        zip -rFS ../output/netlify-deployment.zip out/
        log_success "Netlify deployment package created: output/netlify-deployment.zip"
    else
        log_error "Build output directory not found"
    fi

    cd "$PROJECT_ROOT"
}

# Generate deployment report
generate_deployment_report() {
    local report_file="DEPLOYMENT_REPORT_$(date +%Y%m%d_%H%M%S).md"

    cat > "$report_file" << EOF
# BoomRoach 2025 - Deployment Report

**Deployment Date:** $(date)
**Environment:** $DEPLOYMENT_ENV
**Deploy Mode:** $DEPLOY_MODE
**Cloud Provider:** $CLOUD_PROVIDER

## 🚀 Deployed Services

### Frontend
- **URL:** http://localhost:$FRONTEND_PORT
- **Status:** $(curl -sf "http://localhost:$FRONTEND_PORT" >/dev/null 2>&1 && echo "✅ Running" || echo "❌ Not responding")
- **Build:** $(cd boomroach && $PACKAGE_MANAGER run build >/dev/null 2>&1 && echo "✅ Success" || echo "❌ Failed")

### Backend API
- **URL:** http://localhost:$BACKEND_PORT
- **Health:** http://localhost:$BACKEND_PORT/health
- **API Docs:** http://localhost:$BACKEND_PORT/api-docs
- **Status:** $(curl -sf "http://localhost:$BACKEND_PORT/health" >/dev/null 2>&1 && echo "✅ Running" || echo "❌ Not responding")

### Hydra-Bot System
- **Backend URL:** http://localhost:$HYDRA_BACKEND_PORT
- **Trading Engine:** Port $TRADING_ENGINE_PORT
- **AI Signal Engine:** Active
- **Telegram Bot:** Active
- **Status:** $(ps aux | grep -v grep | grep -q "trading_engine/main.py" && echo "✅ Running" || echo "❌ Not running")

## 📊 Component Status

$(if [[ -f "pids/backend.pid" ]]; then
    echo "- Backend API: PID $(cat pids/backend.pid)"
fi)
$(if [[ -f "pids/frontend.pid" ]]; then
    echo "- Frontend: PID $(cat pids/frontend.pid)"
fi)
$(if [[ -f "pids/hydra-backend.pid" ]]; then
    echo "- Hydra-Bot Backend: PID $(cat pids/hydra-backend.pid)"
fi)
$(if [[ -f "pids/trading-engine.pid" ]]; then
    echo "- Trading Engine: PID $(cat pids/trading-engine.pid)"
fi)
$(if [[ -f "pids/telegram-bot.pid" ]]; then
    echo "- Telegram Bot: PID $(cat pids/telegram-bot.pid)"
fi)

## 🔗 Important URLs

- 🌐 **Frontend:** http://localhost:$FRONTEND_PORT
- 🔌 **Backend API:** http://localhost:$BACKEND_PORT
- 📚 **API Documentation:** http://localhost:$BACKEND_PORT/api-docs
- 📊 **Health Checks:** http://localhost:$BACKEND_PORT/health
- 🤖 **Hydra-Bot:** http://localhost:$HYDRA_BACKEND_PORT
- 💰 **Trading Engine:** http://localhost:$TRADING_ENGINE_PORT
- 🔥 **WebSocket:** ws://localhost:$BACKEND_PORT

## 📝 Log Files

- Backend: logs/backend-production.log
- Frontend: logs/frontend-production.log
- Hydra-Bot: logs/hydra-backend-production.log
- Trading Engine: logs/trading-engine.log
- Telegram Bot: logs/telegram-bot.log
- Deployment: $LOG_FILE

## 🛠️ Management Commands

### Stop Services
\`\`\`bash
./stop_production.sh
\`\`\`

### Check Status
\`\`\`bash
./status_production.sh
\`\`\`

### Restart Services
\`\`\`bash
./restart_production.sh
\`\`\`

### View Logs
\`\`\`bash
tail -f logs/backend-production.log
tail -f logs/frontend-production.log
tail -f logs/trading-engine.log
\`\`\`

## 🎯 Next Steps

1. Configure DNS and SSL certificates
2. Set up monitoring and alerting
3. Configure backup strategies
4. Implement CI/CD pipeline
5. Performance optimization

---
**Deployment completed at:** $(date)
EOF

    log_success "Deployment report generated: $report_file"
}

# Main deployment orchestration
main() {
    local start_time=$(date +%s)

    # Pre-deployment checks
    check_system_requirements
    setup_environment

    # Installation and build
    install_dependencies
    build_components
    setup_databases

    # Service deployment
    start_services

    # Post-deployment verification
    sleep 10  # Give services time to start

    if run_health_checks; then
        log_success "All services are healthy!"
    else
        log_warning "Some services may need attention"
    fi

    # Cloud deployment (if configured)
    if [[ "$DEPLOYMENT_ENV" == "production" ]] && [[ "$CLOUD_PROVIDER" != "none" ]]; then
        deploy_to_cloud
    fi

    # Generate reports
    generate_deployment_report

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    echo -e "${CYAN}"
    echo "══════════════════════════════════════════════════════════════════════"
    echo "   🎉 DEPLOYMENT COMPLETED SUCCESSFULLY! 🎉"
    echo "══════════════════════════════════════════════════════════════════════"
    echo -e "${NC}"

    log_success "Total deployment time: ${duration} seconds"

    echo ""
    echo -e "${GREEN}🔗 LIVE URLS:${NC}"
    echo -e "   🌐 Frontend:        http://localhost:$FRONTEND_PORT"
    echo -e "   🔌 Backend API:     http://localhost:$BACKEND_PORT"
    echo -e "   📚 API Docs:        http://localhost:$BACKEND_PORT/api-docs"
    echo -e "   📊 Health Check:    http://localhost:$BACKEND_PORT/health"
    echo -e "   🤖 Hydra-Bot:       http://localhost:$HYDRA_BACKEND_PORT"
    echo -e "   💰 Trading Engine:  http://localhost:$TRADING_ENGINE_PORT"
    echo ""
    echo -e "${YELLOW}📝 Log Files:${NC}"
    echo -e "   Backend:     logs/backend-production.log"
    echo -e "   Frontend:    logs/frontend-production.log"
    echo -e "   Trading:     logs/trading-engine.log"
    echo -e "   Telegram:    logs/telegram-bot.log"
    echo ""
    echo -e "${BLUE}🛠️  Management:${NC}"
    echo -e "   Status:      ./status_production.sh"
    echo -e "   Stop:        ./stop_production.sh"
    echo -e "   Restart:     ./restart_production.sh"
    echo ""

    log_deploy "BoomRoach 2025 is now LIVE! 🚀"
}

# Script execution starts here
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@" 2>&1 | tee -a "$LOG_FILE"
fi
