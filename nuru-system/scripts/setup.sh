#!/bin/bash

# Nuru System Setup Script
echo "🚀 Setting up Nuru Worker Management System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Python is installed
echo -e "${BLUE}Checking Python installation...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python 3 is not installed. Please install Python 3.8 or higher.${NC}"
    exit 1
fi

# Check if Node.js is installed
echo -e "${BLUE}Checking Node.js installation...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js 16 or higher.${NC}"
    exit 1
fi

# Check if PostgreSQL is available
echo -e "${BLUE}Checking PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}PostgreSQL client not found. Please ensure PostgreSQL is installed and accessible.${NC}"
fi

# Setup Backend
echo -e "${GREEN}Setting up backend...${NC}"
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo -e "${BLUE}Creating Python virtual environment...${NC}"
    python3 -m venv venv
fi

# Activate virtual environment
echo -e "${BLUE}Activating virtual environment...${NC}"
source venv/bin/activate

# Install Python dependencies
echo -e "${BLUE}Installing Python dependencies...${NC}"
pip install -r requirements.txt

# Copy environment file
if [ ! -f ".env" ]; then
    echo -e "${BLUE}Creating backend environment file...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}Please edit backend/.env with your database credentials${NC}"
fi

# Setup Frontend
echo -e "${GREEN}Setting up frontend...${NC}"
cd ../frontend

# Install Node.js dependencies (already done during create-react-app)
echo -e "${BLUE}Node.js dependencies already installed${NC}"

# Create environment file if it doesn't exist
if [ ! -f ".env" ]; then
    echo -e "${BLUE}Frontend environment file already exists${NC}"
fi

cd ..

echo -e "${GREEN}✅ Setup complete!${NC}"
echo -e "${BLUE}Next steps:${NC}"
echo -e "1. Edit backend/.env with your database credentials"
echo -e "2. Create the PostgreSQL database: ${YELLOW}createdb nuru_db${NC}"
echo -e "3. Run database migrations: ${YELLOW}cd backend && alembic upgrade head${NC}"
echo -e "4. Create a super admin user (see create_admin.py script)"
echo -e "5. Start the backend: ${YELLOW}cd backend && python -m uvicorn app.main:app --reload${NC}"
echo -e "6. Start the frontend: ${YELLOW}cd frontend && npm start${NC}"