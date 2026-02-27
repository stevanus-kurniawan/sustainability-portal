# Pre-UAT / Pre-Production Review — Sustainability Portal (SLMS)

**Review date:** 2025-02-23  
**Scope:** Backend (NestJS + Prisma + PostgreSQL), Infra (Docker / Docker Compose), Auth, Security, Operability.

---

## 1) Mental model (entrypoints, modules, critical flows)

| Area | Implementation |
|------|----------------|
| **Entrypoints** | `main.ts` → global prefix `api/v1`, ValidationPipe (whitelist + forbidNonWhitelisted), CORS, cookie-parser. No Helmet. |
| **Auth (user)** | `AuthModule`: register (domain restriction, bcrypt, email verification JWT 15m), login (access + refresh JWT, cookie), refresh (body `refreshToken`, rotation), logout (invalidates refresh tokens), verify-email, resend-verification, change-email. |
| **Auth (admin)** | `AdminAuthModule`: login only (bcrypt, JWT access token, no refresh). `AdminAuthGuard` on all `/admin/*` routes. |
| **RBAC** | User: JWT payload has `roles` and `permissions`; `JwtAuthGuard` + `@Public()` for public routes. Admin: single role in token. No per-route permission checks beyond “admin” vs “user”. |
| **Data flow** | Request → ValidationPipe (DTO) → Guard → Controller → Service → Prisma → DB. External: SMTP (EmailService), MinIO (UploadService). |
| **File upload** | Admin only: `UploadController` — presign (MinIO) and proxy upload (multipart). No file size or type allowlist on proxy. |
| **Email** | Nodemailer (SMTP). Verification links (JWT), expiry notifications. Sent synchronously in request path (no queue in flow). |
| **Background** | BullMQ configured (Redis); notification engine and queues present. |
| **Public API** | `PublicController` with `@Public()`: navigation, categories, documents, certifications, licenses, grievances, traceability, and **files/preview?key=** (stream from MinIO). |

---

## A) Executive summary

- **Default/placeholder secrets in production:** Docker Compose prod uses fallbacks `JWT_REFRESH_SECRET:-refresh-secret-change-in-production` and `JWT_ADMIN_SECRET:-admin-secret-change-in-production`. These do **not** match the strings checked in `configuration.ts`, so the app will not throw in prod if these env vars are unset — **weak secrets can be used**. Must align validation with compose defaults or remove compose defaults.
- **Path traversal on public file preview:** Public endpoint `GET /public/files/preview?key=...` allows `/` in the key; the pattern does not forbid `..`. Keys like `uploads/../../etc/passwd` can be requested. Must reject `..` (or normalize path and restrict to under `uploads/`).
- **No password reset flow:** Forgot-password / reset-password is referenced in shared constants but not implemented. Users cannot reset password via the API.
- **Secrets and PII in repo/logs:** `infra/.env` (or a copy) may contain real SMTP credentials; ensure no committed secrets. Email service logs recipient addresses (PII). Redact or avoid logging email addresses.
- **File upload security:** Proxy upload has no max file size, no content-type allowlist, and no virus-scanning; presign accepts client-provided `fileName` (extension only used for key). Recommend size limit, allowlist, and path traversal check.
- **Pagination:** `pageSize` from query is passed through without a cap; very large values can cause high load or DoS. Cap e.g. to 100.
- **Dockerfile:** Runs as root; no HEALTHCHECK. Recommend non-root user and health check for orchestration.
- **Rate limiting:** Throttler is global with library defaults; login/register are not stricter. Consider stricter limits on auth endpoints.
- **Readiness:** Auth (bcrypt, JWT, refresh rotation, cookie), validation, and public vs admin boundaries are clear. Email verification and token expiry are handled. Main gaps: secrets validation alignment, path traversal, missing password reset, and operability hardening.

**Readiness score: 62/100**

Reasoning: Core auth and RBAC are in place and generally correct; email verification and refresh rotation are implemented. Critical deductions for: (1) production secret validation not covering compose defaults, (2) path traversal on file preview, (3) no password reset, (4) infra/secrets and logging hygiene, (5) upload and pagination limits, (6) Docker and rate-limit hardening. Score can reach ~85+ after addressing P0/P1 items and key P2 items.

---

## B) Findings table

| Pri | Title | Risk/Impact | Evidence | Fix |
|-----|--------|-------------|----------|-----|
| **P0** | Production secret validation does not cover Docker Compose defaults | If deploy uses compose without setting `JWT_REFRESH_SECRET` / `JWT_ADMIN_SECRET`, app gets weak defaults and does not throw. | `infra/docker-compose.dev.backend.yml` lines 98–99: `JWT_REFRESH_SECRET:-refresh-secret-change-in-production`, `JWT_ADMIN_SECRET:-admin-secret-change-in-production`. `apps/api/src/config/configuration.ts` lines 2–3, 20–24: checks against `DEFAULT_REFRESH_JWT_SECRET = 'refresh-secret-key-change-in-production'` and `DEFAULT_ADMIN_JWT_SECRET = 'admin-secret-key-change-in-production'` (different strings). | In `configuration.ts`, also treat `refresh-secret-change-in-production` and `admin-secret-change-in-production` as invalid in production (e.g. add to the condition), **or** remove the default values from docker-compose so the app fails fast when env is unset. Prefer both: align check with compose and require explicit env in prod. |
| **P0** | Path traversal on public file preview | Attacker can request `?key=uploads/../../some/other/key` and potentially read objects outside intended prefix. | `apps/api/src/modules/public/public.controller.ts` lines 49–52: `safeKeyPattern = /^uploads\/[a-zA-Z0-9._\-\/]+$/` — allows `/` and does not forbid `..`. | Reject key if it contains `..` or normalize path and ensure resolved path stays under `uploads/`. Example: `if (key.includes('..')) return res.status(400).json({ message: 'Invalid file key format' });` |
| **P0** | No forgot-password / reset-password flow | Users cannot recover account if they lose password; shared constants reference routes that do not exist. | `packages/shared/src/constants/api.ts`: `FORGOT_PASSWORD`, `RESET_PASSWORD`. No handler in `apps/api/src/modules/auth`. | Implement forgot-password (send single-use, hashed, expiring token link) and reset-password (verify token, set new password, invalidate token). Store token hash in DB; use bcrypt or secure comparison. |
| **P1** | Infra `.env` or committed secrets | Real credentials in repo or in default `.env` lead to compromise. | `infra/.env` read during review contained `SMTP_PASS=...` and other values. `.gitignore` has `.env` / `.env.*`; ensure `infra/.env` is not committed. | Never commit real secrets. Use `infra/env.example` (or similar) with placeholders only. Rotate any secret that may have been committed. Ensure CI/deploy uses env from a secrets store. |
| **P1** | File upload: no size or type limits (proxy) | Large or malicious file uploads can exhaust memory or store dangerous content. | `apps/api/src/modules/upload/upload.controller.ts`: `FileInterceptor('file')` with no `limits` or `fileFilter`. `upload.service.ts`: accepts any key/stream. | Add Multer `limits: { fileSize: 25 * 1024 * 1024 }` (e.g. 25MB), and `fileFilter` to allow only safe MIME types (e.g. PDF, images, Office). Validate extension and content-type. |
| **P1** | Pagination uncapped | Very large `pageSize` can cause high DB/memory load or DoS. | Multiple controllers pass `pageSize` from query to services; e.g. `documents.service.ts` uses `DEFAULT_PAGE_SIZE = 20` but does not cap incoming `pageSize`. | Introduce `MAX_PAGE_SIZE = 100` (or similar) in a shared constant; in each service (or a shared helper), use `pageSize = Math.min(Number(pageSize) || DEFAULT, MAX_PAGE_SIZE)`. Apply to all list endpoints. |
| **P1** | PII in logs | Email addresses and similar in logs create compliance and privacy risk. | `apps/api/src/modules/notification-engine/email.service.ts` line 60: `this.logger.log(\`Email sent: ${result.messageId} to ${options.to}\`);` | Redact or hash email in logs, or log only messageId and high-level outcome (e.g. “Email sent to 1 recipient”). |
| **P1** | Cookie clearing on logout | If `clearCookie` options don’t match `setCookie`, cookie may remain on client. | `apps/api/src/modules/auth/auth.controller.ts` lines 173–176: `clearUserCookie` uses `httpOnly: true, path: '/'` but does not set `secure` or `sameSite`. | Use same options as `setUserCookie` when clearing (e.g. `secure`, `sameSite: 'lax'`) so the cookie is cleared in all environments. |
| **P2** | Dockerfile runs as root | Increases impact of container compromise. | `apps/api/Dockerfile`: no `USER` directive; process runs as root. | Add non-root user and `USER` in runner stage; ensure `/app` and any writable dirs are owned by that user. |
| **P2** | No HEALTHCHECK in Docker image | Orchestrators cannot detect unhealthy containers. | `apps/api/Dockerfile`: no HEALTHCHECK. Health endpoint exists at `GET /health`. | Add `HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD curl -f http://localhost:3001/api/v1/health/ready || exit 1` (or use `wget`; ensure tool is in image). |
| **P2** | Swagger enabled by config only | If `SWAGGER_ENABLED` is left true in prod, API surface is exposed. | `main.ts`: Swagger mounted when `SWAGGER_ENABLED !== 'false'`. | In production, disable by default (e.g. `SWAGGER_ENABLED=false` in prod .env) or gate on `NODE_ENV !== 'production'`. |
| **P2** | Stricter rate limit on auth | Login/register are sensitive to brute force and abuse. | `app.module.ts`: `ThrottlerModule.forRoot()` with default limits only. | Use `ThrottlerModule.forRoot([{ name: 'short', ttl: 60000, limit: 5 }])` and apply to auth routes with `@Throttle({ short: { limit: 3, ttl: 60000 } })` or similar. |
| **P2** | Refresh token expiry vs stored `expiresAt` | Logic assumes 7d expiry; if `JWT_REFRESH_EXPIRES_IN` changes, stored `expiresAt` can be wrong. | `auth.service.ts` lines 331–336: `expiresAt.setDate(expiresAt.getDate() + 7)` hardcoded. | Compute `expiresAt` from `JWT_REFRESH_EXPIRES_IN` (e.g. same `parseExpiryToSeconds` and add seconds to `new Date()`). |

---

## C) Patch suggestions (TOP 3)

### 1) Path traversal — reject `..` in public file key

**File:** `apps/api/src/modules/public/public.controller.ts`

```diff
--- a/apps/api/src/modules/public/public.controller.ts
+++ b/apps/api/src/modules/public/public.controller.ts
@@ -44,6 +44,9 @@ export class PublicController {
     if (!key || typeof key !== 'string') {
       return res.status(400).json({ message: 'Missing or invalid key parameter' });
     }
+    if (key.includes('..')) {
+      return res.status(400).json({ message: 'Invalid file key format' });
+    }
 
     // Enforce that only document uploads can be accessed via this public endpoint.
     // Keys must be under the "uploads/" prefix and contain only safe characters.
```

### 2) Production secret check — include compose default strings

**File:** `apps/api/src/config/configuration.ts`

```diff
--- a/apps/api/src/config/configuration.ts
+++ b/apps/api/src/config/configuration.ts
@@ -15,10 +15,14 @@ export default () => {
   const minioAccessKey = process.env.MINIO_ACCESS_KEY || DEFAULT_MINIO_ACCESS_KEY;
   const minioSecretKey = process.env.MINIO_SECRET_KEY || DEFAULT_MINIO_SECRET_KEY;
 
+  const weakRefreshSecrets = [DEFAULT_REFRESH_JWT_SECRET, 'refresh-secret-change-in-production'];
+  const weakAdminSecrets = [DEFAULT_ADMIN_JWT_SECRET, 'admin-secret-change-in-production'];
+
   if (
     isProdLike &&
     (jwtSecret === DEFAULT_USER_JWT_SECRET ||
-      jwtRefreshSecret === DEFAULT_REFRESH_JWT_SECRET ||
-      jwtAdminSecret === DEFAULT_ADMIN_JWT_SECRET ||
+      weakRefreshSecrets.includes(jwtRefreshSecret) ||
+      weakAdminSecrets.includes(jwtAdminSecret) ||
       minioAccessKey === DEFAULT_MINIO_ACCESS_KEY ||
       minioSecretKey === DEFAULT_MINIO_SECRET_KEY)
   ) {
```

### 3) Pagination cap — shared constant and clamp in documents service (example)

**File:** `apps/api/src/common/response.ts` (or a new `pagination.ts`)

```diff
--- a/apps/api/src/common/response.ts
+++ b/apps/api/src/common/response.ts
@@ -1,5 +1,9 @@
 /**
  * Helpers for Strapi-compatible API responses (id + attributes) and pagination.
  */
+
+export const DEFAULT_PAGE = 1;
+export const DEFAULT_PAGE_SIZE = 20;
+export const MAX_PAGE_SIZE = 100;
 
 export interface PaginationMeta {
@@ -22,6 +26,12 @@ export function paginationMeta(
   };
 }
 
+/** Clamp page and pageSize for list queries to prevent abuse. */
+export function clampPagination(page?: number, pageSize?: number): { page: number; pageSize: number } {
+  const p = Math.max(1, Number(page) || DEFAULT_PAGE);
+  const ps = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(pageSize) || DEFAULT_PAGE_SIZE));
+  return { page: p, pageSize: ps };
+}
+
 /** Wrap list in { data, meta } for public list endpoints */
```

Then in `documents.service.ts` (and similarly in other services), use `clampPagination` for all list methods that accept `page` and `pageSize`.

---

## D) Checklist

### Must-fix before UAT

- [ ] Align production secret validation with Docker Compose defaults (or remove compose defaults) so prod fails if JWT_REFRESH_SECRET / JWT_ADMIN_SECRET are weak or unset.
- [ ] Reject path traversal on public file preview (`..` in key or normalize and restrict under `uploads/`).
- [ ] Ensure no real secrets in repo; use env.example with placeholders; rotate any exposed secrets.
- [ ] Cap pagination (e.g. MAX_PAGE_SIZE 100) on all list endpoints.
- [ ] Add file size and type restrictions on admin proxy upload.

### Must-fix before production

- [ ] Implement forgot-password and reset-password (single-use, hashed, expiring token; no plain tokens in DB).
- [ ] Redact or avoid logging email addresses (and other PII) in email service and audit logs where appropriate.
- [ ] Align logout cookie clearing with set-cookie options (secure, sameSite).
- [ ] Disable Swagger in production (or gate on NODE_ENV).
- [ ] Add HEALTHCHECK to API Dockerfile and use readiness endpoint.
- [ ] Run API container as non-root user in Dockerfile.

### Nice-to-have

- [ ] Stricter rate limits on auth routes (login, register, forgot-password).
- [ ] Compute refresh token `expiresAt` from `JWT_REFRESH_EXPIRES_IN`.
- [ ] Consider Helmet for security headers if API serves or redirects to web.
- [ ] Optional virus scanning for uploaded files.
- [ ] Structured logging with correlation ID and log levels; ensure stack traces only in non-prod or redacted.

---

*End of review.*
