#!/bin/bash

# Nuru Worker Management System Setup Script
echo "🚀 Setting up Nuru Worker Management System..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL 12+ first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install

# Install client dependencies
echo "📦 Installing client dependencies..."
cd ../client
npm install

# Go back to root
cd ..

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your database credentials before running migrations"
fi

# Create upload directories
echo "📁 Creating upload directories..."
mkdir -p server/uploads
mkdir -p server/pdfs

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your database credentials"
echo "2. Create PostgreSQL database: createdb nuru_worker_management"
echo "3. Run database migrations: cd server && npm run migrate"
echo "4. Seed sample data: cd server && npm run seed"
echo "5. Start the application: npm run dev"
echo ""
echo "Default login credentials:"
echo "- Super Admin: admin@nurucompany.com / admin123"
echo "- Site Admin: siteadmin@nurucompany.com / admin123"
echo "- Supervisor: supervisor@nurucompany.com / supervisor123"
echo ""
echo "Happy coding! 🚀"