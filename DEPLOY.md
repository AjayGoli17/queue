# Deploying the hospital queue demo to Render (one free Web Service)

One service runs Express (API + `/ws` WebSocket) and serves the built React app
(`client/dist`). The database is the existing embedded PGlite. No UI, routes,
queue logic or WebSocket protocol was changed.

## 0. After applying the patch (one time)

```bash
git apply deploy-render.patch
git ls-files data      # is the generated PGlite folder tracked by Git?
```

- If `git ls-files data` prints nothing, do nothing more for `data/`.
- Only if it prints files, untrack them (the files stay on disk):

  ```bash
  git rm -r --cached data
  ```

Then commit and push:

```bash
git add -A && git commit -m "Render deployment support" && git push
```

`data/` is now in `.gitignore`. Leaving it tracked is harmless on Render (the Blueprint
points PGlite at `/tmp/pgdata`), it just adds noise to the repository.

## 1. Create the service

**A. Blueprint (recommended):** Render Dashboard -> New -> Blueprint -> pick the repo.
Render reads `render.yaml` and creates `hospital-queue-demo` on the free plan.

**B. Manual:** New -> Web Service -> pick the repo, then set:

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Instance type | Free |
| Build Command | `npm ci && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/health` |

Environment variables (both options):

| Key | Value | Why |
| --- | --- | --- |
| `NODE_VERSION` | `22.12.0` | Vite 8 needs Node >= 20.19 |
| `PGLITE_DATA_DIR` | `/tmp/pgdata` | Writable runtime path for PGlite (optional) |

`PORT` is provided by Render. The root build script runs `npm ci --prefix client --include=dev`
(lockfile-exact, and includes the client's Vite/TypeScript build tools even when `NODE_ENV=production`). Do not set `DATABASE_URL` (if set, the app uses that Postgres instead of PGlite).

## 2. Test (replace YOUR-APP)

1. `https://YOUR-APP.onrender.com/health` returns `{"status":"healthy",...}`
2. `/reception` loads (refresh must not 404)
3. `/display` loads
4. `/track/A07` loads and shows Meena Das
5. Realtime: open all three in separate tabs/devices; on `/reception` use CALL NEXT,
   add a walk-in, or set doctor delay. `/display` and `/track/...` update immediately
   (the browser console shows `QUEUE_UPDATED`; the socket is `wss://YOUR-APP.onrender.com/ws`).

## Free-tier behaviour to know before a demo

- The service sleeps after ~15 min idle; the first request then takes ~30-60 s.
  Open the URL a few minutes before the demo. Open pages reconnect automatically.
- PGlite data on Render is ephemeral by design (this is a demo, not a production
  hospital deployment). On every start the app runs its existing seed and
  re-creates the standard `active_demo` state (A01-A10). Use the existing Demo
  Reset menu during a demo.
- Run a single instance only (in-process WebSocket broadcast + embedded DB).

## Local development (unchanged)

```bash
npm install && npm install --prefix client
npm run dev            # Vite on :3000, API on :5001
```

Local production check: `npm run build && npm start`, then open http://localhost:5001/reception.
