# SSL on the Server, Trusted for Everyone Who Can Access — Internal-Only Access

**Goal:**
1. **SSL is server-side** — HTTPS runs on the server (NGINX); no certificate install on user devices.
2. **Everyone who can open the URL sees the site as trusted** — no browser warnings (green padlock).
3. **Only the internal team can access the domain** — not the whole internet.

---

## The Constraint

- Browsers only show **“trusted”** (no warning) when the certificate is signed by a CA they already trust.
- By default, browsers trust **public CAs** (e.g. Let’s Encrypt). They do **not** trust your own internal CA unless you install it on each device (or push it via GPO/MDM).
- So: **“trusted for everyone who can access”** without touching devices → you need a **publicly trusted certificate** (e.g. Let’s Encrypt).
- Let’s Encrypt requires the **domain to be publicly resolvable** (so they can verify you control it). That does **not** mean the server must be open to the internet: you can still **restrict access by network** (firewall, VPN, etc.) so only the internal team can reach it.

---

## Recommended Approach: Public Certificate + Network Restriction

Use a **publicly trusted certificate** (e.g. Let’s Encrypt) so the site is **trusted in every browser**, and use **firewall/network** so **only the internal network** (or VPN) can reach the server.

| What | How |
|------|-----|
| **SSL on the server** | NGINX serves HTTPS with a certificate (unchanged). |
| **Trusted for everyone who can access** | Certificate from Let’s Encrypt (or another public CA) → no CA install on devices. |
| **Only internal team can access** | Firewall / network: allow only internal IP ranges (or VPN) to ports 80/443. Rest of the internet cannot reach the server. |

So: **SSL is built and runs on the server; only people who can reach the URL (internal team) can open it, and they all see it as trusted.**

---

## Step 1: Make the Domain Publicly Resolvable (for certificate issuance only)

To get a certificate from Let’s Encrypt, the domain must resolve in **public DNS**:

- Add a **public A record**: `sustainability.kpndomain.com` → **public IP** of the server (or the edge device that will terminate HTTPS and forward to your app).
- This is only so Let’s Encrypt can validate the domain. It does **not** require the server to be open to the world (Step 2 locks that down).

If your DNS is fully internal and you cannot add a public record, you’d need either:
- A **split-horizon** setup where the same name exists in public DNS only for issuance, or  
- **DNS challenge** with a provider that supports API (e.g. Cloudflare, Route53) so Certbot can create a TXT record.  
Otherwise, the only way to get “trusted by default” is to have the domain resolvable in public DNS at least for the moment of issuance.

---

## Step 2: Restrict Access to the Server (only internal team)

After (or before) you have the certificate, restrict **who can reach** the server:

**Option A – Firewall on the server or upstream**
- Allow **ports 80 and 443** only from:
  - Internal IP ranges (e.g. office LAN, VPN pool), and/or  
  - Specific IPs/hosts that only the internal team use.
- Default-deny everyone else.

**Option B – Firewall / ACL on the edge (router, load balancer, cloud security group)**
- Same idea: allow 80/443 only from internal/VPN IPs; block the rest.

**Option C – VPN-only access**
- Server is only reachable from inside the corporate VPN. Only the internal team has VPN → only they can open the URL.

Result: **Only the internal team can access the URL.** The certificate is still from a public CA, so **everyone who can access** (i.e. only internal) sees the site as **trusted** with no install on their devices.

---

## Step 3: Get the Certificate and Configure NGINX (server-side SSL)

- Run **Certbot** (or your chosen method) to get a certificate for `sustainability.kpndomain.com` (e.g. HTTP-01 with NGINX, or DNS-01 if you use a supported DNS API).  
- Configure **NGINX** to:
  - Listen on 443.
  - Use `ssl_certificate` and `ssl_certificate_key` pointing to that certificate.
  - Proxy to your app (e.g. `proxy_pass http://172.28.80.50:8000`).

All of this is **on the server**; no client install.

(If you use the same Docker NGINX setup as before, follow your existing SSL-DOCKER or internal-CA docs for the exact paths and reload steps; the only change here is using a **public CA** instead of an internal CA.)

---

## Step 4: Optional — Application-Level “Internal Only”

For extra assurance that only the internal team can use the app:

- **VPN:** Require VPN to reach the server (network does the filtering).
- **IP allowlist in the app:** App checks `X-Forwarded-For` / `X-Real-IP` and only allows known internal ranges.
- **Auth:** Login (e.g. SSO, AD) so only authorized users can use the site, even if someone on the internal network shares a link.

These are in addition to the network restriction; they don’t change how SSL or “trusted” works.

---

## Summary

| Your goal | How to achieve it |
|-----------|--------------------|
| SSL is built and runs on the server | NGINX serves HTTPS with a certificate (public or internal). No client cert install. |
| Everyone who can access the URL sees the domain as trusted | Use a **publicly trusted certificate** (e.g. Let’s Encrypt). Then no CA install on devices. |
| Only internal team can access the domain | **Restrict access on the network**: firewall/VPN so only internal IPs (or VPN users) can reach the server. |

So: **SSL is server-side; trust is “automatic” for everyone who can reach the URL because you use a public CA; and only the internal team can reach the URL because of firewall/VPN.** That matches “SSL built private with private network, run from the server, trusted for everyone who can access, only internal team can access.”
