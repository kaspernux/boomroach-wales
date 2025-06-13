#!/bin/bash

# ===========================================
# BOOMROACH 2025 - DATABASE SETUP SCRIPT
# ===========================================

set -e

echo "🚀 BoomRoach Database Setup Starting..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database configuration
DB_NAME="boomroach_db"
DB_USER="boomroach_user"
DB_PASSWORD="secure_password"
DB_HOST="localhost"
DB_PORT="5432"

# Check if PostgreSQL is installed
check_postgresql() {
    echo -e "${BLUE}📋 Checking PostgreSQL installation...${NC}"

    if ! command -v psql &> /dev/null; then
        echo -e "${RED}❌ PostgreSQL is not installed!${NC}"
        echo -e "${YELLOW}📦 Installing PostgreSQL...${NC}"

        # Detect OS and install PostgreSQL
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # Ubuntu/Debian
            sudo apt update
            sudo apt install -y postgresql postgresql-contrib
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            if command -v brew &> /dev/null; then
                brew install postgresql
                brew services start postgresql
            else
                echo -e "${RED}❌ Please install Homebrew first: https://brew.sh${NC}"
                exit 1
            fi
        else
            echo -e "${RED}❌ Unsupported OS. Please install PostgreSQL manually.${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✅ PostgreSQL is installed${NC}"
    fi
}

# Start PostgreSQL service
start_postgresql() {
    echo -e "${BLUE}🔄 Starting PostgreSQL service...${NC}"

    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew services start postgresql
    fi

    echo -e "${GREEN}✅ PostgreSQL service started${NC}"
}

# Create database and user
setup_database() {
    echo -e "${BLUE}🗄️ Setting up database and user...${NC}"

    # Connect as postgres user and create database/user
    sudo -u postgres psql << EOF
-- Create user if not exists
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER') THEN
        CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
    END IF;
END
\$\$;

-- Create database if not exists
SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER USER $DB_USER CREATEDB;

\q
EOF

    echo -e "${GREEN}✅ Database and user created successfully${NC}"
}

# Test database connection
test_connection() {
    echo -e "${BLUE}🔌 Testing database connection...${NC}"

    export PGPASSWORD=$DB_PASSWORD
    if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Database connection successful${NC}"
    else
        echo -e "${RED}❌ Database connection failed${NC}"
        exit 1
    fi
}

# Create .env file if it doesn't exist
create_env_file() {
    echo -e "${BLUE}📝 Creating environment configuration...${NC}"

    if [ ! -f ".env" ]; then
        cp .env.example .env

        # Update DATABASE_URL in .env
        DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?schema=public"

        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|DATABASE_URL=.*|DATABASE_URL=\"$DATABASE_URL\"|" .env
        else
            sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"$DATABASE_URL\"|" .env
        fi

        echo -e "${GREEN}✅ .env file created with database configuration${NC}"
    else
        echo -e "${YELLOW}⚠️ .env file already exists${NC}"
    fi
}

# Run Prisma migrations
run_migrations() {
    echo -e "${BLUE}🔄 Running Prisma migrations...${NC}"

    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 Installing dependencies...${NC}"
        bun install
    fi

    # Generate Prisma client
    echo -e "${BLUE}🔧 Generating Prisma client...${NC}"
    bunx prisma generate

    # Apply database migrations
    echo -e "${BLUE}🗄️ Applying database migrations...${NC}"
    bunx prisma db push

    # Seed database with initial data
    echo -e "${BLUE}🌱 Seeding database with initial data...${NC}"
    if [ -f "prisma/seed.ts" ]; then
        bunx prisma db seed
    else
        echo -e "${YELLOW}⚠️ No seed file found, skipping seeding${NC}"
    fi

    echo -e "${GREEN}✅ Database migrations completed${NC}"
}

# Verify setup
verify_setup() {
    echo -e "${BLUE}🔍 Verifying database setup...${NC}"

    # Check if tables were created
    export PGPASSWORD=$DB_PASSWORD
    TABLE_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")

    if [ "$TABLE_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✅ Database setup verified - $TABLE_COUNT tables created${NC}"
    else
        echo -e "${RED}❌ Database setup verification failed${NC}"
        exit 1
    fi
}

# Print connection info
print_info() {
    echo -e "\n${GREEN}🎉 Database Setup Complete!${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Database Name:${NC} $DB_NAME"
    echo -e "${YELLOW}Database User:${NC} $DB_USER"
    echo -e "${YELLOW}Database Host:${NC} $DB_HOST:$DB_PORT"
    echo -e "${YELLOW}Connection URL:${NC} postgresql://$DB_USER:***@$DB_HOST:$DB_PORT/$DB_NAME"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "\n${GREEN}🚀 You can now start the BoomRoach server:${NC}"
    echo -e "${BLUE}   cd backend && bun run start${NC}"
    echo -e "\n${GREEN}📊 Prisma Studio (Database GUI):${NC}"
    echo -e "${BLUE}   bunx prisma studio${NC}"
}

# Main execution
main() {
    echo -e "${GREEN}🚀 BoomRoach Database Setup${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    check_postgresql
    start_postgresql
    setup_database
    test_connection
    create_env_file
    run_migrations
    verify_setup
    print_info
}

# Handle errors
trap 'echo -e "${RED}❌ Setup failed at line $LINENO${NC}"; exit 1' ERR

# Run main function
main "$@"
