# Admin Portal: User Management & Admin Management

This document describes the User Management and Admin Management features available in the Admin Portal, including API endpoints, RBAC, and how to seed the initial SUPER_ADMIN.

## Environment variables

No new environment variables are required for this feature. Existing admin auth and API configuration apply:

- **API**: `JWT_ADMIN_SECRET`, `JWT_ADMIN_EXPIRES_IN` (see `apps/api/env.example`)
- **Web**: `NEXT_PUBLIC_API_URL`, `INTERNAL_API_URL` / `API_BACKEND_URL` for server-side proxy (see `apps/web/env.example`)

Optional:

- **Seeding**: `ADMIN_SEED_PASSWORD` – used when seeding default admins (default: `Admin123!`). Set this in production to a secure value before running `pnpm db:seed`.

## Seeding the initial SUPER_ADMIN

1. Run migrations and seed:

   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

2. The seed creates:
   - **Super Admin**: `superadmin@energi-up.com` (role: `SUPER_ADMIN`)
   - **Admin**: `admin@energi-up.com` (role: `ADMIN`)

   Both use the password from `ADMIN_SEED_PASSWORD` (default: `Admin123!`).

3. To create or change the first SUPER_ADMIN manually (e.g. different email):

   - Ensure at least one admin exists (seed or create via another SUPER_ADMIN).
   - Log in as that admin, then in the database set `admins.role = 'SUPER_ADMIN'` and `admins.status = 'ACTIVE'` for the desired row, or create a new admin row with hashed password and `role = 'SUPER_ADMIN'`.

## RBAC (roles)

- **SUPER_ADMIN**: Can manage users and admins; can assign SUPER_ADMIN role; can create/disable admins. Cannot disable or downgrade the last active SUPER_ADMIN.
- **ADMIN**: Can manage portal users (list, view, update profile, role, status). Cannot assign SUPER_ADMIN role to users; cannot create or manage admins.
- **USER**: Portal user role (assigned to `User` records), not an admin role.

Admin roles are stored on the `Admin` table (`admins.role`). User roles are stored via `UserRole` / `Role` (e.g. `USER`, `ADMIN`, `SUPER_ADMIN` for portal users).

## API endpoints (NestJS)

Base path: `api/v1` (e.g. `GET /api/v1/admin/users`). All require admin JWT (cookie `admin_access_token` or `Authorization: Bearer <token>`).

### User Management (ADMIN or SUPER_ADMIN)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/users` | List users. Query: `page`, `pageSize`, `search`, `role`, `status`, `sortBy`, `sortOrder` |
| GET | `/admin/users/:id` | User detail |
| PATCH | `/admin/users/:id` | Update name, status, roles (ADMIN cannot set SUPER_ADMIN) |
| PATCH | `/admin/users/:id/role` | Set single role (USER, ADMIN, or SUPER_ADMIN; SUPER_ADMIN only for SUPER_ADMIN) |
| PATCH | `/admin/users/:id/status` | Set status (e.g. ACTIVE, SUSPENDED) |

### Admin Management (SUPER_ADMIN only)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/admins` | List admins |
| GET | `/admin/admins/:id` | Admin detail |
| POST | `/admin/admins` | Create admin (body: `email`, `temporaryPassword`, optional `name`, `role`) |
| PATCH | `/admin/admins/:id` | Update name, role, or status (INACTIVE = disable access) |

### Audit

Admin mutations (user update, role/status change, admin create/update) are logged to `audit_logs` with `actor_admin_id`, `before_json`, `after_json`, and optional `ip`, `user_agent`.

## Admin Portal UI

- **Users**: Sidebar → “Users”. List with search, filters (role, status), sort, pagination. Row actions: View / Edit. User detail page: edit name, role, status; save with toast.
- **Admins**: Sidebar → “Admins”. List of admins; “Add Admin” opens a modal (email, name, temporary password, role). Edit modal: change name, role, status. “Disable” sets status to INACTIVE (soft disable).

## Database

- **User**: `users` table; status enum `UserStatus` (ACTIVE, INACTIVE, PENDING, PENDING_VERIFICATION, SUSPENDED); roles via `user_roles` + `roles`.
- **Admin**: `admins` table; `role` string (`ADMIN` | `SUPER_ADMIN`), `status` string (`ACTIVE` | `INACTIVE`); optional `name`.
- **AuditLog**: `audit_logs`; added fields: `actor_user_id`, `actor_admin_id`, `before_json`, `after_json`, `ip`, `user_agent`.

Migration: `20260224024137_add_admin_user_management_and_audit_fields` (or later with the same schema changes).
