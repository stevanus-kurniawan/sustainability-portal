# DevOps: Domain Wrong Port + Public IP Not Accessible

Two issues after switching domain and moving from private to public IP:

1. **http://sustainability.energi-up.com** opens the wrong app/port — the sustainability app should be served on port **8000** (via proxy from port 80).
2. **http://172.28.80.50:8000/** works (private IP) but **http://147.139.176.70:8000/** does not (public IP).

---

## Issue 1: Domain Opening Wrong Port (Wrong App)

**Expected:** `http://sustainability.energi-up.com` → NGINX on port 80 → proxy to app on **:8000**.

**What’s wrong:** The request is handled by another server block (e.g. PM app on port 80), so you see the wrong app.

### Fix (NGINX in project_management_frontend)

1. **Separate server block**  
   Ensure there is a **top-level** `server { ... }` block **only** for `sustainability.energi-up.com` (not inside the PM app block).  
   See **[FIX-SUSTAINABILITY-SHOWING-PM-APP.md](./FIX-SUSTAINABILITY-SHOWING-PM-APP.md)** for the exact structure.

2. **Correct proxy target**  
   In that block you must have:
   - `server_name sustainability.energi-up.com;`
   - `proxy_pass http://<backend>:8000;`  
   If NGINX and the sustainability app run on the **same host**, use **127.0.0.1** or **172.28.80.50** so you don’t depend on the public IP:
   - `proxy_pass http://127.0.0.1:8000;`  
   or  
   - `proxy_pass http://172.28.80.50:8000;`

3. **Reload NGINX**
   ```bash
   docker exec project_management_frontend nginx -t && docker exec project_management_frontend nginx -s reload
   ```

4. **Optional: serve app on port 8000 for the domain**  
   If you want `http://sustainability.energi-up.com:8000` to work as well, add a second server block that `listen 8000` and `proxy_pass` to the same backend. The repo’s `sustainability.energi-up.com.http-only.conf` can be extended with that block (see comments in the conf).

---

## Issue 2: Public IP 147.139.176.70:8000 Not Accessible

**Observed:**  
- `http://172.28.80.50:8000/` ✅ works  
- `http://147.139.176.70:8000/` ❌ does not

So the app is listening and reachable on the **private** interface; the problem is reaching it via the **public** IP.

### A. App must listen on all interfaces (0.0.0.0)

The app (e.g. Docker `ports: "8000:3000"`) should bind to **0.0.0.0** on the host so it accepts connections on any IP (private and public).

- **Docker:** `ports: "8000:3000"` already binds host port 8000 on `0.0.0.0`. No change needed unless you overrode it (e.g. `"127.0.0.1:8000:3000"`). If you did, change to `"8000:3000"`.
- **Node/Next.js:** Inside the container it listens on `0.0.0.0` by default when using `PORT=3000`. No change needed.

**Check on the host where the app runs (e.g. 172.28.80.50):**
```bash
sudo ss -tlnp | grep 8000
# or
sudo netstat -tlnp | grep 8000
```
You should see `0.0.0.0:8000` (or `*:8000`). If you see `127.0.0.1:8000` or `172.28.80.50:8000` only, the app or port mapping is bound to a single interface; fix the binding to use `0.0.0.0`.

---

### B. Host firewall (Linux)

Open port **8000** on the **public** interface (or on all interfaces).

**ufw (Ubuntu/Debian):**
```bash
sudo ufw allow 8000/tcp
sudo ufw status
sudo ufw reload
```

**firewalld (RHEL/CentOS):**
```bash
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --reload
```

**iptables:** Ensure there is no rule dropping INPUT for port 8000 on the public interface.

---

### C. Cloud / network firewall (security group, NACL, etc.)

If **147.139.176.70** is in a cloud (AWS, GCP, Azure, etc.) or behind a corporate firewall:

1. **Security group / NACL**  
   Allow **inbound** TCP **8000** from the IPs or ranges that need access (e.g. 0.0.0.0/0 for “any”, or your office/VPN).

2. **Same for port 80** if users hit the domain and NGINX runs on this host.

---

### D. NAT / port forwarding (public IP on router, app on private IP)

If **147.139.176.70** is the **router/firewall** and the app actually runs on **172.28.80.50**:

1. On the router/firewall, add **port forwarding**:  
   **External:** 147.139.176.70:8000 → **Internal:** 172.28.80.50:8000 (TCP).

2. If the firewall also does **DNAT**, ensure it forwards to 172.28.80.50:8000.

3. Test from **outside** the network (e.g. mobile without WiFi, or another network):  
   `http://147.139.176.70:8000/`.

---

### E. Same host: avoid public IP in NGINX

If NGINX (e.g. in **project_management_frontend**) runs on the **same** host as the sustainability app (172.28.80.50 / 147.139.176.70), then:

- In the sustainability server block, set:
  - `proxy_pass http://127.0.0.1:8000;`  
  or  
  - `proxy_pass http://172.28.80.50:8000;`
- Do **not** use `http://147.139.176.70:8000` there, so the proxy does not depend on the public IP being reachable from the same machine.

Then:

- **Domain:** `http://sustainability.energi-up.com` → NGINX (port 80) → 127.0.0.1:8000 ✅  
- **Direct public IP:** Still need to fix firewall/NAT above if you want `http://147.139.176.70:8000/` to work from the internet.

---

## Checklist

| Item | Action |
|------|--------|
| Domain shows wrong app | Separate `server { }` for `sustainability.energi-up.com`, `proxy_pass` to `:8000` (or 127.0.0.1:8000 if same host). Reload NGINX. |
| Same host | Use `proxy_pass http://127.0.0.1:8000;` (or 172.28.80.50) in that block. |
| App binding | Host port 8000 must be `0.0.0.0:8000`, not only 127.0.0.1 or 172.28.80.50. |
| Host firewall | Allow TCP 8000 (and 80 if NGINX is there). |
| Cloud/network FW | Allow inbound TCP 8000 (and 80) from needed sources. |
| NAT | If 147.139.176.70 is router, forward 8000 → 172.28.80.50:8000. |

After these, **http://sustainability.energi-up.com** should show the app on port 8000, and **http://147.139.176.70:8000/** should work if firewall/NAT are fixed.
