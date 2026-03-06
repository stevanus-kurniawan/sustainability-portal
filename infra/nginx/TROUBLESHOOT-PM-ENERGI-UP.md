# Troubleshoot: pm.energi-up.com HTTPS broken after adding sustainability.kpndomain.com

Both sites use the **same** NGINX config file: `/opt/Project-Management-V2.0/frontend/nginx-ssl.conf` (mounted as `/etc/nginx/conf.d/default.conf` in the container). Changes made for sustainability may have affected the existing **pm.energi-up.com** blocks.

---

## What likely went wrong

When editing one file for both sites, these are the most common causes:

1. **pm.energi-up.com server block was changed or removed**  
   (e.g. overwrote the file, or edited the wrong block and broke `server_name`, `ssl_certificate`, or braces.)

2. **SSL certificate path for pm.energi-up.com is wrong or missing**  
   (e.g. cert/key were moved, or path was changed to point at sustainability’s cert.)

3. **Syntax error in the config**  
   (missing `}`, extra `}`, or misplaced block so NGINX associates directives with the wrong server.)

4. **default_server or server order**  
   (less common when `server_name` is set correctly, but a wrong `default_server` can send traffic to the wrong block.)

---

## Step 1: Check NGINX loads the config

On the server:

```bash
docker exec project_management_frontend nginx -t
```

- If it reports **syntax error**, fix the config (often a missing or extra `}`).  
- If it says **OK**, the file is valid; the problem is likely a wrong server block or SSL path for pm.energi-up.com.

---

## Step 2: Confirm pm.energi-up.com has its own server blocks

List every server block and which hostnames they use:

```bash
docker exec project_management_frontend nginx -T 2>/dev/null | grep -E "server_name|listen.*443|ssl_certificate"
```

You should see:

- At least one block with **server_name** including **pm.energi-up.com** (or similar).
- **listen 443** and **ssl_certificate** / **ssl_certificate_key** for that block.

If there is **no** `server_name` for pm.energi-up.com, the block was removed or commented out when editing.

---

## Step 3: Inspect the config file on the host

```bash
sudo cat /opt/Project-Management-V2.0/frontend/nginx-ssl.conf
```

Check:

**a) pm.energi-up.com still has a full server block**

- One block with `server_name` including `pm.energi-up.com` (and nothing that would “steal” that host).
- For HTTPS, that block should have:
  - `listen 443 ssl ...`
  - `ssl_certificate` and `ssl_certificate_key` pointing to **pm.energi-up.com’s** cert/key (e.g. under `/etc/nginx/ssl/` or similar for pm.energi-up.com, **not** sustainability’s path).

**b) No accidental reuse of sustainability’s SSL paths for pm.energi-up.com**

- pm.energi-up.com must **not** use:
  - `ssl_certificate .../sustainability.kpndomain.com/...`
- It should use its own directory, e.g. something like:
  - `ssl_certificate     /etc/nginx/ssl/pm.energi-up.com/fullchain.pem;` (or whatever path was used before).

**c) Braces and structure**

- Each `server { ... }` must be closed with `}`.
- No extra or missing `}` that would merge two servers or break parsing.

**d) Sustainability blocks are separate**

- sustainability.kpndomain.com has its own `server { ... }` for port 80 and port 443.
- They do not replace or sit inside the pm.energi-up.com block.

---

## Step 4: Verify SSL files for pm.energi-up.com exist in the container

The container sees SSL under `/etc/nginx/ssl/` (host path `/opt/Project-Management-V2.0/assets/ssl/`). Check that pm.energi-up.com’s cert and key exist:

```bash
docker exec project_management_frontend ls -la /etc/nginx/ssl/
```

There should be a folder (or files) for **pm.energi-up.com** (or whatever path you use in `ssl_certificate` and `ssl_certificate_key`). If you only see sustainability’s folder, the pm.energi-up.com cert/key may have been moved or the path in the config is wrong.

---

## Step 5: Typical fix (restore pm.energi-up.com block)

If the pm.energi-up.com block was removed or broken:

1. Restore a correct **server** block for **pm.energi-up.com** in `/opt/Project-Management-V2.0/frontend/nginx-ssl.conf`:
   - `server_name` including `pm.energi-up.com`
   - `listen 443 ssl http2;` (and optionally `listen [::]:443 ssl http2;`)
   - `ssl_certificate` and `ssl_certificate_key` pointing to pm.energi-up.com’s cert and key (under `/etc/nginx/ssl/...` or the path that exists in the container).
   - `location /` (and any other locations) for the pm.energi-up.com app (root, proxy_pass, etc.).

2. If you have a backup or version control of `nginx-ssl.conf` from when pm.energi-up.com worked, compare and restore the pm.energi-up.com parts.

3. Reload NGINX after editing:

   ```bash
   docker exec project_management_frontend nginx -t && docker exec project_management_frontend nginx -s reload
   ```

---

## Step 6: Share the config for a precise check (optional)

If you can paste the **full** content of:

`/opt/Project-Management-V2.0/frontend/nginx-ssl.conf`

then we can point to the exact line that is wrong (e.g. missing block, wrong `server_name`, wrong `ssl_certificate`, or brace issue).  
You can redact only real secrets (e.g. internal paths are fine to leave in).

---

## Summary checklist

| Check | Command / action |
|-------|-------------------|
| Config syntax | `docker exec project_management_frontend nginx -t` |
| pm.energi-up.com in config | `docker exec project_management_frontend nginx -T \| grep -E "server_name|listen.*443|ssl_certificate"` |
| Correct SSL paths for pm | Inspect `nginx-ssl.conf`: pm.energi-up.com must not use sustainability’s cert path |
| Cert/key exist for pm | `docker exec project_management_frontend ls -la /etc/nginx/ssl/` |
| Fix and reload | Edit `nginx-ssl.conf` → `nginx -t` → `nginx -s reload` |

Most often, **pm.energi-up.com’s server block was altered or its `ssl_certificate`/`ssl_certificate_key` were changed**. Restoring that block and paths (and fixing braces if needed) and reloading NGINX usually fixes https://pm.energi-up.com/.
