# QA Report — Pre-Push (Functionality, Edge Cases, Security)

**Date:** 2025-02-26  
**Scope:** All uncommitted changes before push to GitHub  
**Role:** Quality Assurance review

---

## 1. Summary

| Area              | Status | Notes |
|-------------------|--------|--------|
| Build             | ✅ Pass | API, Web, shared build successfully |
| Unit tests        | ✅ Pass | 21 tests, 5 suites (API) |
| Auth & JWT        | ✅ OK  | Cookie/httpOnly, refresh secret check, login error handling |
| Input validation  | ✅ OK  | Global ValidationPipe (whitelist, forbidNonWhitelisted), DTOs |
| Documents / APIs  | ✅ OK  | Prisma parameterized; pagination clamped; library type whitelisted |
| Public API        | ✅ OK  | Query params parsed safely; no user input in backend URL |
| Proxy (Next.js)   | ✅ OK  | Backend URL from env/origin only; no SSRF from path |
| Frontend          | ✅ OK  | No `dangerouslySetInnerHTML`; external links validated with `@IsUrl()` |

**Fixes applied during QA**

- **Auth `getProfile`:** Null-safe handling of `role?.name` and `rp?.permission?.code` to avoid runtime errors when role/permission data is missing.
- **Library `type` filter:** Public library `type` query param is now whitelisted against `DocumentType` enum so invalid values do not cause a 500 (Prisma enum error).

---

## 2. Functionality

### 2.1 Auth

- **Login:** Email/password validated via DTO; login wrapped in try/catch; 4xx rethrown, 5xx replaced with generic message; cookie set with `httpOnly`, `sameSite: 'lax'`, `secure` in production when request is HTTPS.
- **Register:** Password strength (length + pattern), weak-password blocklist, optional domain restriction; email normalized; duplicate email returns 409.
- **Refresh:** `JWT_REFRESH_SECRET` (or `jwt.refreshSecret`) required; missing value returns 400 with clear message.
- **Token generation:** Roles and permissions collected with null-safe access; no reliance on missing `role` or `permission`.
- **getProfile:** Now uses the same null-safe pattern for roles and permissions as token generation (fix applied).

### 2.2 Documents

- **Create/Update:** New fields `code`, `documentType`, `versionLabel`, `effectiveDate` validated (Create/Update DTOs); optional; `effectiveDate` parsed and stored; attachment `validFrom` set from `effectiveDate`.
- **Public policies:** Optional `search`; Prisma `contains` with `mode: 'insensitive'`; pagination via `clampPagination`.
- **Public library:** `category`, `tags`, `type`, `search`, `sortBy`, `sortOrder` supported; `sortBy` restricted to `title` | `createdAt` | `publishedAt`; `type` restricted to allowed enum values (fix applied).
- **Certifications / Licenses (public):** Optional `search` on relevant fields; scoped by category + sub-content; pagination clamped.

### 2.3 API Proxy (Next.js)

- **Route:** `apps/web/src/app/api/v1/[...path]/route.ts` proxies to backend using `getInternalApiBase(request)`.
- **Backend URL:** From `INTERNAL_API_URL` / `API_BACKEND_URL` / Docker hostname / request origin; no user-controlled URL.
- **Methods:** GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS forwarded with body and headers (host stripped).
- **Errors:** 502 with user-friendly message when backend is unreachable.

---

## 3. Edge Cases

| Scenario | Handling |
|----------|----------|
| Invalid `page` / `pageSize` (NaN, negative) | `clampPagination()` normalizes to 1..MAX_PAGE_SIZE (100). |
| Missing `JWT_REFRESH_SECRET` | Refresh fails with 400 and clear message; no silent wrong token. |
| Role or permission missing in DB for user | `getProfile` and token generation no longer throw; null-safe (fix applied). |
| Invalid `type` on public library | Ignored unless in `ALLOWED_DOCUMENT_TYPES`; no 500 (fix applied). |
| Invalid `effectiveDate` string | Rejected by DTO `@IsDateString()` before service. |
| Empty or whitespace `search` | Trimmed where used (e.g. `search?.trim() || undefined`). |
| Document create with category mode DIRECT but `subContentId` set | `BadRequestException` from service. |
| Document create with category mode WITH_SUBCONTENT but no sub-content | `BadRequestException` from service. |

---

## 4. Security

### 4.1 Authentication & session

- Passwords hashed with bcrypt (SALT_ROUNDS = 10).
- Access token in cookie: `httpOnly`, `sameSite: 'lax'`, `secure` when production and HTTPS.
- Login does not leak whether email exists; generic “Invalid credentials” for wrong password or missing user.
- Forgot-password style flows (if any) should not reveal existence of email (verified in auth service patterns).

### 4.2 Input validation & injection

- **Global:** `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`.
- **Documents:** Create/Update use DTOs; `externalLink` has `@IsUrl()`; Prisma used with parameterized queries (no raw SQL from user input).
- **Search/filter:** All search terms go into Prisma `contains` / `where`; no string concatenation into queries.
- **Public query params:** `page`/`pageSize` parsed with `parseInt(..., 10)`; then `clampPagination`; no injection risk.

### 4.3 Frontend

- No `dangerouslySetInnerHTML` or `eval` found in `apps/web/src`.
- Links use `externalLink` or file URLs from API; `externalLink` validated with `@IsUrl()` (default allows http/https).
- Recommendation: If you need to restrict links to http/https only, use `@IsUrl({ protocols: ['http', 'https'] })` in the DTOs.

### 4.4 Proxy & SSRF

- Backend base URL is from environment or request origin, not from user input.
- Path is route segment only (e.g. `path.join('/')`); no user-supplied full URL; risk of SSRF via proxy is low.
- Cookie/Authorization headers are forwarded so same-origin API calls work as intended.

### 4.5 CORS & headers

- CORS origins from config; localhost variants expanded to 127.0.0.1; credentials allowed; methods and headers restricted.

---

## 5. Recommendations Before Push

1. **Run full flow once locally:**  
   `pnpm setup:env` → `pnpm dev:infra` → wait → `pnpm db:migrate` → `pnpm db:seed` → `pnpm dev`.  
   Then: login, create/edit document (with new fields), use public policies/library/search, and hit proxy (e.g. from web app on same host).

2. **Environment:**  
   Ensure `JWT_REFRESH_SECRET` (or equivalent) is set in every environment (dev, staging, prod) and in `infra/env.example` (or equivalent) for Docker.

3. **Optional hardening:**  
   - Add `@IsUrl({ protocols: ['http', 'https'] })` for `externalLink` in Create/Update document DTOs if you want to disallow other schemes.  
   - Consider rate limiting on auth endpoints (e.g. login, forgot-password) in production.

4. **Line endings:**  
   Git CRLF warnings are cosmetic; consider `.gitattributes` to normalize line endings if you want cleaner diffs.

---

## 6. Sign-off

- **Build:** ✅  
- **Tests:** ✅  
- **Auth & session:** ✅ (with getProfile fix)  
- **Documents & public APIs:** ✅ (with library type whitelist)  
- **Proxy & security:** ✅  

The project is in a good state to push to GitHub from a functionality, edge-case, and security perspective, with the two code fixes (getProfile null-safety and library type whitelist) applied.
