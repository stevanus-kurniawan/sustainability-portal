# Fix: Firefox shows sustainability app, Chrome incognito shows PM app

**Symptom:** In Firefox the site goes to the sustainability app; in Chrome incognito it still goes to the PM app (intermittent by browser).

**Cause: HTTP vs HTTPS.** The sustainability app is only configured on **port 80 (HTTP)**. On **port 443 (HTTPS)** there is no server block for `sustainability.energi-up.com`, so NGINX uses the **default server** for 443 → the PM app.

- **Firefox** may be using **HTTP** (or a cached HTTP response) → port 80 → sustainability block → correct app.
- **Chrome incognito** often tries **HTTPS first** or upgrades to HTTPS → port 443 → default server (PM) → wrong app.

**Check:** In Chrome incognito, look at the URL bar after the page loads. If it shows **https://**sustainability.energi-up.com, that confirms port 443 is serving the PM app.

---

## Fix: Add an HTTPS (443) block for sustainability.energi-up.com

You need a **second** server block that listens on **443** with `server_name sustainability.energi-up.com` and the same `proxy_pass` as your HTTP block (e.g. `http://172.28.80.50:8000`). That block also needs SSL certificate paths.

### 1. Edit nginx-ssl.conf

```bash
sudo nano /opt/Project-Management-V2.0/frontend/nginx-ssl.conf
```

### 2. Find the real certificate paths (do not use literal `/path/to/...`)

The paths must point to real files. Use the **same paths as the PM app's 443 block** if you have a wildcard cert (e.g. `*.energi-up.com`). On the server, run:

```bash
grep -E "ssl_certificate|ssl_certificate_key" /opt/Project-Management-V2.0/frontend/nginx-ssl.conf
```

Copy the two paths that appear (e.g. `/etc/letsencrypt/live/.../fullchain.pem` and `.../privkey.pem`). Use those exact paths in the sustainability HTTPS block below.

### 3. Add this block after the existing sustainability HTTP block

Use the same backend as your HTTP block (e.g. `172.28.80.50:8000`). **Replace the cert paths** with the paths you found above (or your actual cert paths). Do **not** leave `/path/to/fullchain.pem` — nginx will fail with "No such file or directory".

```nginx
# HTTPS for sustainability.energi-up.com (so Chrome/HTTPS users get the right app)
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name sustainability.energi-up.com;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;   # use real path from grep above
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;      # use real path from grep above

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

### 4. Test and reload

```bash
docker exec project_management_frontend nginx -t && docker exec project_management_frontend nginx -s reload
```

After that, both **http://** and **https://**sustainability.energi-up.com will go to the sustainability app, so Chrome incognito (and any browser using HTTPS) will show the correct app.

---

## Certificate options

- **Wildcard cert for `*.energi-up.com`:** If the PM app already uses a cert that covers `*.energi-up.com`, use the same `ssl_certificate` and `ssl_certificate_key` paths as the PM 443 block (so both PM and sustainability use that cert).
- **Separate cert for sustainability.energi-up.com:** Use certbot or your CA to issue a cert for `sustainability.energi-up.com` and point the paths to that cert.

---

## Temporary workaround (no SSL change)

Have users open **http://**sustainability.energi-up.com explicitly (type `http://` in the URL bar). That forces port 80 and the correct block. Not ideal long term; adding the HTTPS block above is the proper fix.
