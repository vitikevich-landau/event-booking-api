#!/bin/bash

set -e

echo "🔍 Checking environment..."

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version must be 18 or higher (current: $(node -v))"
    exit 1
fi
echo "✅ Node.js $(node -v)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi
echo "✅ npm $(npm -v)"

# Check Docker (optional)
if command -v docker &> /dev/null; then
    echo "✅ Docker $(docker -v | cut -d' ' -f3 | cut -d',' -f1)"
else
    echo "⚠️  Docker is not installed (optional for local development)"
fi

# Check docker-compose (optional)
if command -v docker-compose &> /dev/null; then
    echo "✅ docker-compose $(docker-compose -v | cut -d' ' -f3 | cut -d',' -f1)"
else
    echo "⚠️  docker-compose is not installed (optional for local development)"
fi

# Check .env file
if [ ! -f .env ]; then
    echo "⚠️  .env file not found, copying from .env.example"
    cp .env.example .env
    echo "✅ Created .env file"
else
    echo "✅ .env file exists"
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "⚠️  node_modules not found, running npm install..."
    npm install
    echo "✅ Dependencies installed"
else
    echo "✅ node_modules exists"
fi

echo ""
echo "✨ Environment check complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Update .env with your database credentials"
echo "  2. Start PostgreSQL: docker-compose -f docker-compose.dev.yml up -d"
echo "  3. Run migrations: npm run migrate:up"
echo "  4. Start development: npm run dev"
echo ""
echo "Or simply run: docker-compose up --build"
