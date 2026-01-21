# SLMS - Sustainability Certification and Licensing Management System

A comprehensive monorepo for managing sustainability certifications and business licenses. Built with modern technologies including Next.js, NestJS, and Strapi.

## 🏗️ Architecture

```
slms/
├── apps/
│   ├── web-public/     # Next.js 14 App Router - Public portal
│   ├── api/            # NestJS - Backend API with Prisma
│   └── cms/            # Strapi v4 - Content Management System
├── packages/
│   └── shared/         # Shared types, DTOs, and constants
└── infra/              # Docker Compose infrastructure
```

## 🌐 Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| **Web Portal** | http://localhost:3000 | Public sustainability portal |
| **API Swagger** | http://localhost:3001/docs | API documentation |
| **API Endpoint** | http://localhost:3001/api/v1 | REST API |
| **Strapi Admin** | http://localhost:1337/admin | CMS admin panel |
| **MinIO Console** | http://localhost:9001 | Object storage UI |
| **Mailhog** | http://localhost:8025 | Email testing UI |

## 📋 Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 8.0.0
- **Docker** & **Docker Compose**

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd Frontend/slms
pnpm install
```

### 2. Build Shared Package

```bash
pnpm build:shared
```

### 3. Start Infrastructure

```bash
pnpm dev:infra
```

Wait ~30 seconds for all services to start. Verify with:
```bash
docker ps
```

### 4. Setup Database

```bash
# Run migrations
pnpm db:migrate

# Seed initial data (roles, permissions, notification rules)
pnpm db:seed
```

### 5. Configure Environment Files

```bash
# API
cp apps/api/env.example apps/api/.env

# CMS (generate secrets for production)
cp apps/cms/env.example apps/cms/.env

# Web
cp apps/web-public/env.example apps/web-public/.env.local
```

### 6. Start Development

```bash
# Start all services concurrently
pnpm dev
```

This starts:
- **API** on http://localhost:3001
- **CMS** on http://localhost:1337
- **Web** on http://localhost:3000

> ⚠️ **First time with Strapi?** Visit http://localhost:1337/admin to create your admin user.

## 📜 Available Commands

### Development

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start API + CMS + Web concurrently |
| `pnpm dev:api` | Start only NestJS API |
| `pnpm dev:cms` | Start only Strapi CMS |
| `pnpm dev:web` | Start only Next.js web portal |

### Infrastructure

| Command | Description |
|---------|-------------|
| `pnpm dev:infra` | Start Docker services (postgres, redis, minio, mailhog) |
| `pnpm dev:infra:logs` | View infrastructure logs |
| `pnpm dev:infra:down` | Stop infrastructure |
| `pnpm dev:infra:reset` | Stop and remove all data (volumes) |

### Database

| Command | Description |
|---------|-------------|
| `pnpm db:migrate` | Run Prisma migrations (production) |
| `pnpm db:migrate:dev` | Run Prisma migrations (development) |
| `pnpm db:seed` | Seed database with initial data |
| `pnpm db:studio` | Open Prisma Studio GUI |
| `pnpm db:generate` | Regenerate Prisma client |
| `pnpm db:reset` | Reset database (drops all data!) |

### Build & Quality

| Command | Description |
|---------|-------------|
| `pnpm build` | Build all applications |
| `pnpm build:shared` | Build shared package |
| `pnpm lint` | Run ESLint on all apps |
| `pnpm format` | Format code with Prettier |
| `pnpm typecheck` | Run TypeScript checks |
| `pnpm clean` | Clean all build artifacts |

## 🔧 Configuration

### Infrastructure Services

| Service | Port | Credentials |
|---------|------|-------------|
| PostgreSQL | 5544 | user: `slms`, password: `slms`, db: `slms` |
| Redis | 6379 | (no auth) |
| MinIO API | 9000 | access: `minioadmin`, secret: `minioadmin` |
| MinIO Console | 9001 | access: `minioadmin`, secret: `minioadmin` |
| Mailhog SMTP | 1025 | (no auth) |
| Mailhog UI | 8025 | (no auth) |

### Environment Variables

**API (`apps/api/.env`):**
```env
PORT=3001
DATABASE_URL="postgresql://slms:slms@localhost:5544/slms?schema=public"
JWT_SECRET=your-secret-key
STRAPI_URL=http://localhost:1337
STRAPI_API_TOKEN=your-strapi-api-token
```

**CMS (`apps/cms/.env`):**
```env
PORT=1337
DATABASE_HOST=localhost
DATABASE_PORT=5544
DATABASE_NAME=slms
DATABASE_USERNAME=slms
DATABASE_PASSWORD=slms
```

**Web (`apps/web-public/.env.local`):**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

## 🔍 Troubleshooting

### Port Conflicts

If you see "port already in use" errors:

#### Check what's using a port:

**Windows (PowerShell):**
```powershell
# Check port 3000 (Web)
netstat -ano | findstr :3000

# Check port 3001 (API)
netstat -ano | findstr :3001

# Check port 1337 (Strapi)
netstat -ano | findstr :1337

# Check port 5544 (PostgreSQL)
netstat -ano | findstr :5544
```

**Linux/macOS:**
```bash
# Check any port
lsof -i :3000
```

#### Kill a process using a port:

**Windows (PowerShell as Admin):**
```powershell
# Replace <PID> with the process ID from netstat
taskkill /PID <PID> /F
```

**Linux/macOS:**
```bash
kill -9 <PID>
```

#### Change default ports:

If you can't free a port, modify the environment files:

```env
# apps/api/.env - change API port
PORT=3002

# apps/web-public/.env.local - update API URL if API port changed
NEXT_PUBLIC_API_URL=http://localhost:3002/api/v1

# apps/web-public/package.json - change web port
"dev": "next dev -p 3010"
```

### Database Connection Issues

1. **Verify PostgreSQL is running:**
   ```bash
   docker ps | grep postgres
   ```

2. **Check PostgreSQL logs:**
   ```bash
   docker logs slms-postgres
   ```

3. **Test connection:**
   ```bash
   docker exec -it slms-postgres psql -U slms -d slms -c "SELECT 1"
   ```

4. **Reset database if corrupted:**
   ```bash
   pnpm dev:infra:reset
   pnpm dev:infra
   pnpm db:migrate
   pnpm db:seed
   ```

### Strapi Issues

1. **First-time setup:**
   - Visit http://localhost:1337/admin
   - Create admin user
   - Go to Settings → API Tokens → Create new token
   - Copy token to `apps/api/.env` as `STRAPI_API_TOKEN`

2. **Strapi won't start:**
   ```bash
   # Clear Strapi cache
   cd apps/cms
   rm -rf .cache .tmp
   pnpm develop
   ```

3. **Database schema mismatch:**
   ```bash
   # Run Strapi migrations
   cd apps/cms
   pnpm strapi database:migrate
   ```

### Redis Connection Issues

1. **Verify Redis is running:**
   ```bash
   docker ps | grep redis
   ```

2. **Test connection:**
   ```bash
   docker exec -it slms-redis redis-cli ping
   # Should return: PONG
   ```

### MinIO Issues

1. **Bucket not created:**
   - Visit http://localhost:9001
   - Login with `minioadmin` / `minioadmin`
   - Create bucket named `slms-docs` manually
   - Set bucket policy to "public" for read access

2. **File uploads failing:**
   - Check Strapi logs for S3 errors
   - Verify MinIO credentials in `apps/cms/.env`

### Common Fixes

```bash
# Nuclear option: reset everything
pnpm dev:infra:reset
pnpm clean
pnpm install
pnpm build:shared
pnpm dev:infra
sleep 10  # Wait for services
pnpm db:migrate
pnpm db:seed
pnpm dev
```

## 📁 Project Structure

```
slms/
├── apps/
│   ├── api/                    # NestJS Backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Database schema
│   │   │   └── seed.ts         # Seed data
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── auth/       # JWT authentication
│   │       │   ├── users/      # User management
│   │       │   ├── roles/      # RBAC
│   │       │   ├── strapi/     # Strapi client
│   │       │   ├── notifications/
│   │       │   ├── audit-logs/
│   │       │   └── notification-engine/
│   │       └── main.ts
│   │
│   ├── cms/                    # Strapi CMS
│   │   ├── config/
│   │   │   ├── database.ts     # PostgreSQL config
│   │   │   └── plugins.ts      # S3/MinIO upload
│   │   └── src/api/            # Content types
│   │       ├── category/
│   │       ├── document/
│   │       ├── certification/
│   │       ├── license/
│   │       ├── grievance-case/
│   │       └── traceability-*/
│   │
│   └── web-public/             # Next.js Portal
│       └── src/
│           ├── app/            # App Router pages
│           │   ├── page.tsx          # Home
│           │   ├── policies/
│           │   ├── certifications/
│           │   ├── licenses/
│           │   ├── library/          # Document library
│           │   ├── grievance/
│           │   └── traceability/
│           ├── components/
│           └── lib/
│               └── api.ts      # API client
│
├── packages/
│   └── shared/                 # Shared code
│       └── src/
│           ├── types/
│           ├── dto/
│           └── constants/
│
└── infra/
    ├── docker-compose.yml      # Dev infrastructure
    ├── Makefile               # Shortcut commands
    └── init-db.sql            # DB initialization
```

## 🔐 Default Seeded Data

After running `pnpm db:seed`:

**Roles:**
- SustainabilityAdmin (full access)
- Legal (legal documents)
- Auditor (audit access)
- PublicReader (public content only)

**Notification Rules:**
- 90 days before expiry (EMAIL + INAPP)
- 60 days before expiry (EMAIL + INAPP)
- 30 days before expiry (EMAIL + INAPP)

## 📖 API Documentation

Visit http://localhost:3001/docs for interactive Swagger documentation.

**Public Endpoints (no auth):**
- `GET /api/v1/public/policies`
- `GET /api/v1/public/certifications`
- `GET /api/v1/public/licenses`
- `GET /api/v1/public/library`
- `GET /api/v1/public/grievances`
- `GET /api/v1/public/traceability`

**Admin Endpoints (JWT required):**
- `POST /api/v1/auth/login`
- `CRUD /api/v1/admin/documents`
- `CRUD /api/v1/admin/certifications`
- `GET /api/v1/admin/audit-logs`
- `GET /api/v1/admin/notifications`

## 🤝 Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Run `pnpm lint && pnpm typecheck`
4. Submit a pull request

## 📄 License

UNLICENSED - Proprietary

---

**SLMS** - Streamlining sustainability management for a greener future 🌱
