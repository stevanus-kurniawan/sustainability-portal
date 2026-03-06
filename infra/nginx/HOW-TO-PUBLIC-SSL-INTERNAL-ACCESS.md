# How to Achieve: Public SSL (Trusted) + Internal-Only Access

End-to-end steps so that:
- **HTTPS is server-side** (NGINX with Let's Encrypt).
- **Everyone who can open the URL sees the site as trusted** (no CA install on devices).
- **Only the internal team can access** (firewall allows only internal IPs to 80/443).

Assumes: site already works at **http://sustainability.kpndomain.com** via the **project_management_frontend** Docker container.

---

## Phase 1: Make the domain resolvable (for the certificate)

Let's Encrypt must reach your server to verify the domain. The domain must resolve in **public DNS** to the server’s **public IP**.

**1.1 Add a public DNS record**

- **Type:** A  
- **Name:** `sustainability` (or `sustainability.kpndomain.com` as your DNS provider expects)  
- **Value:** The **public IP** of the server where the Docker container runs (the same IP users will use to reach the site)

Wait a few minutes, then check from anywhere:

```bash
nslookup sustainability.kpndomain.com
# or
dig sustainability.kpndomain.com A +short
```

You should see that public IP.

**1.2 Temporarily allow the internet to reach ports 80 and 443**

- So Let's Encrypt can complete the HTTP-01 challenge, ensure **port 80** (and 443 if you already use it) is **not** blocked from the internet yet (e.g. cloud security group, upstream firewall).  
- You will lock this down in Phase 3.

---

## Phase 2: Get the certificate and enable HTTPS (server-side)

**2.1 Install Certbot on the server**

```bash
sudo apt update
sudo apt install certbot -y
```

**2.2 Allow ACME challenge in NGINX**

Create the challenge directory:

```bash
sudo mkdir -p /opt/Project-Management-V2.0/frontend/.well-known/acme-challenge
```

Edit the NGINX config:

```bash
sudo nano /opt/Project-Management-V2.0/frontend/nginx-ssl.conf
```

In the **sustainability.kpndomain.com** server block that listens on **port 80**, add this location **before** `location /`:

```nginx
    location /.well-known/acme-challenge/ {
        root /usr/share/nginx/html;
        allow all;
    }
```

Reload NGINX in the container:

```bash
docker exec project_management_frontend nginx -t && docker exec project_management_frontend nginx -s reload
```

**2.3 Get the certificate**

```bash
sudo certbot certonly --webroot -w /opt/Project-Management-V2.0/frontend -d sustainability.kpndomain.com
```

- Enter email when asked.
- Accept terms if prompted.

On success, certs are in: `/etc/letsencrypt/live/sustainability.kpndomain.com/`

**2.4 Copy certs where the container can use them**

```bash
sudo mkdir -p /opt/Project-Management-V2.0/assets/ssl/sustainability.kpndomain.com
sudo cp /etc/letsencrypt/live/sustainability.kpndomain.com/fullchain.pem /opt/Project-Management-V2.0/assets/ssl/sustainability.kpndomain.com/
sudo cp /etc/letsencrypt/live/sustainability.kpndomain.com/privkey.pem /opt/Project-Management-V2.0/assets/ssl/sustainability.kpndomain.com/
```

**2.5 Add HTTPS server block and redirect HTTP → HTTPS**

Edit the same NGINX config:

```bash
sudo nano /opt/Project-Management-V2.0/frontend/nginx-ssl.conf
```

**a) In the sustainability port-80 block**, change the main `location /` to redirect to HTTPS (keep the `/.well-known/acme-challenge/` location for renewals):

```nginx
    location / {
        return 301 https://$host$request_uri;
    }
```

**b) Add a new server block** for port 443 (paste after the closing `}` of the sustainability port-80 block):

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

**c) Ensure the container exposes port 443.** If using docker-compose, add to the project_management_frontend service:

```yaml
ports:
  - "80:80"
  - "443:443"
```

Restart the container if you added 443, then reload NGINX:

```bash
docker exec project_management_frontend nginx -t && docker exec project_management_frontend nginx -s reload
```

**2.6 Verify**

- Open **https://sustainability.kpndomain.com** — you should see the padlock (trusted).
- Open **http://sustainability.kpndomain.com** — it should redirect to HTTPS.

---

## Phase 3: Restrict access so only the internal team can reach the site

Now lock down so only your internal IP ranges (or VPN) can reach ports 80 and 443. Everyone else is blocked.

**3.1 Decide which IP ranges to allow**

Examples:

- Office LAN: e.g. `192.168.1.0/24` or `10.0.0.0/8`
- VPN pool: e.g. `10.8.0.0/24`
- Specific IPs: one rule per IP if the team is small

Replace the examples below with **your** internal ranges.

**3.2 Option A — Firewall on the server (ufw)**

If the server is directly reachable from the internet and you use **ufw**:

```bash
# Allow SSH so you don’t lock yourself out (adjust port if needed)
sudo ufw allow 22/tcp

# Allow 80 and 443 only from your internal range(s)
sudo ufw allow from 192.168.0.0/16 to any port 80
sudo ufw allow from 192.168.0.0/16 to any port 443
sudo ufw allow from 10.0.0.0/8 to any port 80
sudo ufw allow from 10.0.0.0/8 to any port 443
# Add more ranges if needed, e.g. VPN: sudo ufw allow from 10.8.0.0/24 to any port 80

# Enable firewall (default deny)
sudo ufw enable
sudo ufw status
```

Result: only traffic from those ranges can hit 80/443; the rest of the internet gets refused. Internal team (on office/VPN) sees the site as trusted; others cannot reach it.

**3.3 Option B — Firewall on the server (iptables)**

If you use **iptables** instead of ufw:

```bash
# Allow established and related
sudo iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
# Allow SSH (adjust if needed)
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
# Allow 80 and 443 only from internal ranges
sudo iptables -A INPUT -p tcp -s 192.168.0.0/16 --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp -s 192.168.0.0/16 --dport 443 -j ACCEPT
sudo iptables -A INPUT -p tcp -s 10.0.0.0/8 --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp -s 10.0.0.0/8 --dport 443 -j ACCEPT
# Default deny
sudo iptables -A INPUT -j DROP
```

Make the rules persistent (e.g. `iptables-save` and restore on boot) according to your OS.

**3.4 Option C — Restrict at the edge (router / load balancer / cloud)**

If the server sits behind a **router**, **load balancer**, or **cloud security group**, configure the same idea there:

- Allow **80** and **443** only from your **internal/VPN** IP ranges.
- Deny everything else.

Then you may leave the server firewall more open or use it as a second layer.

---

## Phase 4: Certificate renewal (optional automation)

Let's Encrypt certs expire after 90 days. Renew on the host, then copy into the container’s SSL path and reload NGINX:

```bash
sudo certbot renew
sudo cp /etc/letsencrypt/live/sustainability.kpndomain.com/fullchain.pem /opt/Project-Management-V2.0/assets/ssl/sustainability.kpndomain.com/
sudo cp /etc/letsencrypt/live/sustainability.kpndomain.com/privkey.pem /opt/Project-Management-V2.0/assets/ssl/sustainability.kpndomain.com/
docker exec project_management_frontend nginx -s reload
```

You can run this from cron (e.g. monthly) or use a certbot renewal hook script.

**Note:** Renewal uses HTTP-01. Your firewall must still allow **Let's Encrypt’s IPs** to reach **port 80** from the internet, or use a **DNS challenge** (e.g. `certbot certonly --dns-...`) so no inbound 80 is needed. If you lock 80 to internal-only, either temporarily open 80 for renewal or switch to DNS challenge.

---

## Checklist

| Phase | Step |
|-------|------|
| 1 | Add public A record for sustainability.kpndomain.com → server public IP; ensure 80/443 reachable for cert issuance |
| 2.1 | Install certbot |
| 2.2 | Add `/.well-known/acme-challenge/` location; reload NGINX in container |
| 2.3 | Run `certbot certonly --webroot -w /opt/.../frontend -d sustainability.kpndomain.com` |
| 2.4 | Copy fullchain.pem and privkey.pem to `/opt/.../assets/ssl/sustainability.kpndomain.com/` |
| 2.5 | Add HTTPS server block; redirect HTTP→HTTPS; expose 443 on container; reload NGINX |
| 2.6 | Test https:// and http→https redirect |
| 3 | Restrict 80/443 to internal IP ranges (ufw, iptables, or edge firewall) |
| 4 | Set up cert renewal (cron/hook) and optionally plan for DNS challenge if 80 is locked to internal-only |

After this: **SSL is server-side, the site is trusted for everyone who can access it, and only the internal team can access it** (via firewall/VPN).
