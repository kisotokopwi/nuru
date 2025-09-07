#!/bin/bash

# Nuru Company Management System - Deployment Script
# This script sets up the complete system for production deployment

echo "🚀 Starting Nuru Company Management System Deployment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js (v16 or higher) first."
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL (v12 or higher) first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install dependencies
echo "📦 Installing dependencies..."
npm run install-all

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Set up environment
echo "🔧 Setting up environment..."
if [ ! -f "server/.env" ]; then
    cp server/.env.example server/.env
    echo "⚠️  Please update server/.env with your configuration before proceeding"
    echo "   - Set DATABASE_URL to your PostgreSQL connection string"
    echo "   - Set JWT_SECRET to a secure secret key"
    echo "   - Set NODE_ENV to 'production'"
    exit 1
fi

echo "✅ Environment configuration ready"

# Build client
echo "🏗️  Building client application..."
cd client
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Failed to build client application"
    exit 1
fi

cd ..
echo "✅ Client application built successfully"

# Set up database
echo "🗄️  Setting up database..."
cd server

# Check if database exists
DB_NAME=$(grep DATABASE_URL .env | cut -d'/' -f4 | cut -d'?' -f1)
if [ -z "$DB_NAME" ]; then
    echo "❌ Could not determine database name from DATABASE_URL"
    exit 1
fi

# Create database if it doesn't exist
createdb $DB_NAME 2>/dev/null || echo "Database $DB_NAME already exists"

# Run migrations
echo "📊 Running database migrations..."
npm run migrate

if [ $? -ne 0 ]; then
    echo "❌ Failed to run database migrations"
    exit 1
fi

# Seed initial data
echo "🌱 Seeding initial data..."
npm run seed

if [ $? -ne 0 ]; then
    echo "❌ Failed to seed initial data"
    exit 1
fi

cd ..
echo "✅ Database setup completed"

# Create uploads directory
echo "📁 Creating uploads directory..."
mkdir -p server/uploads/invoices
echo "✅ Uploads directory created"

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Update server/.env with your production configuration"
echo "2. Start the server: npm start"
echo "3. Access the application at http://localhost:5000"
echo ""
echo "🔐 Default login credentials:"
echo "   Super Admin: admin / admin123"
echo "   Site Admin: siteadmin / admin123"
echo "   Supervisor: supervisor1 / admin123"
echo ""
echo "⚠️  Remember to change default passwords in production!"
echo ""
echo "📚 For more information, see README.md"