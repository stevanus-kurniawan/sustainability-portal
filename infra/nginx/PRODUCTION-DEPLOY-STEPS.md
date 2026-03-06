# Step-by-Step: Production Deployment for sustainability.kpndomain.com

This guide walks you through putting the NGINX reverse proxy in production so users can use **https://sustainability.kpndomain.com** (no `:8000`).

---

## Prerequisites (do these first)

### Step 1: Confirm the application is running

- The app must be listening on **172.28.80.50:8000**.
- From the server where NGINX will run, verify you can reach it:
  ```bash
  curl -I http://172.28.80.50:8000
  ```
- You should get an HTTP response (e.g. 200, 302). If it fails, fix the app or network first.

### Step 2: Choose the NGINX server

- NGINX must run on a host that:
  - Has a public IP (or is reachable via your DNS).
  - Can reach **172.28.80.50:8000** (same machine or same network).
- Note: NGINX can run on the same host as the app (172.28.80.50) or on a different host (e.g. a front reverse-proxy server).

### Step 3: Point DNS to the NGINX host

- Create (or update) a DNS record:
  - **Name:** `sustainability` (or `sustainability.kpndomain.com` depending on your DNS provider).
  - **Type:** A (or CNAME if you use a hostname).
  - **Value:** The public IP of the host where NGINX runs.
- Wait for DNS to propagate (minutes to hours). Check with:
  ```bash
  nslookup sustainability.kpndomain.com
  ```
  or
  ```bash
  ping sustainability.kpndomain.com
  ```

### Step 4: Install NGINX (if not already installed)

On the NGINX host (Debian/Ubuntu):

```bash
sudo apt update
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl status nginx
```

---

## Phase 1: Get HTTP working (no port in URL)

### Step 5: Copy the HTTP-only config to the server

From your project machine, copy the config to the NGINX server. **On the NGINX server**, you need the file in place. Either:

- **Option A – SCP from your dev machine:**
  ```bash
  scp infra/nginx/sustainability.kpndomain.com.http-only.conf user@YOUR_NGINX_SERVER:/tmp/
  ```
  Then on the server:
  ```bash
  sudo cp /tmp/sustainability.kpndomain.com.http-only.conf /etc/nginx/sites-available/sustainability.kpndomain.com.conf
  ```

- **Option B – Create the file on the server:**
  ```bash
  sudo nano /etc/nginx/sites-available/sustainability.kpndomain.com.conf
  ```
  Paste the contents of `infra/nginx/sustainability.kpndomain.com.http-only.conf`, save and exit.

### Step 6: Enable the site

```bash
sudo ln -sf /etc/nginx/sites-available/sustainability.kpndomain.com.conf /etc/nginx/sites-enabled/
```

### Step 7: Test and reload NGINX

```bash
sudo nginx -t && sudo systemctl reload nginx
```

If `nginx -t` reports an error, fix the config before reloading.

### Step 8: Verify HTTP (no port)

- Open **http://sustainability.kpndomain.com** in a browser (do not use `:8000`).
- You should see your app. If not, check:
  - DNS (Step 3).
  - Firewall allows port 80 on the NGINX host.
  - App is running on 172.28.80.50:8000 (Step 1).

---

## Phase 2: Add HTTPS (SSL)

### Step 9: Install Certbot (Let’s Encrypt)

On the NGINX server:

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### Step 10: Temporarily allow HTTP for certificate issuance

Certbot needs to answer a challenge over HTTP. Right now the site only proxies HTTP; we will not enable the HTTPS block until we have certificates, so this step is only needed if you later use the full config with HTTP→HTTPS redirect.

For the **first time** getting a cert, use Certbot’s NGINX plugin so it can configure the server block for you:

```bash
sudo certbot --nginx -d sustainability.kpndomain.com
```

- Follow the prompts (email, agree to terms).
- Choose whether to redirect HTTP to HTTPS (you can choose “Redirect” for production).

**If you prefer to use the config file as-is** (with the HTTPS server block and your own SSL paths), then:

1. First get the cert in standalone or webroot mode **before** enabling the HTTPS server block:
   ```bash
   # Stop nginx so certbot can bind to 80
   sudo systemctl stop nginx
   sudo certbot certonly --standalone -d sustainability.kpndomain.com
   sudo systemctl start nginx
   ```
2. Then continue with Step 11 and use the full config (which already has the correct Let’s Encrypt paths).

**Simpler path:** use `certbot --nginx -d sustainability.kpndomain.com` once, then replace or merge the generated config with your production config so you keep your proxy and headers. The steps below assume you have certs at:

- `/etc/letsencrypt/live/sustainability.kpndomain.com/fullchain.pem`
- `/etc/letsencrypt/live/sustainability.kpndomain.com/privkey.pem`

### Step 11: Switch to the full config (HTTP + HTTPS + redirect)

Once certificates exist:

1. Copy the full config to the server (same way as Step 5), but use **sustainability.kpndomain.com.conf** (the one with SSL and redirect):
   ```bash
   sudo cp /path/to/sustainability.kpndomain.com.conf /etc/nginx/sites-available/sustainability.kpndomain.com.conf
   ```
   Or overwrite the existing file with the content of `infra/nginx/sustainability.kpndomain.com.conf`.

2. Ensure SSL paths in the config match your system:
   - `ssl_certificate` → `fullchain.pem`
   - `ssl_certificate_key` → `privkey.pem`  
   (The paths in the provided conf are already for Let’s Encrypt.)

### Step 12: Test and reload NGINX again

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Step 13: Verify HTTPS and redirect

1. Open **https://sustainability.kpndomain.com** — the app should load with a valid padlock.
2. Open **http://sustainability.kpndomain.com** — it should redirect to **https://sustainability.kpndomain.com**.
3. Confirm you never need to use `:8000` in the URL.

---

## Phase 3: Harden and maintain

### Step 14: Open firewall for 80 and 443 (if applicable)

If you use `ufw`:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
sudo ufw enable   # if not already enabled
```

### Step 15: Set up automatic certificate renewal

Let’s Encrypt certs expire after 90 days. Ensure the timer is active:

```bash
sudo systemctl status certbot.timer
sudo systemctl enable certbot.timer
```

Test renewal (dry run):

```bash
sudo certbot renew --dry-run
```

If you use the provided config, reload NGINX after renewals (certbot often does this via hooks):

```bash
# Optional: add a reload to certbot renewal
echo 'reload_cmd = systemctl reload nginx' | sudo tee -a /etc/letsencrypt/renewal/sustainability.kpndomain.com.conf
```

(Exact path may vary; check `sudo ls /etc/letsencrypt/renewal/`.)

---

## Checklist summary

| Step | Action |
|------|--------|
| 1 | App running on 172.28.80.50:8000, reachable from NGINX host |
| 2 | NGINX host chosen (same or different server) |
| 3 | DNS for sustainability.kpndomain.com → NGINX host IP |
| 4 | NGINX installed and enabled |
| 5 | HTTP-only config copied to `/etc/nginx/sites-available/sustainability.kpndomain.com.conf` |
| 6 | Site enabled (symlink in `sites-enabled`) |
| 7 | `nginx -t` and `systemctl reload nginx` |
| 8 | http://sustainability.kpndomain.com works without :8000 |
| 9 | Certbot installed |
| 10 | SSL certificate obtained (`certbot --nginx` or `certbot certonly`) |
| 11 | Full config (with SSL and redirect) deployed |
| 12 | `nginx -t` and reload again |
| 13 | https://sustainability.kpndomain.com works, HTTP redirects to HTTPS |
| 14 | Firewall allows 80 and 443 |
| 15 | certbot.timer enabled, `certbot renew --dry-run` OK |

---

## Troubleshooting

- **502 Bad Gateway:** App not running or not reachable at 172.28.80.50:8000 from NGINX. Check app and network.
- **Connection refused on 80/443:** Firewall or security group blocking ports; open 80 and 443.
- **Domain not resolving:** DNS not propagated or wrong record; re-check Step 3.
- **SSL certificate errors:** Paths in config must match where certbot placed the files (usually under `/etc/letsencrypt/live/sustainability.kpndomain.com/`).

After completing these steps, users can use **https://sustainability.kpndomain.com** without specifying the port.
