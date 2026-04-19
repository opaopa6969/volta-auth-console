[日本語版](getting-started-ja.md)

# Getting Started — volta-auth-console

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | 20+ |
| npm | 10+ |
| volta-auth-proxy | running and reachable |

---

## 1. Install

```bash
cd volta-auth-console
npm install
```

---

## 2. Connect to volta-auth-proxy

The SPA proxies all `/api/`, `/auth/`, and `/.well-known/` requests to volta-auth-proxy. In development, Vite's dev server handles this via `vite.config.js`.

Check that `vite.config.js` has a proxy block pointing to your local volta-auth-proxy:

```js
// vite.config.js (example)
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:7070',
      '/auth': 'http://localhost:7070',
      '/.well-known': 'http://localhost:7070',
    },
  },
});
```

If volta-auth-proxy runs on a different host/port, update the proxy target accordingly.

> **Note**: The `NODE_OPTIONS='--max-http-header-size=65536'` flag in `npm run dev` is required because volta-auth-proxy sends large auth cookies that exceed Node's default header size limit.

---

## 3. Start the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). If volta-auth-proxy is reachable, you will be redirected to the login page; after authenticating you land on the Dashboard.

---

## 4. Build for production

```bash
npm run build
```

Output goes to `dist/`. Serve with nginx using the provided `nginx.conf`.

**Before deploying**, update the hardcoded backend IP in `nginx.conf`:

```nginx
proxy_pass http://192.168.1.13:7070;  # ← replace with your host:port
```

See [docs/architecture.md#nginxconf](architecture.md#nginxconf) for the recommended environment-variable approach.

---

## 5. Auth flow on first load

On mount, the app runs the `sessionResumeDefinition` tramli flow:

```
CHECKING → api.me() + api.myTenants() (parallel)
  ├── 200 OK  → AUTHENTICATED — renders the SPA
  └── 401     → NO_SESSION    — redirects to /login?return_to=<current-path>
```

No manual token management is needed. Sessions are cookie-based; volta-auth-proxy issues and validates them.

---

## 6. Role-based access

The Sidebar renders the **Monitor** link only for `ADMIN` or `OWNER` roles. Other pages check role in the page component itself. Roles come from the `user` object in zustand `authStore` (populated from `api.me()` response).

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Blank screen, no redirect | volta-auth-proxy unreachable | Check proxy target in vite.config.js |
| `431 Request Header Fields Too Large` | Missing `NODE_OPTIONS` | Use `npm run dev` (not `vite` directly) |
| Auth loop (redirect → login → redirect) | Cookie domain mismatch | Ensure dev server and proxy are on same origin |
| Monitor page shows "Coming Soon" | tramli#37 or volta-auth-proxy#22 unresolved | Expected — see [docs/monitor-page.md](monitor-page.md) |
