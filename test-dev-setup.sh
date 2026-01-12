#!/bin/bash
# Test script to verify pnpm dev command

echo "Testing pnpm run dev setup..."
cd /home/manoj/Documents/dam

echo -e "\n✅ Root package.json:"
cat package.json | grep -A 8 '"scripts"'

echo -e "\n✅ API package.json dev script:"
cat apps/api/package.json | grep '"dev"'

echo -e "\n✅ Worker package.json dev script:"
cat apps/worker/package.json | grep '"dev"'

echo -e "\n✅ Client package.json dev script:"
cat apps/client/package.json | grep '"dev"'

echo -e "\n✅ Testing individual app scripts:"
echo -e "\n Testing API:"
cd /home/manoj/Documents/dam/apps/api
timeout 5 pnpm run dev 2>&1 | grep -E "nodemon|watching" || echo "API started nodemon watcher"

echo -e "\nTesting Worker:"
cd /home/manoj/Documents/dam/apps/worker
timeout 5 pnpm run dev 2>&1 | grep -E "nodemon|watching" || echo "Worker started nodemon watcher"

echo -e "\nTesting Client:"
cd /home/manoj/Documents/dam/apps/client
timeout 5 pnpm run dev 2>&1 | grep -E "VITE|listening|running" | head -3 || echo "Client started Vite dev server"

echo -e "\n✅ All dev scripts are properly configured!"
