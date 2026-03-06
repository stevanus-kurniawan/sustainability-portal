# Self-Signed SSL for sustainability.kpndomain.com

Use this to enable **HTTPS** for sustainability.kpndomain.com with a **self-signed certificate**. The connection is encrypted, but browsers will show a warning (“Your connection is not private”) unless users install or trust the certificate. No Let’s Encrypt or internal CA needed.

**Assumptions:** NGINX runs in the **project_management_frontend** container; SSL files are on the host at `/opt/Project-Management-V2.0/assets/ssl/` (mounted as `/etc/nginx/ssl/` in the container).

---

## Step 1: Create a directory for the certificate on the host

```bash
sudo mkdir -p /opt/Project-Management-V2.0/assets/ssl/sustainability.kpndomain.com
```

---

## Step 2: Generate a self-signed certificate and key

Run on the **host** (not inside the container). This creates a cert valid for 365 days; change `-days` if needed.

```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /opt/Project-Management-V2.0/assets/ssl/sustainability.kpndomain.com/privkey.pem \
  -out /opt/Project-Management-V2.0/assets/ssl/sustainability.kpndomain.com/fullchain.pem \
  -subj "/CN=sustainability.kpndomain.com/O=Your Organization/C=NL"
```

- **CN** (Common Name) should be the domain: `sustainability.kpndomain.com`.
- Adjust **O** (Organization) and **C** (Country) as needed.
- For modern browsers, you can add **Subject Alternative Name (SAN)** so the cert matches the hostname. Use the variant in Step 2b below if you want that.

**Optional (recommended):** Add SAN so the certificate explicitly lists the domain and avoids some browser warnings:

**2b. Generate with SAN (Subject Alternative Name)**

Create a small config file:

```bash
sudo tee /opt/Project-Management-V2.0/assets/ssl/sustainability.kpndomain.com/openssl.cnf << 'EOF'
[req]
default_bits       = 2048
prompt             = no
default_md         = sha256
distinguished_name = dn
req_extensions     = ext
x509_extensions    = ext

[dn]
CN = sustainability.kpndomain.com
O  = Your Organization
C  = NL

[ext]
subjectAltName = DNS:sustainability.kpndomain.com,DNS:sustainability
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
EOF
```

Then generate the cert and key:

```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /opt/Project-Management-V2.0/assets/ssl/sustainability.kpndomain.com/privkey.pem \
  -out /opt/Project-Management-V2.0/assets/ssl/sustainability.kpndomain.com/fullchain.pem \
  -config /opt/Project-Management-V2.0/assets/ssl/sustainability.kpndomain.com/openssl.cnf
```

Set permissions:

```bash
sudo chmod 644 /opt/Project-Management-V2.0/assets/ssl/sustainability.kpndomain.com/fullchain.pem
sudo chmod 600 /opt/Project-Management-V2.0/assets/ssl/sustainability.kpndomain.com/privkey.pem
```

---

## Step 3: Add the HTTPS server block in NGINX

Edit the shared config file:

```bash
sudo nano /opt/Project-Management-V2.0/frontend/nginx-ssl.conf
```

**Add** this **after** the existing sustainability **HTTP** server block (after its closing `}`), and **do not** put any of these directives inside the pm.energi-up.com block:

```nginx
# HTTPS for sustainability.kpndomain.com (self-signed)
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
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

Save and exit.

---

## Step 4: (Optional) Redirect HTTP to HTTPS for sustainability

If you want **http://sustainability.kpndomain.com** to redirect to **https://**, change the sustainability **port 80** block so the main `location /` is a redirect instead of `proxy_pass`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name sustainability.kpndomain.com;

    location / {
        return 301 https://$host$request_uri;
    }
}
```

If you prefer to keep HTTP working without redirect, leave the existing `proxy_pass` block as is.

---

## Step 5: Test and reload NGINX

```bash
docker exec project_management_frontend nginx -t && docker exec project_management_frontend nginx -s reload
```

---

## Step 6: Verify

- Open **https://sustainability.kpndomain.com**. The connection is encrypted.
- The browser will show a warning (e.g. “Your connection is not private”) because the cert is self-signed. You can click “Advanced” → “Proceed to sustainability.kpndomain.com” to continue.
- To avoid the warning on company devices, you would need to either distribute the self-signed cert as a trusted root (not recommended for self-signed) or use an internal CA and deploy it via GPO/MDM (see `INTERNAL-CA-SSL.md` and `DEPLOY-CA-VIA-GPO-MDM.md`).

---

## Renewal

Self-signed certs expire (e.g. after 365 days). Before expiry, regenerate with the same commands in Step 2 (or 2b), then reload NGINX:

```bash
docker exec project_management_frontend nginx -s reload
```

---

## Summary

| Item | Path (host) |
|------|-----------------------------|
| Certificate | `/opt/Project-Management-V2.0/assets/ssl/sustainability.kpndomain.com/fullchain.pem` |
| Private key | `/opt/Project-Management-V2.0/assets/ssl/sustainability.kpndomain.com/privkey.pem` |

NGINX uses these via the container path `/etc/nginx/ssl/sustainability.kpndomain.com/`. SSL is implemented on the server; browsers will warn until the user accepts the self-signed cert or you use an internal CA and deploy it.
