# Quick Start Guide - pnpm run dev

## 🚀 Quick Setup (30 seconds)

### Step 1: Start Docker Services
```bash
docker compose up -d mongo redis minio
```

### Step 2: Run Dev Environment
```bash
pnpm run dev
```

That's it! All three apps will start automatically:
- ✅ **API Server**: http://localhost:4000 (Express + TypeScript)
- ✅ **Client**: http://localhost:5173 (React + Vite + Hot Reload)
- ✅ **Worker**: Background job processor

---

## 📋 Individual Commands

```bash
# Run only API with hot reload
pnpm run dev:api

# Run only Client with hot reload
pnpm run dev:client

# Run only Worker with hot reload
pnpm run dev:worker

# Build all apps
pnpm run build

# Lint all apps
pnpm run lint

# Stop Docker services
pnpm run docker:stop
```

---

## 🔗 Useful URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| Client App | http://localhost:5173 | N/A |
| API Server | http://localhost:4000 | N/A |
| API Health Check | http://localhost:4000/health | N/A |
| MinIO Console | http://localhost:9001 | admin/password |
| MongoDB | mongodb://localhost:27018 | N/A |
| Redis | redis://localhost:6379 | N/A |

---

## ✨ Features

✅ **Hot Reload**: API & Worker restart on file changes
✅ **Instant HMR**: Client has instant hot module replacement
✅ **TypeScript**: Full type safety with strict checking
✅ **Parallel Running**: All apps run simultaneously
✅ **Monorepo**: Shared types via `@dam/database`

---

## 🔧 Troubleshooting

### MongoDB Connection Error
```bash
# Check if MongoDB is running
nc -zv localhost 27018

# Or restart Docker services
docker compose restart mongo
```

### Port Already in Use
```bash
# Find and kill process using port
lsof -i :4000   # For API (4000)
lsof -i :5173   # For Client (5173)
lsof -i :6379   # For Redis (6379)
```

### Dependencies Issues
```bash
# Clear and reinstall
rm -rf node_modules .pnpm
pnpm install
```

---

## 📚 Documentation

- **Full Setup Guide**: See `DEV_SETUP.md`
- **Changes Made**: See `DEV_SETUP_CHANGES.md`
- **Architecture**: See `ARCHITECTURE.md`

---

## 🎯 Next Steps

1. Run `docker compose up -d mongo redis minio`
2. Run `pnpm run dev`
3. Open http://localhost:5173 in your browser
4. Start building! 🎉
