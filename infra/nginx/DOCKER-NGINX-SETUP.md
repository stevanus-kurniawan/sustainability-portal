# Step-by-Step: Add sustainability.kpndomain.com to Docker NGINX (Port 80)

Use this when **port 80 is already used by a Docker container** running NGINX (the "other project"). You will add the sustainability server block to that same NGINX so it serves both sites by hostname.

---

## Step 1: Find the container that is using port 80

On the server, run:

```bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}"
```

Look for a row where **Ports** contains `0.0.0.0:80->` or `80/tcp`. Note the **container name** in the first column (e.g. `nginx`, `proxy`, `web`).

Example:
```
NAMES       IMAGE    PORTS
nginx-proxy nginx    0.0.0.0:80->80/tcp
```

Container name here is **nginx-proxy**. Use yours in the next steps.

---

## Step 2: Find where the container’s NGINX config is on the host

### Why this matters

The NGINX process runs **inside** the container. Its config files live in paths like `/etc/nginx/conf.d/` **inside the container**. You cannot edit those paths directly from the host unless the container has **mounted** a host folder into that path. A **mount** means: “this folder inside the container is actually this folder on the host.” So when you edit files on the host in that folder, the container sees the changes immediately.

You need to find: **which folder on your server (host) is mounted into the container’s NGINX config directory.** That host folder is where you will create `sustainability.kpndomain.com.conf`.

---

### What Docker “mounts” are (Source vs Destination)

When you run a container, you can bind a **host directory** to a **directory inside the container**:

| Term | Meaning | Where it lives |
|------|--------|----------------|
| **Source** | The path on the **host** (your server’s filesystem). | e.g. `/opt/myproject/nginx/conf.d` |
| **Destination** | The path **inside the container** where NGINX runs. | e.g. `/etc/nginx/conf.d` |

So: **Source → Destination** means “the host folder **Source** is visible inside the container at **Destination**.”

- You will **create and edit files** on the **host** using the **Source** path.
- NGINX **inside the container** reads those same files via the **Destination** path (e.g. `/etc/nginx/conf.d`). It doesn’t know about “host”; it only sees its own filesystem.

---

### Run the inspect command

Replace `CONTAINER_NAME` with the name from Step 1:

```bash
docker inspect CONTAINER_NAME --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{"\n"}}{{end}}'
```

You’ll get one line per mount, in the form:

```
Source -> Destination
```

Example output:

```
/opt/other-project/nginx/conf.d -> /etc/nginx/conf.d
/opt/other-project/nginx/ssl -> /etc/nginx/ssl
/var/log/nginx -> /var/log/nginx
```

---

### Which line to use

Look for a line whose **Destination** (the path after `->`) is one of:

- `/etc/nginx/conf.d` — very common; config snippets go here.
- `/etc/nginx/sites-enabled` — Debian/Ubuntu-style; enabled site configs go here.
- `/etc/nginx` — whole NGINX dir; config may be in a subfolder like `conf.d` or `sites-enabled` inside it.
- `/etc/nginx/sites-available` — less common for mounts; usually only `sites-enabled` or `conf.d` is mounted.

**Use the line where Destination is the directory that holds the NGINX server block config files** (the ones that define `server { ... }`).

---

### The path where you add the new config

The **Source** (the path before `->`) on that line is the **host path** where you will add your new file.

- From the example above, if you see:
  ```text
  /opt/other-project/nginx/conf.d -> /etc/nginx/conf.d
  ```
  then you will create the file at:
  ```text
  /opt/other-project/nginx/conf.d/sustainability.kpndomain.com.conf
  ```
  on the **host**. NGINX inside the container will see it as:
  ```text
  /etc/nginx/conf.d/sustainability.kpndomain.com.conf
  ```

- If you see:
  ```text
  /home/user/proxy/sites-enabled -> /etc/nginx/sites-enabled
  ```
  then create the file at:
  ```text
  /home/user/proxy/sites-enabled/sustainability.kpndomain.com.conf
  ```
  on the host.

**Summary:** Pick the mount whose **Destination** is the NGINX config directory; the **Source** of that mount is the host path where you create `sustainability.kpndomain.com.conf`.

---

## Step 3: Confirm the config directory on the host

```bash
ls -la /path/from/step2
```

Replace `/path/from/step2` with the **Source** path from Step 2. You should see existing `.conf` files. Your new file will go in this directory (or in a `sites-enabled`-style directory if that’s what’s mounted).

---

## Step 4: Choose the correct upstream for the app (port 8000)

Your app runs on **port 8000**. From inside the NGINX container, it must be able to reach that app.

- **App on the same host (not in Docker):**  
  Use the host IP as seen from Docker. Common options:
  - Linux: `host.docker.internal` (if available) or the host’s gateway, e.g. `172.17.0.1`.
  - Or the server’s real IP, e.g. `172.28.80.50`, if the container can reach it.

- **App in another Docker container (same compose/network):**  
  Use the **service name** and internal port, e.g. `http://sustainability-app:8000`.

If you’re not sure, try keeping `172.28.80.50:8000`; if the container can reach that IP, it will work. If you get 502, switch to the host gateway or the other container’s service name.

---

## Step 5: Create the sustainability config file on the host

Create a new file in the **host** config directory from Step 2. Name it e.g. `sustainability.kpndomain.com.conf`.

Replace `/path/from/step2` with your actual path:

```bash
sudo nano /path/from/step2/sustainability.kpndomain.com.conf
```

Paste the following. If you need a different upstream (see Step 4), change the `proxy_pass` line.

```nginx
# sustainability.kpndomain.com -> app on port 8000
server {
    listen 80;
    listen [::]:80;
    server_name sustainability.kpndomain.com;

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

Save and exit (in nano: Ctrl+O, Enter, Ctrl+X).

**If your mount is `/etc/nginx/sites-enabled`:** some setups expect configs in `sites-available` and a symlink in `sites-enabled`. If the other project only has files in one folder (e.g. `conf.d`), putting the file in that same folder is enough.

---

## Step 6: Test and reload NGINX inside the container

Replace `CONTAINER_NAME` with the name from Step 1:

```bash
docker exec CONTAINER_NAME nginx -t
```

You should see:
```
nginx: the configuration file ... syntax is ok
nginx: configuration file ... test is successful
```

If you see **syntax error** or **open() failed**, fix the path or the config (e.g. wrong mount or typo in the new file). Then:

```bash
docker exec CONTAINER_NAME nginx -s reload
```

No output usually means reload succeeded.

---

## Step 7: Verify in the browser

1. Open **http://sustainability.kpndomain.com** (no `:8000`).
2. You should see your sustainability app (the one that runs on 8000).
3. Open the other project’s URL; it should still work as before.

If you get **502 Bad Gateway**, the container cannot reach the app. Go back to Step 4 and adjust `proxy_pass` (host IP, `host.docker.internal`, or service name).

---

## Step 8: (Optional) Persist the config in the project

So the config is not only on the server, copy it into your repo. You already have `infra/nginx/sustainability.kpndomain.com.http-only.conf`. For Docker, the snippet above is the same; the only difference may be the `proxy_pass` value (e.g. `http://host.docker.internal:8000` or `http://sustainability-app:8000`). You can add a copy named e.g. `sustainability.kpndomain.com.docker.conf` with a comment about which upstream to use in Docker.

---

## Checklist

| Step | Action |
|------|--------|
| 1 | `docker ps` → note container name with `0.0.0.0:80` |
| 2 | `docker inspect CONTAINER_NAME` → note host path (Mounts Source) for nginx config |
| 3 | `ls` that path on the host |
| 4 | Decide upstream: `172.28.80.50:8000` or host gateway or Docker service name |
| 5 | Create `sustainability.kpndomain.com.conf` in that path with the server block |
| 6 | `docker exec CONTAINER_NAME nginx -t` then `nginx -s reload` |
| 7 | Test http://sustainability.kpndomain.com and the other site |

---

## Troubleshooting

- **502 Bad Gateway:** Container cannot reach the app. Change `proxy_pass` to the host gateway (e.g. `http://172.17.0.1:8000`), `http://host.docker.internal:8000`, or the other container’s service name and port.
- **Still see the other project:** Reload may not have run; run `docker exec CONTAINER_NAME nginx -s reload`. Ensure `server_name sustainability.kpndomain.com;` is correct and the file is in the directory that NGINX includes.
- **Syntax error:** Check the new file for typos and that you didn’t break an existing config; run `nginx -t` inside the container again after edits.
