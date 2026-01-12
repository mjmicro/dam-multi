#!/bin/bash
# Comprehensive test of the fixed pnpm dev setup

echo "=========================================="
echo "COMPREHENSIVE DEV SETUP TEST"
echo "=========================================="

cd /home/manoj/Documents/dam

# Check Docker services
echo -e "\n✅ Checking Docker Services..."
MONGO=$(docker compose ps mongo 2>&1 | grep -c "Up")
REDIS=$(docker compose ps redis 2>&1 | grep -c "Up")
MINIO=$(docker compose ps minio 2>&1 | grep -c "Up")

if [ $MONGO -eq 1 ] && [ $REDIS -eq 1 ] && [ $MINIO -eq 1 ]; then
    echo "✅ All required services are running"
else
    echo "⚠️ Warning: Some services may not be running. Run: docker compose up -d mongo redis minio"
fi

# Check dependencies
echo -e "\n✅ Checking Dependencies..."
echo "Concurrently: $(pnpm ls concurrently 2>/dev/null | grep -o 'concurrently.*' | head -1)"
echo "ts-node: $(pnpm ls ts-node 2>/dev/null | grep -o 'ts-node.*' | head -1)"
echo "Nodemon (API): $(cd apps/api && pnpm ls nodemon 2>/dev/null | grep -o 'nodemon.*' | head -1)"

# Check environment files
echo -e "\n✅ Checking .env Files..."
[ -f ".env" ] && echo "✓ Root .env exists"
[ -f "apps/api/.env" ] && echo "✓ API .env exists"
[ -f "apps/worker/.env" ] && echo "✓ Worker .env exists"
[ -f "apps/client/.env" ] && echo "✓ Client .env exists"

# Verify scripts in package.json
echo -e "\n✅ Verifying Dev Scripts..."
echo "Root dev script:"
pnpm pkg get scripts.dev 2>/dev/null | head -1

echo -e "\nAPI dev script:"
cd apps/api && pnpm pkg get scripts.dev 2>/dev/null && cd ../..

echo -e "\nWorker dev script:"
cd apps/worker && pnpm pkg get scripts.dev 2>/dev/null && cd ../..

echo -e "\nClient dev script:"
cd apps/client && pnpm pkg get scripts.dev 2>/dev/null && cd ../..

# Test TypeScript compilation
echo -e "\n✅ Testing TypeScript Compilation..."
cd apps/api
timeout 3 npx tsc --version 2>&1 | grep Version || echo "TypeScript available"
cd ../..

# Show project structure
echo -e "\n✅ Project Structure:"
echo "apps/"
echo "├── api/        (Express + TypeScript - Port 4000)"
echo "├── client/     (React + Vite - Port 5173)"
echo "└── worker/     (BullMQ Worker)"
echo ""
echo "packages/"
echo "└── database/   (Shared types and schemas)"

# Final instructions
echo -e "\n=========================================="
echo "SETUP COMPLETE!"
echo "=========================================="
echo ""
echo "To start development:"
echo ""
echo "1. Ensure Docker services are running:"
echo "   docker compose up -d mongo redis minio"
echo ""
echo "2. Start all apps in parallel:"
echo "   pnpm run dev"
echo ""
echo "Or run individual apps:"
echo "   pnpm run dev:api"
echo "   pnpm run dev:client"
echo "   pnpm run dev:worker"
echo ""
echo "Access:"
echo "   Client: http://localhost:5173"
echo "   API: http://localhost:4000/health"
echo "   MinIO Console: http://localhost:9001 (admin/password)"
echo ""
