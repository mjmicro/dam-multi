# Development Setup Guide

## Prerequisites

Before running the dev command, ensure you have the following services running:

```bash
# Start required services (MongoDB, Redis, MinIO)
docker compose up -d mongo redis minio
```

Services will be available at:
- **MongoDB**: `mongodb://localhost:27018/mediadb`
- **Redis**: `redis://localhost:6379`
- **MinIO**: `http://localhost:9000` (UI: http://localhost:9001)

## Running the Development Environment

### Option 1: Run All Apps in Parallel (Recommended)

```bash
pnpm run dev
```

This starts all three applications simultaneously using `concurrently`:
- **API Server**: `http://localhost:4000`
- **Client (Vite)**: `http://localhost:5173`
- **Worker**: Processes background jobs from the queue

### Option 2: Run Individual Apps

Run only the API server:
```bash
pnpm run dev:api
```

Run only the client:
```bash
pnpm run dev:client
```

Run only the worker:
```bash
pnpm run dev:worker
```

## Project Structure

```
apps/
├── api/           # Express API server (TypeScript)
│   └── Port: 4000
├── client/        # React + Vite UI (TypeScript)
│   └── Port: 5173
└── worker/        # BullMQ Job Queue Worker (TypeScript)
    └── Background processing
```

## Technologies Used

- **API**: Express.js with TypeScript
- **Client**: React 18 + Vite + TypeScript + Tailwind CSS
- **Worker**: BullMQ + TypeScript
- **Database**: MongoDB
- **Queue**: Redis + BullMQ
- **Storage**: MinIO
- **Dev Tools**: Nodemon (API/Worker), Vite (Client)

## Environment Files

Each app has its own `.env` file:
- `.env` (root - for Docker setup)
- `apps/api/.env` (API configuration)
- `apps/worker/.env` (Worker configuration)
- `apps/client/.env` (Client configuration)

## Features

### Hot Reload
- **API/Worker**: Automatically restarts on TypeScript file changes via nodemon
- **Client**: Instant hot module replacement (HMR) via Vite

### TypeScript Support
- All apps use TypeScript with strict type checking
- Shared types via `@dam/database` package

### Monorepo Structure
- Uses `pnpm` workspaces for dependency management
- Shared packages: `@dam/database`
- Workspace references allow internal package imports

## Common Issues & Solutions

### MongoDB Connection Timeout
- Ensure MongoDB is running: `docker compose ps mongo`
- Check port is 27018: `nc -zv localhost 27018`

### Redis Connection Issues
- Verify Redis is running: `docker compose ps redis`
- Default port: 6379

### MinIO Bucket Creation Error
- Ensure MinIO is running: `docker compose ps minio`
- Bucket will be auto-created on first run

### TypeScript Compilation Errors
- Clear cache: `rm -rf apps/*/node_modules/.pnpm`
- Reinstall: `pnpm install`
- Rebuild database package: `pnpm --filter @dam/database build`

## Testing the Setup

Run the included test script:
```bash
chmod +x test-dev-setup.sh
./test-dev-setup.sh
```

This verifies all dev scripts are properly configured.

## Useful Commands

```bash
# Build all apps
pnpm run build

# Lint all apps
pnpm run lint

# Start Docker services
docker compose up -d

# Stop Docker services
pnpm run docker:stop

# View logs for a service
docker compose logs -f mongo  # or redis, minio, api, worker

# Build Docker images and run all services
pnpm run docker:dev
```

## Next Steps

1. Start Docker services: `docker compose up -d mongo redis minio`
2. Run dev environment: `pnpm run dev`
3. Open browser:
   - Client: http://localhost:5173
   - API Health Check: http://localhost:4000/health
   - MinIO Console: http://localhost:9001
4. Start developing!
