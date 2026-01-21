# SLMS CMS - Strapi v4 Headless CMS

Content Management System for the Sustainability Certification and Licensing Management System.

## 🚀 Quick Start

### Prerequisites

1. **Infrastructure running** (PostgreSQL, MinIO)
   ```bash
   cd ../../../infra
   make up
   ```

2. **Dependencies installed**
   ```bash
   cd ..
   pnpm install
   ```

### Configuration

1. **Copy environment file:**
   ```bash
   cp env.example .env
   ```

2. **Generate secure secrets:**
   ```bash
   # Run this 5 times for each secret in .env
   openssl rand -base64 32
   ```

3. **Update `.env`** with generated secrets for:
   - `APP_KEYS` (4 comma-separated keys)
   - `ADMIN_JWT_SECRET`
   - `API_TOKEN_SALT`
   - `TRANSFER_TOKEN_SALT`
   - `JWT_SECRET`

### Run Development Server

```bash
# From monorepo root
pnpm --filter @slms/cms develop

# Or from this directory
pnpm develop
```

**URLs:**
- Admin Panel: http://localhost:1337/admin
- API: http://localhost:1337/api

> On first run, you'll be prompted to create an admin user.

## 📦 File Storage (S3-Compatible)

Strapi is configured to use S3-compatible object storage for file uploads.
Supports: **MinIO** (local dev), **Alibaba Cloud OSS**, and other S3-compatible services.

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `STORAGE_ENDPOINT` | `http://localhost:9000` | Storage API endpoint |
| `STORAGE_BUCKET` | `slms-docs` | Bucket name |
| `STORAGE_ACCESS_KEY_ID` | `minioadmin` | Access key ID |
| `STORAGE_ACCESS_KEY_SECRET` | `minioadmin` | Access key secret |
| `STORAGE_REGION` | `us-east-1` | Region |
| `STORAGE_FORCE_PATH_STYLE` | `true` | Path style (true for MinIO, false for Alibaba OSS) |
| `STORAGE_BASE_URL` | (auto) | Base URL for file access (optional) |

### Local Development (MinIO)

The infrastructure docker-compose automatically:
1. Starts MinIO on ports 9000 (API) and 9001 (Console)
2. Creates the `slms-docs` bucket on startup

```env
STORAGE_ENDPOINT=http://localhost:9000
STORAGE_BUCKET=slms-docs
STORAGE_ACCESS_KEY_ID=minioadmin
STORAGE_ACCESS_KEY_SECRET=minioadmin
STORAGE_REGION=us-east-1
STORAGE_FORCE_PATH_STYLE=true
```

**MinIO Console:** http://localhost:9001
- Username: `minioadmin`
- Password: `minioadmin`

### Production (Alibaba Cloud OSS)

```env
STORAGE_ENDPOINT=https://oss-ap-southeast-5.aliyuncs.com
STORAGE_BUCKET=your-bucket-name
STORAGE_ACCESS_KEY_ID=your-aliyun-access-key-id
STORAGE_ACCESS_KEY_SECRET=your-aliyun-access-key-secret
STORAGE_REGION=oss-ap-southeast-5
STORAGE_FORCE_PATH_STYLE=false
STORAGE_BASE_URL=https://your-bucket-name.oss-ap-southeast-5.aliyuncs.com
```

**Alibaba Cloud OSS Regions:**
| Region | Endpoint |
|--------|----------|
| China (Hangzhou) | oss-cn-hangzhou.aliyuncs.com |
| China (Shanghai) | oss-cn-shanghai.aliyuncs.com |
| Singapore | oss-ap-southeast-1.aliyuncs.com |
| Indonesia (Jakarta) | oss-ap-southeast-5.aliyuncs.com |
| US West | oss-us-west-1.aliyuncs.com |

### How It Works

1. When you upload a file in Strapi admin:
   - File is uploaded to the configured storage bucket
   - Strapi stores the file metadata in PostgreSQL
   - File URL: `{STORAGE_BASE_URL}/{filename}`

2. Files are served directly from object storage (not through Strapi)

### Troubleshooting

**Images not displaying?**
- Ensure storage service is accessible
- Check bucket exists and has public read access
- Verify CSP settings in `config/middlewares.ts`

**Upload errors?**
- Check storage service logs
- Verify credentials in `.env`
- For Alibaba OSS: ensure bucket policy allows public read
- For MinIO: `docker logs slms-minio`

## 🗄️ Database

### Connection

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_HOST` | `localhost` | PostgreSQL host |
| `DATABASE_PORT` | `5544` | PostgreSQL port |
| `DATABASE_NAME` | `slms` | Database name |
| `DATABASE_USERNAME` | `slms` | Database user |
| `DATABASE_PASSWORD` | `slms` | Database password |

### Content Types

See [SCHEMAS.md](./SCHEMAS.md) for detailed schema documentation.

| Content Type | API Endpoint | Description |
|--------------|--------------|-------------|
| Category | `/api/categories` | Document categories |
| Tag | `/api/tags` | Document tags |
| Document | `/api/documents` | Central document repository |
| DocumentVersion | `/api/document-versions` | Version history |
| Certification | `/api/certifications` | Sustainability certifications |
| License | `/api/licenses` | Business licenses |
| GrievanceCase | `/api/grievance-cases` | Grievance mechanism |
| GrievanceUpdate | `/api/grievance-updates` | Case updates |
| TraceabilityEntity | `/api/traceability-entities` | Supply chain entities |
| TraceabilityRecord | `/api/traceability-records` | Traceability records |

## 🔐 Security

### API Access

By default, all API endpoints are private. To enable public access:

1. Go to **Settings** > **Users & Permissions** > **Roles**
2. Select **Public** role
3. Enable desired permissions for each content type

### Authentication

For protected endpoints, use Bearer token authentication:

```bash
curl -H "Authorization: Bearer YOUR_API_TOKEN" \
  http://localhost:1337/api/documents
```

Create API tokens in **Settings** > **API Tokens**.

## 📜 Scripts

| Command | Description |
|---------|-------------|
| `pnpm develop` | Start development server (with auto-reload) |
| `pnpm start` | Start production server |
| `pnpm build` | Build admin panel |
| `pnpm strapi` | Run Strapi CLI commands |
| `pnpm clean` | Remove build artifacts |

## 🔧 Configuration Files

| File | Description |
|------|-------------|
| `config/server.ts` | Server configuration (host, port, keys) |
| `config/database.ts` | Database connection settings |
| `config/admin.ts` | Admin panel configuration |
| `config/plugins.ts` | Plugin settings (upload, i18n, etc.) |
| `config/middlewares.ts` | Middleware stack (CORS, CSP, etc.) |

## 📁 Directory Structure

```
apps/cms/
├── config/                 # Configuration files
│   ├── admin.ts
│   ├── database.ts
│   ├── middlewares.ts
│   ├── plugins.ts
│   └── server.ts
├── database/
│   └── migrations/         # Database migrations
├── src/
│   ├── admin/              # Admin panel customization
│   ├── api/                # Content type definitions
│   │   ├── category/
│   │   ├── certification/
│   │   ├── document/
│   │   ├── document-version/
│   │   ├── grievance-case/
│   │   ├── grievance-update/
│   │   ├── license/
│   │   ├── tag/
│   │   ├── traceability-entity/
│   │   └── traceability-record/
│   └── index.ts            # Bootstrap & register hooks
├── env.example             # Environment template
├── package.json
├── SCHEMAS.md              # Content type documentation
└── tsconfig.json
```

## 🌐 API Examples

### List all documents (public)
```bash
curl http://localhost:1337/api/documents
```

### Get document with relations
```bash
curl "http://localhost:1337/api/documents/1?populate=*"
```

### Create a certification (authenticated)
```bash
curl -X POST http://localhost:1337/api/certifications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "data": {
      "name": "ISO 14001",
      "issuer": "ISO",
      "expiryDate": "2025-12-31",
      "status": "ACTIVE"
    }
  }'
```

### Upload a file
```bash
curl -X POST http://localhost:1337/api/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@/path/to/file.pdf"
```

## 🔗 Related Documentation

- [Strapi Documentation](https://docs.strapi.io/)
- [Strapi AWS S3 Provider](https://docs.strapi.io/dev-docs/providers#creating-providers)
- [MinIO Documentation](https://min.io/docs/minio/linux/index.html)
