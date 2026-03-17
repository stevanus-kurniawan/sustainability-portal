# NGINX Reverse Proxy for sustainability.energi-up.com

Routes **http://sustainability.energi-up.com** (and later **https://**) to the app at **147.139.176.70:8000** so users do not need to specify the port.

## Files

| File | Purpose |
|------|--------|
| **`sustainability.energi-up.com.http-only.conf`** | **HTTP-only proxy** (current; use before SSL is ready) — backend configurable (127.0.0.1 or 147.139.176.70:8000) |
| **`DEVOPS-DOMAIN-AND-PUBLIC-IP.md`** | **Troubleshooting:** domain wrong port + public IP 147.139.176.70:8000 not accessible |
| **`FIX-FIREFOX-WORKS-CHROME-INCOGNITO-PM-APP.md`** | **Intermittent:** Firefox shows sustainability app, Chrome incognito shows PM app (HTTP vs HTTPS) |
| **`ENV-FOR-DOMAIN-SUSTAINABILITY-ENERGI-UP.md`** | **Env:** Which backend/frontend env values to set for sustainability.energi-up.com |
| **`FIX-PM-APP-403-AFTER-SUSTAINABILITY.md`** | **403:** PM app returns 403 Forbidden after adding sustainability blocks |
| `sustainability.kpndomain.com.conf` | Full config for old domain: HTTP→HTTPS redirect + HTTPS proxy |
| `sustainability.kpndomain.com.http-only.conf` | HTTP-only for old domain (172.28.80.50:8000) |
| `DOCKER-NGINX-SETUP.md` | **Port 80 in Docker:** step-by-step guide to add this site to the NGINX container already on port 80 |
| `SSL-DOCKER-SETUP.md` | **SSL in Docker:** add HTTPS for sustainability.kpndomain.com when NGINX runs in project_management_frontend container |
| `INTERNAL-CA-SSL.md` | **Internal-only SSL:** create a private CA and issue a certificate for sustainability.kpndomain.com (no public DNS) |
| `DEPLOY-CA-VIA-GPO-MDM.md` | **Deploy CA on the network:** push the internal CA via Group Policy (Windows) and MDM (Macs/mobile) so all managed devices trust the site automatically |
| `SSL-SERVER-SIDE-INTERNAL-ACCESS.md` | **Server-side SSL + internal-only access:** use a public certificate (e.g. Let's Encrypt) so the site is trusted for everyone who can access, and restrict access by firewall/VPN so only the internal team can reach the URL |
| `HOW-TO-PUBLIC-SSL-INTERNAL-ACCESS.md` | **Step-by-step:** get Let's Encrypt, enable HTTPS in Docker NGINX, then restrict 80/443 to internal IPs so only the internal team can access |

## Quick start (HTTP only, no SSL)

1. On the NGINX server, copy the HTTP-only config:
   ```bash
   sudo cp sustainability.energi-up.com.http-only.conf /etc/nginx/sites-available/sustainability.energi-up.com.conf
   ```
   **Docker (shared nginx-ssl.conf):** Add the contents of `sustainability.energi-up.com.http-only.conf` as a new `server { ... }` block in `/opt/Project-Management-V2.0/frontend/nginx-ssl.conf`, then reload the container.
2. Enable and test (system NGINX):
   ```bash
   sudo ln -sf /etc/nginx/sites-available/sustainability.energi-up.com.conf /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```
   **Docker:** `docker exec project_management_frontend nginx -t && docker exec project_management_frontend nginx -s reload`
3. Ensure **sustainability.energi-up.com** DNS points to the NGINX host.

Users can then use **http://sustainability.energi-up.com** (no `:8000`). Backend: **147.139.176.70:8000**.

## Production (HTTPS)

1. Install certbot (Let's Encrypt) if needed:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   ```
2. Use the full config:
   ```bash
   sudo cp sustainability.kpndomain.com.conf /etc/nginx/sites-available/sustainability.kpndomain.com.conf
   ```
3. **Before enabling HTTPS**, temporarily change the main config so port 80 does not redirect (comment out the `return 301` and use a simple `proxy_pass` on port 80, or use the HTTP-only config) so certbot can complete the challenge.
4. Obtain certificate:
   ```bash
   sudo certbot certonly --webroot -w /var/www/certbot -d sustainability.kpndomain.com
   ```
   Or with NGINX: `sudo certbot --nginx -d sustainability.kpndomain.com`
5. Ensure SSL paths in the config match your cert location (e.g. Let's Encrypt paths in the conf).
6. Enable site, test and reload:
   ```bash
   sudo ln -sf /etc/nginx/sites-available/sustainability.kpndomain.com.conf /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

## Requirements

- NGINX installed on a host that will serve **sustainability.energi-up.com** (or shared config in Docker).
- DNS for **sustainability.energi-up.com** pointing to that NGINX host.
- Backend app listening on **147.139.176.70:8000** (reachable from the NGINX host).

## Expected result (HTTP only)

- **http://sustainability.energi-up.com** → proxied to **http://147.139.176.70:8000**; users do not need to use `:8000`.  
- HTTPS can be added later (Let's Encrypt, internal CA, or self-signed); see the other docs in this folder.

## Port 80 already used by another project

Port 80 can be shared: NGINX chooses the server block by **Host** (`server_name`). For **sustainability.energi-up.com** to go to the app on **8000**, ensure this site’s server block is loaded and the other project uses `listen 80 default_server;`. Then requests to `sustainability.energi-up.com` will match this block and proxy to **147.139.176.70:8000**.