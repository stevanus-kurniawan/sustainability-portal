# SSL Certificate for sustainability.kpndomain.com (Docker NGINX)

Use this when the site is already working at **http://sustainability.kpndomain.com** via the **project_management_frontend** container and you want to add HTTPS.

**Paths in this guide:**
- NGINX config on host: `/opt/Project-Management-V2.0/frontend/nginx-ssl.conf`
- Frontend (webroot for certbot): `/opt/Project-Management-V2.0/frontend` → container `/usr/share/nginx/html`
- SSL assets on host: `/opt/Project-Management-V2.0/assets/ssl` → container `/etc/nginx/ssl`

---

## Step 1: Install Certbot on the host (if not already)

On the server (not inside the container):

```bash
sudo apt update
sudo apt install certbot -y
```

---

## Step 2: Allow ACME challenge in the existing HTTP server block

Let's Encrypt will request `http://sustainability.kpndomain.com/.well-known/acme-challenge/...`. NGINX must serve that path from a directory the container can read. The frontend is mounted at `/usr/share/nginx/html`, so use that as the webroot.

**2a.** Create the challenge directory on the host:

```bash
sudo mkdir -p /opt/Project-Management-V2.0/frontend/.well-known/acme-challenge
```

**2b.** Edit the NGINX config:

```bash
sudo nano /opt/Project-Management-V2.0/frontend/nginx-ssl.conf
```

Find the **sustainability.kpndomain.com** `server` block that listens on port 80 (the one you added earlier). Add this **location** **before** the `location /` block:

```nginx
    # Let's Encrypt ACME challenge (for certbot)
    location /.well-known/acme-challenge/ {
        root /usr/share/nginx/html;
        allow all;
    }
```

So the sustainability server block on port 80 looks like:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name sustainability.kpndomain.com;

    location /.well-known/acme-challenge/ {
        root /usr/share/nginx/html;
        allow all;
    }

    location / {
        proxy_pass http://172.28.80.50:8000;
        # ... rest of proxy settings ...
    }
}
```

**2c.** Reload NGINX in the container:

```bash
docker exec project_management_frontend nginx -t && docker exec project_management_frontend nginx -s reload
```

---

## Step 3: Get the SSL certificate

On the host, run certbot with **webroot** pointing at the frontend directory (certbot will write the challenge file there; the container will serve it):

```bash
sudo certbot certonly --webroot -w /opt/Project-Management-V2.0/frontend -d sustainability.kpndomain.com
```

- Use an email when asked (for expiry notices).
- Accept the terms if prompted.
- If it succeeds, certs are in: `/etc/letsencrypt/live/sustainability.kpndomain.com/`

---

## Step 4: Make the certs available inside the container

The container reads SSL from `/etc/nginx/ssl` (mounted from `/opt/Project-Management-V2.0/assets/ssl`). Create a subfolder and copy the certs there:

```bash
sudo mkdir -p /opt/Project-Management-V2.0/assets/ssl/sustainability.kpndomain.com
sudo cp /etc/letsencrypt/live/sustainability.kpndomain.com/fullchain.pem /opt/Project-Management-V2.0/assets/ssl/sustainability.kpndomain.com/
sudo cp /etc/letsencrypt/live/sustainability.kpndomain.com/privkey.pem /opt/Project-Management-V2.0/assets/ssl/sustainability.kpndomain.com/
```

Inside the container these will be at:
- `/etc/nginx/ssl/sustainability.kpndomain.com/fullchain.pem`
- `/etc/nginx/ssl/sustainability.kpndomain.com/privkey.pem`

---

## Step 5: Add the HTTPS server block and redirect HTTP → HTTPS

Edit the same config file again:

```bash
sudo nano /opt/Project-Management-V2.0/frontend/nginx-ssl.conf
```

**5a.** In the **sustainability** server block that listens on **port 80**, change the main `location /` so that (after the ACME location) it redirects to HTTPS:

```nginx
    location / {
        return 301 https://$host$request_uri;
    }
```

(Remove or replace the `proxy_pass` for `/` on port 80 so that normal HTTP traffic redirects to HTTPS.)

**5b.** Add a **new** `server` block for **port 443** (paste it after the closing `}` of the sustainability port-80 block):

```nginx
# HTTPS for sustainability.kpndomain.com
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name sustainability.kpndomain.com;

    ssl_certificate     /etc/nginx/ssl/sustainability.kpndomain.com/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/sustainability.kpndomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    location / {
        proxy_pass http://172.28.80.50:8000;
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

**5c.** Ensure the container can listen on 443. If the container is started with only `-p 80:80`, add `-p 443:443` (or in docker-compose, expose 443). Then reload NGINX:

```bash
docker exec project_management_frontend nginx -t && docker exec project_management_frontend nginx -s reload
```

---

## Step 6: Verify

1. Open **https://sustainability.kpndomain.com** — the site should load with a valid padlock.
2. Open **http://sustainability.kpndomain.com** — it should redirect to **https://sustainability.kpndomain.com**.

---

## Step 7: Renewal and copying certs (cron or certbot hook)

Let's Encrypt certs expire after 90 days. Renew on the host, then copy into the container’s SSL path again:

```bash
sudo certbot renew
sudo cp /etc/letsencrypt/live/sustainability.kpndomain.com/fullchain.pem /opt/Project-Management-V2.0/assets/ssl/sustainability.kpndomain.com/
sudo cp /etc/letsencrypt/live/sustainability.kpndomain.com/privkey.pem /opt/Project-Management-V2.0/assets/ssl/sustainability.kpndomain.com/
docker exec project_management_frontend nginx -s reload
```

You can add these copy/reload commands to a certbot renewal hook or a cron job so renewal stays automatic.

---

## Checklist

| Step | Action |
|------|--------|
| 1 | Install certbot on host |
| 2 | Create `.well-known/acme-challenge` dir; add location in nginx-ssl.conf; reload container |
| 3 | Run `certbot certonly --webroot -w /opt/.../frontend -d sustainability.kpndomain.com` |
| 4 | Copy fullchain.pem and privkey.pem to `/opt/Project-Management-V2.0/assets/ssl/sustainability.kpndomain.com/` |
| 5 | Add HTTPS server block; change HTTP block to redirect to HTTPS; ensure 443 is exposed; reload |
| 6 | Test https:// and http:// redirect |
| 7 | Set up renewal (cron/hook) and copy certs + reload after renew |
