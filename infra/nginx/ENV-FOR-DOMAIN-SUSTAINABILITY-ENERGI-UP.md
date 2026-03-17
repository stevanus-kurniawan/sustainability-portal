# Env values for sustainability.energi-up.com

After the URL **sustainability.energi-up.com** is set up (NGINX proxying to the app on port 8000), set these environment variables so the app works correctly (CORS, redirects, links).

**Rule of thumb:** Only **user-facing** / public values use the **domain** (e.g. sustainability.energi-up.com). **API_BACKEND_URL** on the frontend always uses the **backend server IP** (e.g. `http://172.28.80.50:8001`), not the domain.

Use **https** if you have SSL; use **http** if you are still HTTP-only.

---

## Frontend server (.env)

| Variable | Value | Notes |
|----------|--------|--------|
| **API_URL** | `https://sustainability.energi-up.com/api/v1` | Public URL the **browser** uses for API. No trailing slash. Use `http://` if no SSL. |
| **API_BACKEND_URL** | `http://BACKEND_IP:8001` | **Internal only** — backend server IP and port 8001 (e.g. `http://172.28.80.50:8001`). Never use the domain here; only frontend values that the browser uses (e.g. API_URL) use the domain. |
| **CMS_URL** | (optional) | If you use a CMS, set its base URL. |

**Example (HTTPS):**
```bash
API_URL=https://sustainability.energi-up.com/api/v1
API_BACKEND_URL=http://172.28.80.50:8001
```

**Example (HTTP only):**
```bash
API_URL=http://sustainability.energi-up.com/api/v1
API_BACKEND_URL=http://172.28.80.50:8001
```

After changing **API_URL**, rebuild the frontend image (it is baked in as `NEXT_PUBLIC_API_URL`):
```bash
docker compose -f infra/docker-compose.prod.frontend.yml --env-file infra/.env up -d --build
```

---

## Backend server (.env)

| Variable | Value | Notes |
|----------|--------|--------|
| **CORS_ORIGIN** | `https://sustainability.energi-up.com` | Must match the **origin** the browser sends (scheme + host, no path). Use `http://` if no SSL. |
| **WEB_URL** | `https://sustainability.energi-up.com` | **Required for email links.** Used for password-reset and email-verification links in emails. If unset, links point to `http://localhost:3000` and users are sent to the wrong place. Same as CORS_ORIGIN. |
| **API_PUBLIC_BASE_URL** | `https://sustainability.energi-up.com/api/v1` | Public base URL for API (e.g. document links). Optional but recommended. |

**Important:** **WEB_URL** (or **APP_BASE_URL**) must be set on the backend so that:
- **Forgot password** – the reset link in the email goes to your real site (e.g. `https://sustainability.energi-up.com/auth/reset-password?token=...`), not localhost. Otherwise the link sends users to the wrong host and "forgot password" appears broken.
- **Email verification** – the verification link in the registration email goes to your real site (e.g. `https://sustainability.energi-up.com/auth/verify-email?token=...`), not localhost.

**Example (HTTPS):**
```bash
CORS_ORIGIN=https://sustainability.energi-up.com
WEB_URL=https://sustainability.energi-up.com
API_PUBLIC_BASE_URL=https://sustainability.energi-up.com/api/v1
```

**Example (HTTP only):**
```bash
CORS_ORIGIN=http://sustainability.energi-up.com
WEB_URL=http://sustainability.energi-up.com
API_PUBLIC_BASE_URL=http://sustainability.energi-up.com/api/v1
```

If you have multiple frontend origins (e.g. domain + IP), use **CORS_ORIGINS** (comma-separated) instead of CORS_ORIGIN:
```bash
CORS_ORIGINS=https://sustainability.energi-up.com,http://172.28.80.50:8000
```

Restart the backend after changing env:
```bash
docker compose -f infra/docker-compose.prod.backend.yml --env-file infra/.env restart api
# or full up -d if you prefer
```

---

## Summary

| Where | Variable | Set to (domain) |
|-------|----------|------------------|
| Frontend | API_URL | `https://sustainability.energi-up.com/api/v1` (or http) |
| Frontend | API_BACKEND_URL | `http://BACKEND_IP:8001` (internal, not domain) |
| Backend | CORS_ORIGIN | `https://sustainability.energi-up.com` (or http) |
| Backend | WEB_URL | `https://sustainability.energi-up.com` (or http) |
| Backend | API_PUBLIC_BASE_URL | `https://sustainability.energi-up.com/api/v1` (or http) |

Use **https** everywhere if you have SSL; use **http** if the site is still HTTP-only.

---

## "Cannot reach the server" when logging in

This message means the **frontend server** (Next.js) cannot reach the **backend API** when handling login (it calls `API_BACKEND_URL` + `/auth/login`).

**If API_BACKEND_URL is already the backend IP** (not the domain), then the problem is connectivity between the frontend server and the backend:

1. **Backend** is running and listening on port **8001**.
2. **From the frontend host/container**, the backend IP:8001 is reachable (no firewall blocking, same network or routed). Test from the **same place the frontend runs** (if the frontend runs in Docker, run curl **inside that container**):
   ```bash
   curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 http://<BACKEND_IP>:8001/api/v1/health
   ```
   Replace `<BACKEND_IP>` with your actual backend IP. You should get **200**. If you get **404** on `/api/v1/` that still means the server responded (connectivity OK); use `/api/v1/health` for a clear 200. A timeout or connection refused means fix network/firewall or use the IP the frontend container can reach (e.g. host gateway like `172.17.0.1` if backend is on the host and frontend in Docker).
3. **API_BACKEND_URL** must be the URL the **frontend process** can use. If the frontend runs in Docker and the backend is on the **same host**, use the host IP or Docker gateway (e.g. `http://172.17.0.1:8001`), not `localhost`. If the backend is on another server, use that server’s IP.

**If you had used the domain in API_BACKEND_URL:** set it back to `http://<backend-server-ip>:8001` only. Rebuild/restart the frontend after changing env.
