# Internal CA: SSL for sustainability.kpndomain.com (internal only)

Use this when the site is **internal only** (no public DNS) and you cannot use Let's Encrypt. You create a private Certificate Authority (CA), sign a certificate for the domain, and configure NGINX. Users must **trust the CA** on their devices to avoid browser warnings.

---

## Overview

1. **Create a private CA** (root key + root certificate) on the server.
2. **Issue a server certificate** for `sustainability.kpndomain.com` signed by that CA.
3. **Configure NGINX** to use the server certificate and key.
4. **Distribute the CA certificate** to users so they can trust it (install in OS/browser).

All commands below run on the **host** (or a secure admin machine). Use a dedicated directory for the CA.

---

## Step 1: Create a directory for the CA and server certs

```bash
sudo mkdir -p /opt/Project-Management-V2.0/ca/private
sudo mkdir -p /opt/Project-Management-V2.0/ca/certs
sudo chmod 700 /opt/Project-Management-V2.0/ca/private
```

- `ca/private` — CA private key (keep secret).
- `ca/certs` — CA certificate and issued server certificates.

---

## Step 2: Create the root CA (one-time)

**2a. Generate the CA private key:**

```bash
sudo openssl genrsa -out /opt/Project-Management-V2.0/ca/private/ca.key 4096
sudo chmod 400 /opt/Project-Management-V2.0/ca/private/ca.key
```

**2b. Create the root CA certificate (self-signed, valid 10 years):**

```bash
sudo openssl req -x509 -new -nodes \
  -key /opt/Project-Management-V2.0/ca/private/ca.key \
  -sha256 -days 3650 \
  -out /opt/Project-Management-V2.0/ca/certs/ca.crt \
  -subj "/CN=KPN Internal Root CA/O=Your Organization/C=NL"
```

Change `O=Your Organization` and `C=NL` to your company name and country code if you like. This is the certificate users will install to trust your internal sites.

---

## Step 3: Create the server certificate for sustainability.kpndomain.com

**3a. Generate the server private key:**

```bash
sudo openssl genrsa -out /opt/Project-Management-V2.0/ca/private/sustainability.kpndomain.com.key 2048
sudo chmod 400 /opt/Project-Management-V2.0/ca/private/sustainability.kpndomain.com.key
```

**3b. Create a config file for the certificate (SAN for the domain):**

```bash
sudo tee /opt/Project-Management-V2.0/ca/sustainability.cnf << 'EOF'
[req]
default_bits       = 2048
prompt             = no
default_md         = sha256
distinguished_name = dn
req_extensions     = ext

[dn]
CN = sustainability.kpndomain.com
O  = Your Organization
C  = NL

[ext]
subjectAltName = @alt

[alt]
DNS.1 = sustainability.kpndomain.com
DNS.2 = sustainability
EOF
```

Adjust `O` and `C` if needed. Add more `DNS.N` lines if you also use other hostnames (e.g. short name, IP).

**3c. Create a Certificate Signing Request (CSR):**

```bash
sudo openssl req -new \
  -key /opt/Project-Management-V2.0/ca/private/sustainability.kpndomain.com.key \
  -out /opt/Project-Management-V2.0/ca/certs/sustainability.kpndomain.com.csr \
  -config /opt/Project-Management-V2.0/ca/sustainability.cnf
```

**3d. Sign the CSR with your CA (valid 1 year, extend with `-days 365` as needed):**

```bash
sudo openssl x509 -req -in /opt/Project-Management-V2.0/ca/certs/sustainability.kpndomain.com.csr \
  -CA /opt/Project-Management-V2.0/ca/certs/ca.crt \
  -CAkey /opt/Project-Management-V2.0/ca/private/ca.key \
  -CAcreateserial -out /opt/Project-Management-V2.0/ca/certs/sustainability.kpndomain.com.crt \
  -days 365 -sha256
```

You now have:

- **Server certificate:** `ca/certs/sustainability.kpndomain.com.crt`
- **Server private key:** `ca/private/sustainability.kpndomain.com.key`
- **CA certificate:** `ca/certs/ca.crt` (needed for chain and for clients to trust).

---

## Step 4: Prepare certs for NGINX in the container

The container reads SSL from `/opt/Project-Management-V2.0/assets/ssl` (mounted as `/etc/nginx/ssl`). Put the **server cert**, **server key**, and **CA cert** there so NGINX can serve the full chain.

**4a. Create full chain (server cert + CA cert) — NGINX often expects this:**

```bash
sudo mkdir -p /opt/Project-Management-V2.0/assets/ssl/sustainability.kpndomain.com
sudo cat /opt/Project-Management-V2.0/ca/certs/sustainability.kpndomain.com.crt \
  /opt/Project-Management-V2.0/ca/certs/ca.crt \
  | sudo tee /opt/Project-Management-V2.0/assets/ssl/sustainability.kpndomain.com/fullchain.pem
sudo cp /opt/Project-Management-V2.0/ca/private/sustainability.kpndomain.com.key \
  /opt/Project-Management-V2.0/assets/ssl/sustainability.kpndomain.com/privkey.pem
sudo chmod 644 /opt/Project-Management-V2.0/assets/ssl/sustainability.kpndomain.com/fullchain.pem
sudo chmod 600 /opt/Project-Management-V2.0/assets/ssl/sustainability.kpndomain.com/privkey.pem
```

Inside the container this will be:

- Certificate (chain): `/etc/nginx/ssl/sustainability.kpndomain.com/fullchain.pem`
- Private key: `/etc/nginx/ssl/sustainability.kpndomain.com/privkey.pem`

---

## Step 5: Configure NGINX (HTTPS server block)

Edit the NGINX config that is mounted into the container (same file you used for HTTP):

```bash
sudo nano /opt/Project-Management-V2.0/frontend/nginx-ssl.conf
```

**5a. In the sustainability server block on port 80**, you can either keep proxying to the app or redirect to HTTPS:

- To **redirect HTTP → HTTPS** (recommended once HTTPS works):
  ```nginx
  location / {
      return 301 https://$host$request_uri;
  }
  ```
  Keep the `/.well-known/acme-challenge/` location if you use it for something else; otherwise it can be removed for internal-only.

**5b. Add an HTTPS server block** (if not already present) for sustainability.kpndomain.com:

```nginx
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

**5c. Ensure the container exposes port 443** (e.g. in docker-compose: `ports: - "443:443"`). Then reload NGINX:

```bash
docker exec project_management_frontend nginx -t && docker exec project_management_frontend nginx -s reload
```

---

## Step 6: Trust the CA on client machines (important)

Until the **CA certificate** is trusted, browsers will show “Your connection is not private”, “Certificate not trusted”, or “NET::ERR_CERT_AUTHORITY_INVALID”. Installing the CA as a **trusted root** tells the OS (and most browsers) to accept any certificate signed by your internal CA.

---

### 6a. Get the CA certificate to users

- **File on server:** `/opt/Project-Management-V2.0/ca/certs/ca.crt`
- Copy it to a place users can access (e.g. internal file share, intranet, or email). Renaming to something like `KPN-Internal-Root-CA.crt` or `Sustainability-Portal-CA.crt` helps users recognize it.
- The file is in PEM format (text); Windows and macOS accept `.crt` / `.pem` for import. Do **not** distribute the CA **private** key (`ca.key`).

---

### 6b. Windows – install via Certificate Manager (GUI)

1. Copy `ca.crt` to the Windows PC (e.g. Desktop or Downloads).
2. Double-click `ca.crt`. The “Certificate” dialog opens.
3. Click **“Install Certificate…”**.
4. Choose **“Local Machine”** (all users; requires admin) or **“Current User”** (only this user; no admin). Click **Next**.
5. Select **“Place all certificates in the following store”**, click **Browse**.
6. Select **“Trusted Root Certification Authorities”**. Click **OK**, then **Next**.
7. Click **Finish**. If you chose Local Machine, confirm the UAC prompt.
8. You should see “The import was successful.” Click **OK**.

**Chrome and Edge** on Windows use this store, so they will trust the site immediately (you may need to close and reopen the browser). **Firefox** uses its own store (see 6d).

---

### 6c. Windows – install via command line (admins / scripts)

To install for **Current User** (no admin):

```cmd
certutil -user -addstore "Root" "C:\path\to\ca.crt"
```

To install for **Local Machine** (requires elevated Command Prompt or PowerShell):

```cmd
certutil -addstore "Root" "C:\path\to\ca.crt"
```

Replace `C:\path\to\ca.crt` with the actual path. Useful for login scripts or admin automation.

---

### 6d. macOS – install via Keychain Access

1. Copy `ca.crt` to the Mac (e.g. Downloads).
2. Double-click `ca.crt`. Keychain Access may open and add it to “login” keychain; if you see “Add to Keychain”, choose **“Login”** or **“System”** (System requires admin).
3. Open **Keychain Access** (Applications → Utilities, or Spotlight).
4. In the left sidebar, select **“login”** (or “System”) and the **“Certificates”** category.
5. Find the certificate (e.g. “KPN Internal Root CA”). Double-click it.
6. Expand **“Trust”**.
7. For **“When using this certificate”**, set to **“Always Trust”**.
8. Close the window; you may be asked for your password to save the trust setting.

**Safari and Chrome** on macOS use the system keychain, so they will trust the site. **Firefox** uses its own store (see 6e).

---

### 6e. Firefox – separate certificate store

Firefox does **not** use the Windows or macOS trust store by default. You must add the CA in Firefox:

1. Open Firefox. In the address bar type: `about:preferences#privacy`
2. Scroll down to **“Certificates”** and click **“View Certificates…”**.
3. Open the **“Authorities”** tab.
4. Click **“Import…”** and select your `ca.crt` file.
5. Check **“Trust this CA to identify websites.”** Click **OK**.
6. Confirm with **OK**. Restart Firefox if the site was already open.

Every user profile that uses Firefox must do this (or you deploy Firefox policy to pre-trust the CA).

---

### 6f. Chrome / Edge on Windows or macOS

- **Windows:** They use the **Windows certificate store**. Install the CA as in 6b or 6c; no separate step in Chrome/Edge.
- **macOS:** They use the **macOS keychain**. Install the CA as in 6d; no separate step in Chrome/Edge.

If the warning persists, close all browser windows and try again, or clear SSL state (e.g. Chrome: Settings → Privacy and security → Security → “Clear browsing data” → only “Cached images and files” and/or “Cookies” if needed).

---

### 6g. Scope: Current User vs Local Machine (Windows)

| Store            | Who is affected      | Admin required |
|------------------|----------------------|----------------|
| Current User     | Only that user       | No             |
| Local Machine   | All users on the PC  | Yes            |

For shared or company PCs, prefer **Local Machine** so one install covers everyone. For personal devices, **Current User** is enough.

---

### 6h. Corporate deployment (optional)

- **Windows (many PCs):** Use **Group Policy** to deploy the root CA. Copy `ca.crt` to a network share, then create a GPO that runs `certutil -addstore "Root" "\\server\share\ca.crt"` at startup or login, or use the “Computer Configuration → Policies → Windows Settings → Security Settings → Public Key Policies → Trusted Root Certification Authorities” and import the cert. Your AD/domain admin can apply this.
- **macOS / iOS:** Use **MDM** (e.g. Jamf, Intune) to install a “Configuration Profile” that adds the CA certificate to the system or user keychain and sets trust. Same idea: one push, all managed devices get the CA.
- **Firefox (enterprise):** Use **Firefox policy** (e.g. `distribution/policies.json`) to add the CA; see Mozilla’s enterprise documentation.

---

### 6i. Verify that the CA is trusted

1. Ensure **sustainability.kpndomain.com** resolves to your server (DNS or hosts file).
2. Open **https://sustainability.kpndomain.com** in the browser.
3. If the CA is trusted: the padlock is green or neutral, and clicking it shows the certificate issued by your CA with no warning.
4. If you still see a warning: confirm the CA is in the right store (Root / Trusted Root), that you set “Always Trust” on macOS, and that you imported in Firefox if using Firefox.

---

### 6j. Removing the CA (if needed)

- **Windows:** Run `certutil -delstore "Root" "KPN Internal Root CA"` (use the exact name shown in certmgr.msc) or remove it via Certificate Manager (certmgr.msc) under Trusted Root Certification Authorities.
- **macOS:** Keychain Access → find the cert → Delete. Confirm trust is removed.
- **Firefox:** Settings → Certificates → View Certificates → Authorities → select the CA → Delete or Edit to remove website trust.

Use this if you retire the internal CA or replace it with a new one.

---

After the CA is trusted, **https://sustainability.kpndomain.com** should open without certificate warnings (as long as DNS/hosts resolves the name to your server).

---

## Renewal (before the server cert expires)

The server certificate was issued for 365 days. Before it expires:

1. Create a new CSR (repeat Step 3b–3c with the same or updated config).
2. Sign again with the same CA (Step 3d), output to a new file e.g. `sustainability.kpndomain.com-new.crt`.
3. Rebuild fullchain (Step 4a) with the new cert, replace `fullchain.pem` and `privkey.pem` in `assets/ssl/sustainability.kpndomain.com/`.
4. Reload NGINX (Step 5c).

No need to re-distribute the CA certificate unless you create a new CA.

---

## Summary

| Item | Path (host) |
|------|---------------------|
| CA key | `/opt/Project-Management-V2.0/ca/private/ca.key` (keep secret) |
| CA cert | `/opt/Project-Management-V2.0/ca/certs/ca.crt` (give to users to trust) |
| Server key | `assets/ssl/sustainability.kpndomain.com/privkey.pem` |
| Server chain | `assets/ssl/sustainability.kpndomain.com/fullchain.pem` |

NGINX uses the server chain + key; clients must trust the CA cert so the browser accepts the server certificate.
