# Troubleshoot: http://sustainability.energi-up.com not opening

Run these checks **on the server** (where the project_management_frontend container runs) to find why the site doesn’t open.

---

## 1. Confirm NGINX config is valid and loaded

```bash
docker exec project_management_frontend nginx -t
```

- If you see **syntax error**, fix the reported line in `nginx-ssl.conf` (often a missing `}` or typo).
- If you see **test is successful**, the config file is valid.

Check that the sustainability.energi-up.com block is in the running config:

```bash
docker exec project_management_frontend nginx -T 2>/dev/null | grep -E "server_name sustainability.energi-up|proxy_pass.*147.139.176.70"
```

You should see:
- `server_name sustainability.energi-up.com`
- `proxy_pass http://147.139.176.70:8000`

If either is missing, the block wasn’t added correctly or wasn’t reloaded.

---

## 2. Check DNS (from the machine you use to open the site)

**On the server:**
```bash
nslookup sustainability.energi-up.com
# or
dig sustainability.energi-up.com A +short
```

**On your PC (or the device where you open the URL):**
- Same commands, or use https://dnschecker.org and search for `sustainability.energi-up.com`.

The result should be the **IP of the server** where the Docker container runs (the one that listens on port 80). If you get “not found” or a different IP, DNS is wrong or not set for the machine you’re using.

---

## 3. Check port 80 is open and the container is listening

On the server:

```bash
sudo ss -tlnp | grep :80
```

You should see **docker-proxy** (or nginx) listening on `0.0.0.0:80`. If nothing is on 80, the container may not be running or not publishing port 80.

```bash
docker ps --format "table {{.Names}}\t{{.Ports}}" | grep 80
```

Confirm **project_management_frontend** has `80/tcp` or `0.0.0.0:80->80/tcp`.

---

## 4. Test from the server (bypass DNS)

From the server, request the site using the **Host** header so NGINX picks the right server block:

```bash
curl -I -H "Host: sustainability.energi-up.com" http://127.0.0.1/
```

- If you get **HTTP/1.1 200** (or 301, 302), NGINX is routing correctly; the problem is likely **DNS** or **network** between your PC and the server.
- If you get **502 Bad Gateway**, NGINX is correct but cannot reach **147.139.176.70:8000** (firewall, app down, or wrong IP).
- If you get **404** or another response from a different site, the request may be hitting another server block (e.g. default server).

---

## 5. Test backend (147.139.176.70:8000) from the container

From the host:

```bash
docker exec project_management_frontend curl -I --connect-timeout 5 http://147.139.176.70:8000/
```

- If this **fails** (timeout, connection refused), the container cannot reach the app. Fix network/firewall or the app on 147.139.176.70:8000.
- If this **succeeds**, the backend is reachable; the issue is likely DNS or which server block is used.

---

## 6. Check for default_server (other site catching the request)

List which server block is default on port 80:

```bash
docker exec project_management_frontend nginx -T 2>/dev/null | grep -B1 "listen.*80"
```

If another block has `listen 80 default_server` and your sustainability block does not, then requests that don’t match any `server_name` (e.g. by IP or wrong Host) go to that default. Ensure you open **http://sustainability.energi-up.com** (so the Host header is `sustainability.energi-up.com`). If you open `http://<server-ip>`, the default server will answer unless you add `Host: sustainability.energi-up.com`.

---

## 7. Quick checklist

| Check | Command / action |
|-------|-------------------|
| Config valid | `docker exec project_management_frontend nginx -t` |
| Block present | `docker exec project_management_frontend nginx -T \| grep sustainability.energi-up` |
| DNS from your PC | `nslookup sustainability.energi-up.com` → server IP |
| Port 80 listening | `ss -tlnp \| grep :80` |
| NGINX responds with correct Host | `curl -I -H "Host: sustainability.energi-up.com" http://127.0.0.1/` |
| Backend reachable from container | `docker exec project_management_frontend curl -I http://147.139.176.70:8000/` |

---

## Common fixes

- **DNS:** Add or fix an A (or CNAME) record for **sustainability.energi-up.com** to the server’s IP. Wait a few minutes and test again from the same PC.
- **Wrong server block:** Ensure the **sustainability.energi-up.com** block is in `/opt/Project-Management-V2.0/frontend/nginx-ssl.conf`, then run `docker exec project_management_frontend nginx -t && docker exec project_management_frontend nginx -s reload`.
- **502:** Open **147.139.176.70:8000** from the container (curl above). If it fails, fix app/network/firewall on 147.139.176.70.
- **Firewall:** On the server or in front of it, allow TCP **80** (and 443 if you add HTTPS later) from the networks that need to reach the site.

Run the commands in sections 1–5 and share the outputs (and whether you open the URL by name or by IP); that will pinpoint why http://sustainability.energi-up.com doesn’t open.
