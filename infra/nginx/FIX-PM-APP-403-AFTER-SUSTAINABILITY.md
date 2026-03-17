# Fix: PM app returns 403 Forbidden after adding sustainability blocks

**Symptom:** After adding the sustainability.energi-up.com server blocks to nginx, the PM app (pm.energi-up.com) now returns **403 Forbidden** when you open it.

Common causes and how to fix them:

---

## 1. Wrong default_server (opening by IP or wrong Host)

If you open the PM app **by IP** (e.g. `http://147.139.176.70`) or with a Host that doesn’t match any `server_name`, nginx uses the **default server** for that port. If the **sustainability** block is now the first `listen 443` (or has `default_server`), that block is used. Some setups return 403 for “unknown” hosts.

**Fix:** Make the **PM** app the default server for ports 80 and 443 so that requests by IP or unknown Host still go to the PM app.

In `nginx-ssl.conf`, find the **PM** server block that listens on **443** (the one with `server_name pm.energi-up.com` or similar) and add **`default_server`** to the `listen` directive:

```nginx
# PM app – make this the default for 443
server {
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    server_name pm.energi-up.com localhost;
    ...
}
```

Do the same for the PM **port 80** block if you have one (e.g. the one that redirects to HTTPS):

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name pm.energi-up.com localhost;
    return 301 https://$host$request_uri;
}
```

**Do not** add `default_server` to the sustainability blocks. Only the PM blocks should be default.

Then test and reload:

```bash
docker exec project_management_frontend nginx -t && docker exec project_management_frontend nginx -s reload
```

---

## 2. Sustainability block is first and catches the request

If the **sustainability** block appears **before** the PM block in the config and the sustainability block has a very broad `server_name` (e.g. a wildcard or `_`), it might handle requests intended for the PM app.

**Fix:** Ensure only the **PM** block has `server_name pm.energi-up.com` (and `localhost` if you use it). The **sustainability** block must have only `server_name sustainability.energi-up.com;` (no wildcard, no `_`). If you use a catch‑all block, put it after the PM and sustainability blocks and do not use it for the main apps.

---

## 3. allow / deny or return 403 in config

A 403 can come from an explicit `deny all;` or `return 403;` in the PM block or in an included file.

**Check:** Search the config for 403 and deny:

```bash
grep -n "403\|deny all" /opt/Project-Management-V2.0/frontend/nginx-ssl.conf
```

If you find `deny all` or `return 403` in the PM block (or in a location that handles the PM app), remove or adjust it so the PM app is allowed. If it’s in an included file, check that file and fix or remove the rule.

---

## 4. PM server block was broken during edit

Editing the file might have accidentally removed the closing `}` of the PM block, commented out the PM block, or merged it with the sustainability block.

**Fix:** Open the config and confirm:

- The **PM** app has its own **two** top-level `server { ... }` blocks (one for 80 redirect, one for 443).
- Each block ends with a closing `}`.
- The **sustainability** blocks are **separate** and **after** the PM blocks (not inside them).

```bash
sudo nano /opt/Project-Management-V2.0/frontend/nginx-ssl.conf
```

Restore the PM blocks from a backup or from the “Correct structure” section in **FIX-SUSTAINABILITY-SHOWING-PM-APP.md** if needed.

---

## 5. Quick checks

Run on the server:

```bash
# Which server block is default on 443?
docker exec project_management_frontend nginx -T 2>/dev/null | grep -B1 "listen.*443"

# What does a request with PM host return?
curl -I -k -H "Host: pm.energi-up.com" https://127.0.0.1/

# Any 403 or deny in config?
grep -n "403\|deny" /opt/Project-Management-V2.0/frontend/nginx-ssl.conf
```

- If the **first** `listen 443` in the output is the sustainability block and has no `default_server` on the PM block, add `default_server` to the **PM** 443 (and 80) block as in section 1.
- If the curl returns 403, the problem is in nginx (server block choice or allow/deny/return 403).
- If the curl returns 200, the problem may be DNS or how you’re opening the app (e.g. by IP without a Host that matches PM).

---

## Summary

Most often the fix is: **add `default_server` to the PM app’s `listen 80` and `listen 443` directives** so that requests by IP or with an unknown Host still go to the PM app instead of another block that may return 403. Ensure the PM blocks are intact and that only the PM blocks are default.
