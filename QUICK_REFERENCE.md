# 🎯 Quick Reference - DAM Development

## Start Development
```bash
docker compose up -d
```
✓ Frontend: http://localhost:3001  
✓ API: http://localhost:4002  
✓ Ready in ~4 seconds

## Your Typical Development Session

### 1️⃣ Open Code Editor
```bash
code apps/client/src/App.tsx
```

### 2️⃣ Edit Component
```
Make your changes, save the file
```

### 3️⃣ See Changes Instantly
✓ Browser updates automatically  
✓ No docker restart needed  
✓ No manual build required

---

## Common Tasks

| Task | Command | Time |
|------|---------|------|
| Start dev | `docker compose up -d` | 4s |
| Stop dev | `docker compose down` | 2s |
| View logs | `docker compose logs -f client` | instant |
| Restart client | `docker compose restart client` | 2s |
| Full rebuild | `docker compose build --no-cache` | 2-3m |
| Access frontend | http://localhost:3001 | instant |
| Access API | http://localhost:4002 | instant |

---

## What Auto-Updates (No Restart Needed)

✅ React Components  
✅ Styles (CSS)  
✅ Images & Assets  
✅ API Client Code  
✅ Layout Changes  

---

## What Requires Restart

❌ `package.json` changes → `docker compose build --no-cache`  
❌ `node_modules` size increase → `docker compose build --no-cache`  
❌ Environment variables → `docker compose restart client`  
❌ Dockerfile changes → `docker compose build --no-cache`  

---

## Monitoring

### See What's Happening
```bash
# Real-time logs
docker compose logs -f

# Just client logs
docker compose logs -f client

# Just last 10 lines
docker compose logs client --tail=10
```

### Check Service Status
```bash
# All services
docker compose ps

# Just client
docker compose ps client
```

---

## Fixed Issues ✅

✅ **Constant Refresh Loop** - FIXED  
- Added intelligent polling interval (1000ms)
- Configured ignored file patterns  
- Debounced file watch events

✅ **HMR Not Working** - FIXED  
- WebSocket enabled on correct port (3001)  
- Vite client scripts loaded in browser  
- React Refresh plugin active

✅ **Docker Rebuild Every Edit** - FIXED  
- Now using Vite dev server (not static build)  
- File changes detected without rebuild  
- Instant updates via HMR

---

## Pro Tips

💡 Keep `docker compose logs -f client` open while coding  
💡 Use browser DevTools to inspect components  
💡 Changes appear within 1-2 seconds  
💡 Refresh browser only if HMR gets stuck (rare)  
💡 Check logs if changes don't appear  

---

## Troubleshoot

**Changes not showing?**
```bash
# Check Vite is running
docker compose logs client | grep VITE

# If not showing: restart
docker compose restart client
```

**Still refreshing every second?**
```bash
# Increase polling interval in vite.config.ts
interval: 2000  # Instead of 1000
```

**Nothing works?**
```bash
# Nuclear option
docker compose down
docker compose up -d --build
```

---

## Development Checklist

- [ ] `docker compose up -d` running?
- [ ] Can access http://localhost:3001?
- [ ] See "VITE ready" in logs?
- [ ] Make a tiny change (like add "!" to title)?
- [ ] See it in browser instantly?
- [ ] No error messages in console?

✅ All checked? You're ready to develop!

---

**Setup**: January 6, 2026 | **Status**: ✨ Optimized & Stable

