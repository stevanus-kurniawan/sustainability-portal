# Verification Summary — Recent Changes

**Date:** 2026-02-23  
**Scope:** All changes (pagination cap, file upload limits, logout cookie, EmailService PII, Swagger, Dockerfile, refresh expiresAt) verified to not introduce bugs or break existing behaviour.

---

## Build & tests

| Check | Result |
|-------|--------|
| **Full monorepo build** (`pnpm build`) | ✅ Passed (api, web, shared) |
| **API unit tests** (`pnpm --filter @slms/api test`) | ✅ 21 tests passed (5 suites) |
| **Lint** | ✅ No linter errors in `apps/api/src`, `apps/web/src` |

---

## Behaviour verification

### 1. Pagination cap

- **Call sites:** `PublicController` calls `findByCategorySlugAndSubSlugPublic(slug, subSlug, page?, pageSize?)` for licenses and certifications. Method signatures still accept the same 4 arguments; only internal variable names changed to `pageParam`/`pageSizeParam` and values are passed through `clampPagination()`. **No breaking change.**
- **Defaults:** `clampPagination(undefined, undefined)` returns `{ page: 1, pageSize: 20 }`; when callers pass query params, values are clamped to max 100. **Existing clients unchanged.**

### 2. File upload limits

- **Allowed types:** PDF, images, Office, text, CSV. Rejected type returns `{ key: null, message: '...' }` (same shape as “No file provided”). **Existing success response shape unchanged.**
- **Size:** Requests over 25 MB rejected by Multer before controller. **No change to valid uploads.**

### 3. Logout cookie (user & admin)

- **Signature:** `clearUserCookie(res, req?)` and `clearAdminCookie(res, req?)` — `req` is optional; when omitted, `secure` is false and cookie still cleared with `httpOnly`, `sameSite`, `path`. **Backward compatible.**
- **Logout flow:** Controllers pass `req` so production HTTPS gets matching options. **No change to success response.**

### 4. EmailService logging

- **Success/error:** Only log message changed (no email in logs). Return value and behaviour unchanged. **No impact on callers.**

### 5. Swagger in production

- **Default:** When `NODE_ENV === 'production'`, default for `SWAGGER_ENABLED` is `'false'`; can still be overridden with env. **Non-production unchanged.**

### 6. API Dockerfile (non-root, HEALTHCHECK)

- **User:** Process runs as `node`; `/app` chowned to `node`. Entrypoint runs `prisma migrate deploy` and `node dist/main.js` (no root-only steps). **Runtime behaviour unchanged.**
- **HEALTHCHECK:** Uses existing `/api/v1/health/ready`. **No app logic change.**

### 7. Refresh token expiresAt

- **Logic:** `expiresAt` now derived from `JWT_REFRESH_EXPIRES_IN` via existing `parseExpiryToSeconds()`. When config is `'7d'`, result matches previous hardcoded 7 days. **Same behaviour for current config; correct when config changes.**

---

## Conclusion

- All changes are **backward compatible** and do not alter success response shapes or required request formats.
- **No regressions** detected in build, tests, or lint.
- Existing features (auth, logout, pagination, upload, email, refresh, Docker) continue to behave as before, with the intended security and operability improvements only.
