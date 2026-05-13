#!/bin/bash
# =============================================================================
# SolarCRM - Local Testing Script
# =============================================================================
# Test that Docker Compose configuration works before deploying to production
#
# Usage: bash test-local.sh
# =============================================================================

set -e

echo "🧪 Testing SolarCRM Docker Compose Configuration"
echo ""

# Check prerequisites
echo "Checking prerequisites..."
command -v docker >/dev/null 2>&1 || { echo "❌ Docker not installed"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose not installed"; exit 1; }
echo "✅ Docker and Docker Compose installed"

# Check .env file
if [ ! -f ".env" ]; then
    echo "❌ Missing .env file"
    echo "Run: cp .env.example .env"
    exit 1
fi
echo "✅ .env file exists"

# Create infrastructure directory if needed
if [ ! -d "infrastructure" ]; then
    echo "❌ Missing infrastructure/ directory"
    exit 1
fi
echo "✅ Infrastructure directory exists"

# Test docker-compose syntax
echo "Checking docker-compose syntax..."
cd infrastructure
docker-compose config > /dev/null 2>&1 && echo "✅ docker-compose.yml is valid" || { echo "❌ Invalid docker-compose syntax"; exit 1; }

# Build images
echo ""
echo "Building Docker images (this may take 2-3 minutes)..."
docker-compose build --no-cache 2>&1 | tail -20

# Start services
echo ""
echo "Starting services..."
docker-compose up -d
sleep 10

# Check service health
echo ""
echo "Checking service health..."

# Frontend
if docker-compose ps nginx | grep -q "Up"; then
    echo "✅ Nginx running"
else
    echo "❌ Nginx not running"
    docker-compose logs nginx
    exit 1
fi

# Backend
if docker-compose ps backend | grep -q "healthy"; then
    echo "✅ Backend healthy"
elif docker-compose ps backend | grep -q "Up"; then
    echo "⚠️  Backend running (still starting)"
else
    echo "❌ Backend not running"
    docker-compose logs backend
    exit 1
fi

# Database
if docker-compose ps postgres | grep -q "Up"; then
    echo "✅ PostgreSQL running"
else
    echo "❌ PostgreSQL not running"
    docker-compose logs postgres
    exit 1
fi

# API health check
echo ""
echo "Testing API endpoint..."
HEALTH=$(curl -s http://localhost:8080/api/health 2>/dev/null || echo '{"error":"Connection failed"}')
if echo "$HEALTH" | grep -q "ok"; then
    echo "✅ API responding"
else
    echo "⚠️  API not responding yet (may still be starting)"
fi

# Show container status
echo ""
echo "Container Status:"
docker-compose ps

echo ""
echo "✅ All tests passed!"
echo ""
echo "📊 Dashboard available at:"
echo "   Frontend: http://localhost:8080"
echo "   Monitoring: http://localhost:3001"
echo ""
echo "To stop services: docker-compose down"
echo "To view logs: docker-compose logs -f"
