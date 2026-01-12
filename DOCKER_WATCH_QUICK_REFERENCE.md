# Docker Watch - Quick Reference Card

## 🚀 Quick Commands

```bash
# Start development environment (watch mode enabled)
docker compose up -d

# Monitor API changes in real-time
docker compose logs -f api

# Monitor worker changes in real-time
docker compose logs -f worker

# Monitor all services
docker compose logs -f

# View service status
docker compose ps

# Run tests
bash test-e2e.sh

# Stop all services
docker compose down

# Full reset (remove volumes)
docker compose down -v
```

## 🔗 Service URLs

| Service | URL | Purpose |
|---------|-----|---------|
| **API** | `http://localhost:4001` | REST API |
| **API Health** | `http://localhost:4001/health` | Health check |
| **Frontend** | `http://localhost:3001` | React UI |
| **MinIO UI** | `http://localhost:9001` | Storage management |
| **MongoDB** | `mongodb://localhost:27018` | Database |
| **Redis** | `redis://localhost:6379` | Cache/Queue |

## 📁 Watched Directories

| Service | Watched Paths | Rebuilds |
|---------|---------------|----------|
| **API** | `apps/api/src/**`, `packages/database/**`, `package.json`, `pnpm-lock.yaml` | Automatic |
| **Worker** | `apps/worker/src/**`, `packages/database/**`, `package.json`, `pnpm-lock.yaml` | Automatic |
| **Client** | `apps/client/src/**`, `package.json`, `pnpm-lock.yaml` | Automatic |

## 🔄 How It Works

1. **Edit Code** → 2. **Docker Detects Change** → 3. **Auto Rebuild** → 4. **Code Updated on Same Port**

**Time**: Typically 10-15 seconds from change to live

## ✅ Verification Checklist

- [ ] `docker compose ps` shows 6/6 containers UP
- [ ] `http://localhost:4001/health` returns `{"ok":true,"db":true,"service":true}`
- [ ] `http://localhost:3001` loads (HTTP 200)
- [ ] `bash test-e2e.sh` passes all 10 tests
- [ ] `docker compose logs -f api` shows startup message with "Watch Mode Enabled"

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Changes not detected | Verify files are in watched directories |
| Build fails | Check `docker compose logs <service>` for errors |
| Port in use | `lsof -i :<port>` to find process using port |
| Services won't start | `docker compose down -v` then `docker compose up -d` |

## 📊 Current Status

```
✅ Containers:  6/6 running
✅ API Health:  OK
✅ Frontend:    Accessible
✅ Watch Mode:  3 services configured
✅ Tests:       10/10 passing (100%)
```

## 📚 Full Documentation

- **DOCKER_WATCH_SETUP.md** - Complete setup guide
- **DOCKER_WATCH_IMPLEMENTATION_SUMMARY.md** - Technical details
- **test-e2e.sh** - Automated test suite

---

**Ready to develop?** `docker compose up -d` and start editing!
