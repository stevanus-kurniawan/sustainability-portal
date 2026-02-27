# Commit preview — branch `dev` → push to `origin/dev`

**Branch:** `dev`  
**Staged:** none (all changes are unstaged)  
**Diff:** 41 files changed, 1137 insertions(+), 480 deletions(-)

Preview below. After review, stage and commit, then push:
```bash
git add -A
git commit -m "Your message"
git push origin dev
```

---

## Modified files (tracked)

### API — config & app
| File | Change summary |
|------|----------------|
| `apps/api/src/app.module.ts` | Optional Redis (`REDIS_ENABLED`), conditional Bull/Queues |
| `apps/api/src/config/configuration.ts` | Weak secret list for prod validation |
| `apps/api/src/config/env.validation.ts` | Env validation updates |
| `apps/api/src/main.ts` | Swagger default off in production |
| `apps/api/Dockerfile` | Non-root user, HEALTHCHECK |
| `apps/api/env.example` | REDIS_ENABLED comment |

### API — auth & admin-auth
| File | Change summary |
|------|----------------|
| `apps/api/src/modules/auth/auth.controller.ts` | Logout cookie options (secure, sameSite), clearUserCookie(res, req) |
| `apps/api/src/modules/auth/auth.service.ts` | Forgot/reset password, refresh expiresAt from config |
| `apps/api/src/modules/auth/templates/verify-email.template.ts` | Template tweak |
| `apps/api/src/modules/admin-auth/admin-auth.controller.ts` | clearAdminCookie(res, req), secure/sameSite |
| `apps/api/src/modules/admin-auth/admin-auth.module.ts` | Module updates |

### API — services (pagination, upload, email, public)
| File | Change summary |
|------|----------------|
| `apps/api/src/common/response.ts` | clampPagination, MAX_PAGE_SIZE |
| `apps/api/src/modules/certifications/certifications.service.ts` | clampPagination in list methods |
| `apps/api/src/modules/licenses/licenses.service.ts` | clampPagination in list methods |
| `apps/api/src/modules/grievances/grievances.service.ts` | clampPagination in list methods |
| `apps/api/src/modules/traceability/traceability.service.ts` | clampPagination in list methods |
| `apps/api/src/modules/notification-engine/notification-engine.service.ts` | clampPagination in getNotificationsForUser |
| `apps/api/src/modules/notification-engine/email.service.ts` | No PII in logs (messageId only) |
| `apps/api/src/modules/documents/documents.service.ts` | clampPagination (existing + consistency) |
| `apps/api/src/modules/public/public.controller.ts` | Path traversal fix (reject `..` in key) |
| `apps/api/src/modules/upload/upload.controller.ts` | 25MB limit, MIME allowlist, fileFilter |
| `apps/api/src/modules/audit-logs/audit-logs.service.ts` | Audit logging updates |

### API — Prisma & seed
| File | Change summary |
|------|----------------|
| `apps/api/prisma/schema.prisma` | Schema changes (e.g. password reset, admin/audit) |
| `apps/api/prisma/seed.ts` | Seed updates |

### Web
| File | Change summary |
|------|----------------|
| `apps/web/src/lib/auth-api.ts` | Login network error message, messageForFetchError |
| `apps/web/src/lib/admin-api.ts` | Admin API client additions |
| `apps/web/src/lib/internal-api.ts` | Internal API updates |
| `apps/web/src/app/login/page.tsx` | Login page updates |
| `apps/web/src/app/compliance/[sectionSlug]/page.tsx` | License page fix (no 404), safe fetches |
| `apps/web/src/app/compliance/[sectionSlug]/[subSlug]/page.tsx` | Compliance sub-page updates |
| `apps/web/src/app/certifications/page.tsx` | Certifications view refactor |
| `apps/web/src/app/licenses/page.tsx` | Licenses view refactor |
| `apps/web/src/app/admin/layout.tsx` | Admin layout (e.g. nav) |
| `apps/web/src/components/ui/Badge.tsx` | Badge component |
| `apps/web/src/components/ui/index.ts` | Export Badge |
| `apps/web/src/components/section/SubContentCertificationsClient.tsx` | Certifications client |
| `apps/web/src/components/section/SubContentLicensesClient.tsx` | Licenses client |
| `apps/web/public/logo.png` | Logo asset (binary) |
| `apps/web/package.json` | Scripts/deps |
| `apps/web/Dockerfile` | Web Dockerfile (if any change) |

### Infra & root
| File | Change summary |
|------|----------------|
| `package.json` | build:docker, docker:up, docker:down |
| `infra/docker-compose.yml` | Compose tweaks |
| `README.md` | Readme updates |

---

## Untracked files (new)

### API
- `apps/api/prisma/migrations/20260223000000_add_password_reset_tokens/`
- `apps/api/prisma/migrations/20260223025654_migration_forgot_password/`
- `apps/api/prisma/migrations/20260224024137_add_admin_user_management_and_audit_fields/`
- `apps/api/prisma/migrations/migration_lock.toml`
- `apps/api/src/modules/admin-admins/`
- `apps/api/src/modules/admin-auth/decorators/`
- `apps/api/src/modules/admin-auth/guards/admin-roles.guard.ts`
- `apps/api/src/modules/admin-users/`
- `apps/api/src/modules/auth/dto/forgot-password.dto.ts`
- `apps/api/src/modules/auth/dto/reset-password.dto.ts`
- `apps/api/src/modules/auth/templates/reset-password.template.ts`

### Web
- `apps/web/src/app/admin/admins/`
- `apps/web/src/app/admin/users/`
- `apps/web/src/app/api/admin/admins/`
- `apps/web/src/app/api/admin/users/`
- `apps/web/src/app/auth/` (verify-email, reset-password)
- `apps/web/src/app/certifications/CertificationsViewClient.tsx`
- `apps/web/src/app/forgot-password/`
- `apps/web/src/app/global-error.tsx`
- `apps/web/src/app/licenses/LicensesViewClient.tsx`
- `apps/web/src/components/admin/`
- `apps/web/src/components/section/ComplianceLicensesSectionClient.tsx`
- `apps/web/src/components/ui/ViewModeToggle.tsx`

### Docs
- `docs/ADMIN-USER-MANAGEMENT.md`
- `docs/PRE-UAT-PRE-PRODUCTION-REVIEW.md`
- `docs/UAT-EVALUATION.md`
- `docs/VERIFICATION-SUMMARY.md`

---

## Suggested commit message (single commit)

```
feat: UAT-ready fixes and hardening

- Auth: logout cookie options (secure, sameSite), refresh expiresAt from config
- Security: path traversal fix on file preview, weak secret validation, no PII in email logs
- API: pagination cap everywhere (clampPagination), upload 25MB + MIME allowlist
- API: optional Redis (REDIS_ENABLED), Swagger off in prod, Dockerfile non-root + HEALTHCHECK
- Web: login network error message, license page 404 fix, forgot/reset password + verify-email
- Admin: admin/users, admin-admins, admin-api; compliance/certifications/licenses views
- Docs: PRE-UAT review, UAT evaluation, verification summary, admin user management
- Infra: docker scripts (build:docker, docker:up/down)
```

---

*Generated for preview before push to origin/dev.*
