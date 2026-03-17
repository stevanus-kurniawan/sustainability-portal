# Fix: sustainability.energi-up.com shows the PM app (port 80) instead of the app on 8000

**Symptom:** Opening http://sustainability.energi-up.com shows the same content as pm.energi-up.com (the app on port 80), not the app on **147.139.176.70:8000**.

**Cause:** The request is handled by the **pm.energi-up.com** server block instead of a **separate** block for **sustainability.energi-up.com**. That happens when:

1. There is **no** server block with `server_name sustainability.energi-up.com` → NGINX uses the default server (pm.energi-up.com).
2. The sustainability block was added **inside** the pm.energi-up.com block (wrong nesting) → it doesn’t act as a separate server.
3. Typo in `server_name` (e.g. `sustainability.energi-up.com` vs `sustainability.energi-up.com`).

---

## Correct structure of nginx-ssl.conf

You must have **two (or more) separate** `server { ... }` blocks at the **top level** — not one inside the other.

**Wrong (sustainability inside pm block):**
```nginx
server {
    listen 80;
    server_name pm.energi-up.com localhost;
    ...
    server {                          # ← WRONG: nested server block
        server_name sustainability.energi-up.com;
        ...
    }
}
```

**Correct (each domain its own block):**
```nginx
# Block 1: pm.energi-up.com
server {
    listen 80;
    server_name pm.energi-up.com localhost;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl;
    server_name pm.energi-up.com localhost;
    ...
}

# Block 2: sustainability.energi-up.com (must be its own block, same level as above)
server {
    listen 80;
    listen [::]:80;
    server_name sustainability.energi-up.com;

    location / {
        proxy_pass http://147.139.176.70:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_buffering off;
    }
}
```

---

## What to do on the server

### 1. Open the config

```bash
sudo nano /opt/Project-Management-V2.0/frontend/nginx-ssl.conf
```

### 2. Find the sustainability block

- Search for `sustainability.energi-up.com`.
- The line `server_name sustainability.energi-up.com;` must be inside a **standalone** `server { ... }` that starts with `server {` and ends with `}` and is **not** inside the pm.energi-up.com block (not between the `server {` of pm and its closing `}`).

### 3. If the block is missing or wrong

- **If missing:** Add the full sustainability block (the one in the “Correct” example above) **after** the closing `}` of the **last** pm.energi-up.com server block (the one that has `location /`, `try_files`, etc.). So: after `}` that closes the HTTPS pm block, add a blank line and then the sustainability `server { ... }`.
- **If it’s nested inside pm:** Move the whole sustainability `server { ... }` out so it’s **after** the closing `}` of the pm block, at the same indentation level as the other `server` blocks.

### 4. Ensure exact server_name and proxy_pass

Inside the sustainability block you must have:

- `server_name sustainability.energi-up.com;`  (no typo, no extra spaces)
- `proxy_pass http://147.139.176.70:8000;`

### 5. Test and reload

```bash
docker exec project_management_frontend nginx -t && docker exec project_management_frontend nginx -s reload
```

### 6. Confirm which block is used

```bash
docker exec project_management_frontend nginx -T 2>/dev/null | grep -A2 "server_name sustainability.energi-up"
```

You should see `server_name sustainability.energi-up.com` and a few lines later `proxy_pass http://147.139.176.70:8000`. If you see something else (e.g. `root /usr/share/nginx/html`), that’s still the pm block — fix the structure again.

---

## Summary

- **sustainability.energi-up.com** must have its **own** top-level `server { ... }` with `server_name sustainability.energi-up.com` and `proxy_pass http://147.139.176.70:8000`.
- That block must **not** be inside the pm.energi-up.com `server { }`.
- After editing, run `nginx -t` and `nginx -s reload` in the container.

Then http://sustainability.energi-up.com should show the app on port 8000, not the PM app on port 80.

---

## Config is correct but the site still doesn’t show the sustainability app

If `grep` shows the block and `proxy_pass http://147.139.176.70:8000` is there, but visiting **http://sustainability.energi-up.com** still doesn’t show the sustainability app, run these in order.

### 1. What does NGINX actually return? (on the server)

```bash
curl -I -H "Host: sustainability.energi-up.com" http://127.0.0.1/
```

- **502 Bad Gateway** or **504 Gateway Time-out** → NGINX is using the right block but **cannot reach** the backend (e.g. public IP blocked or timeout).  
  **Fix:** In the sustainability block, use the **private IP** so the container can reach the app:
  - `proxy_pass http://172.28.80.50:8000;`  
  **No leading slash:** use `172.28.80.50:8000` not `/172.28.80.50:8000`. A leading slash causes: `no host in upstream "/172.28.80.50:8000"`.  
  Then ensure the container can reach that IP (same host or same network). Reload NGINX and test again.
- **200 / 301 / 302** → NGINX and backend are fine. The problem is likely **DNS**: your browser is talking to a **different** server. Go to step 2.
- **PM app content (e.g. 200 with PM page)** → Another server block is still handling this host. Go to step 3.

### 2. Where does the domain point? (DNS)

**On the same PC where you open the site**, run:

```bash
nslookup sustainability.energi-up.com
```

The IP must be the **same** as the server where **project_management_frontend** runs (the one with this NGINX config). If it’s a different IP, you’re hitting another machine. Fix DNS so **sustainability.energi-up.com** points to the correct server, then try again.

### 3. Is another server block taking the request?

List all port‑80 server blocks and their `server_name`:

```bash
docker exec project_management_frontend nginx -T 2>/dev/null | grep -E "listen.*80|server_name"
```

Check whether:

- The **sustainability** block appears **after** another block whose `server_name` could match first (e.g. a wildcard like `*.energi-up.com` or a long list that includes your domain).
- There are two blocks with `server_name sustainability.energi-up.com` (first one wins).

If another block is matching first, move the sustainability block **above** that one in `nginx-ssl.conf`, or remove/change the other block’s `server_name`, then reload NGINX.

### 4. Error: `no host in upstream "/172.28.80.50:8000"`

This means there is a **leading slash** before the IP. NGINX then treats it as a path, not a host.

**Wrong:** `server /172.28.80.50:8000;` or `proxy_pass http:///172.28.80.50:8000;`  
**Correct:** `server 172.28.80.50:8000;` or `proxy_pass http://172.28.80.50:8000;`

In `nginx-ssl.conf` around line 134 (or wherever the sustainability block is), remove the `/` so the value is `172.28.80.50:8000` with no slash at the start.

### 5. Quick summary

| Result of `curl -I -H "Host: sustainability.energi-up.com" http://127.0.0.1/` | Likely cause | Action |
|-----------------------------------------------------------------------------|-------------|--------|
| 502 Bad Gateway | Backend `147.139.176.70:8000` not reachable from container | Use `proxy_pass http://172.28.80.50:8000;`, reload NGINX |
| 200 but browser still shows wrong app | DNS points to wrong server | Point **sustainability.energi-up.com** to the server that runs this NGINX |
| PM app / wrong content | Different server block handling the request | Fix block order or `server_name` so the sustainability block is used |
