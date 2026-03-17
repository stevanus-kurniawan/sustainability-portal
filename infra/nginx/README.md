# NGINX Reverse Proxy for sustainability.kpndomain.com

Routes **https://sustainability.kpndomain.com** (and **http://**) to the app at **172.28.80.50:8000** so users do not need to specify the port.

## Files

| File | Purpose |
|------|--------|
| `sustainability.kpndomain.com.conf` | Full config: HTTP→HTTPS redirect + HTTPS proxy (production) |
| `sustainability.kpndomain.com.http-only.conf` | HTTP-only proxy (use before SSL is ready) |
| `DOCKER-NGINX-SETUP.md` | **Port 80 in Docker:** step-by-step guide to add this site to the NGINX container already on port 80 |
| `SSL-DOCKER-SETUP.md` | **SSL in Docker:** add HTTPS for sustainability.kpndomain.com when NGINX runs in project_management_frontend container |
| `INTERNAL-CA-SSL.md` | **Internal-only SSL:** create a private CA and issue a certificate for sustainability.kpndomain.com (no public DNS) |
| `DEPLOY-CA-VIA-GPO-MDM.md` | **Deploy CA on the network:** push the internal CA via Group Policy (Windows) and MDM (Macs/mobile) so all managed devices trust the site automatically |
| `SSL-SERVER-SIDE-INTERNAL-ACCESS.md` | **Server-side SSL + internal-only access:** use a public certificate (e.g. Let's Encrypt) so the site is trusted for everyone who can access, and restrict access by firewall/VPN so only the internal team can reach the URL |
| `HOW-TO-PUBLIC-SSL-INTERNAL-ACCESS.md` | **Step-by-step:** get Let's Encrypt, enable HTTPS in Docker NGINX, then restrict 80/443 to internal IPs so only the internal team can access |

## Quick start (HTTP only, no SSL)

1. On the NGINX server, copy the HTTP-only config:
   ```bash
   sudo cp sustainability.kpndomain.com.http-only.conf /etc/nginx/sites-available/sustainability.kpndomain.com.conf
   ```
2. Enable and test:
   ```bash
   sudo ln -sf /etc/nginx/sites-available/sustainability.kpndomain.com.conf /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```
3. Ensure **sustainability.kpndomain.com** DNS points to this NGINX server.

Users can then use **http://sustainability.kpndomain.com** (no `:8000`).

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

- NGINX installed on a host that will serve **sustainability.kpndomain.com**.
- DNS for **sustainability.kpndomain.com** pointing to that NGINX host.
- Backend app listening on **172.28.80.50:8000** (either on the same machine or reachable from the NGINX host).

## Expected result

- **http://sustainability.kpndomain.com** → redirects to HTTPS (when using full config).
- **https://sustainability.kpndomain.com** → proxied to **http://172.28.80.50:8000**; users do not need to use `:8000`.

## Port 80 already used by another project

Port 80 can be shared: NGINX chooses the server block by **Host** (`server_name`). For **sustainability.kpndomain.com** to go to the app on **8000**, do the following.

1. **This site’s config must be loaded**  
   The file must be in `sites-enabled` (symlink from `sites-available`) and NGINX must be reloaded after adding it.

2. **Other project must be default server only**  
   So it only handles requests that do *not* match any other `server_name`. In the **other** project’s server block (the one that currently gets port 80), set:
   ```nginx
   listen 80 default_server;
   listen [::]:80 default_server;
   ```
   Then reload NGINX. Requests to `sustainability.kpndomain.com` will match this project’s block and proxy to 8000; other hostnames will use the other project.

3. **Check which config is used**  
   On the server:
   ```bash
   ls -la /etc/nginx/sites-enabled/
   sudo nginx -T | grep -A2 "server_name sustainability"
   ```
   You should see `server_name sustainability.kpndomain.com` and a block that does `proxy_pass` to `:8000`.
