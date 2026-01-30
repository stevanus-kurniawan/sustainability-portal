# API Verification Report — Admin CMS

**Base URL:** `{API_BASE}/api/v1` (e.g. `http://localhost:3001/api/v1`)  
**Swagger:** `{API_BASE}/docs`

---

## 1. Content modules → API mapping

| Admin section | Content type | Backend model / API | Endpoints | Notes |
|---------------|-------------|---------------------|-----------|--------|
| **A) Policies** | Policies | Document (type POLICY) | `GET/POST/PUT/DELETE` `/admin/documents` with `type=POLICY` | List: `?type=POLICY&page=&pageSize=`; search/status/categoryId added below. |
| **B) Procedure → SOP** | SOP | Document (type GENERAL) | Same, filter by `type=GENERAL` and `categoryId` = category "SOP" | Use categories to distinguish SOP vs Form. |
| **B) Procedure → Form** | Form | Document (type GENERAL) | Same, `type=GENERAL` + category "Form" | |
| **C) Sustainability → Report** | Sustainability Report | Document (type GENERAL) | Same, `type=GENERAL` + category "Sustainability Report" (or slug) | |
| **C) Sustainability → Certificate** | Certificate | Certification | `GET/POST/PUT/DELETE` `/certifications` | Pagination: `?page=&pageSize=`; public has `?status=&search=`. |
| **D) Compliance → National** | National | Document (type GENERAL) | `/admin/documents` with `type=GENERAL` + category "National" | |
| **D) Compliance → International** | International | Document (type GENERAL) | Same + category "International" | |
| **D) Compliance → Standard** | Standard | Document (type GENERAL) | Same + category "Standard" | |
| **D) Compliance → License** | License | License | `GET/POST/PUT/DELETE` `/licenses` | Pagination: `?page=&pageSize=`. |
| **E) Grievance** | Grievance cases | GrievanceCase | `GET/POST/PUT/DELETE` `/admin/grievances` | List: `?page=&pageSize=`; public has `?status=&category=`. |

---

## 2. Endpoints summary

### Documents (admin)

- **List:** `GET /admin/documents?page=&pageSize=&type=&search=&isPublished=&categoryId=`
  - **Existing:** `page`, `pageSize`, `type`.
  - **Added:** `search` (title), `isPublished` (boolean), `categoryId` (number).
- **Detail:** `GET /admin/documents/:id`
- **Create:** `POST /admin/documents` — body: `title`, `type`, `description?`, `isPublic?`, `isPublished?`, `categoryId?`, `tagIds?`
- **Update:** `PUT /admin/documents/:id` — same shape
- **Delete:** `DELETE /admin/documents/:id`

**Response shape:** `{ data: Array<{ id, attributes: { title, type, description, isPublic, isPublished, publishedAt, createdAt, category, tags, currentVersion } }>, meta: { pagination } }`

### Categories (admin)

- **List:** `GET /admin/categories`
- **One:** `GET /admin/categories/:id`
- **Create:** `POST /admin/categories` — body: `name`, `slug`, `isPublic?`, `displayOrder?`
- **Update:** `PUT /admin/categories/:id`
- **Delete:** `DELETE /admin/categories/:id`

Used for filtering documents (SOP, Form, Sustainability Report, National, International, Standard). Admin can create categories if missing.

### Tags (admin)

- **List:** `GET /admin/tags`
- **Create / Update / Delete** — for document tagging.

### Certifications

- **List:** `GET /certifications?page=&pageSize=`
- **Detail:** `GET /certifications/:id`
- **Create:** `POST /certifications` — body: `name`, `issuer?`, `certificateNo?`, `issuedDate?`, `expiryDate?`, `documentId?`
- **Update:** `PUT /certifications/:id`
- **Delete:** `DELETE /certifications/:id`

Response: Strapi-like `{ id, attributes }`; list: `{ data, meta: { pagination } }`.

### Licenses

- **List:** `GET /licenses?page=&pageSize=`
- **Detail:** `GET /licenses/:id`
- **Create:** `POST /licenses` — body: `name`, `authority?`, `licenseNo?`, `issuedDate?`, `expiryDate?`, `documentId?`
- **Update:** `PUT /licenses/:id`
- **Delete:** `DELETE /licenses/:id`

### Grievances (admin)

- **List:** `GET /admin/grievances?page=&pageSize=`
- **Detail:** `GET /admin/grievances/:id`
- **Create:** `POST /admin/grievances` — body: `caseNo`, `status?`, `category?`, `receivedDate`, `publicSummary?`, `evidenceDocumentId?`
- **Update:** `PUT /admin/grievances/:id`
- **Delete:** `DELETE /admin/grievances/:id`

### Upload (admin)

- **Presign:** `POST /admin/upload/presign` — body: `fileName`, `contentType?` → `{ url, key }` for file upload.

---

## 3. Gaps and changes

| Gap | Resolution |
|-----|------------|
| Documents list had no search / status / category filter | Add query params: `search`, `isPublished`, `categoryId` to `GET /admin/documents` and to `DocumentsService.findAllAdmin`. |
| Admin CRUD uses **user** JWT (JwtAuthGuard); admin UI uses **admin** cookie (`admin_access_token`) | Use **AdminAuthGuard** on all admin CRUD and on certifications/licenses so cookie (or Bearer from cookie) is validated with admin JWT. |

No new content-type endpoints or DB models were required; DocumentType (POLICY, GENERAL, etc.) and Category suffice for Policies, Procedure (SOP/Form), Sustainability Report, and Compliance (National/International/Standard). Certifications and Licenses are separate models; Grievance uses GrievanceCase.

---

## 4. Auth

- **Admin login:** `POST /admin-auth/login` — body: `email`, `password`. Sets cookie `admin_access_token`.
- **Admin me:** `GET /admin-auth/me` — requires cookie (or Bearer with admin token).
- **Admin logout:** `POST /admin-auth/logout` — clears cookie.

Admin UI calls backend via Next.js API routes that read `admin_access_token` and send `Authorization: Bearer <token>`. Backend must use **AdminAuthGuard** (admin-jwt strategy) on admin and cert/licenses routes so this token is accepted.

---

## 5. Feature → endpoint map (Admin UI)

| Feature | List | Detail | Create | Update | Delete |
|---------|------|--------|--------|--------|--------|
| Policies | GET /admin/documents?type=POLICY | GET /admin/documents/:id | POST /admin/documents | PUT /admin/documents/:id | DELETE /admin/documents/:id |
| Procedure SOP | GET /admin/documents?type=GENERAL&categoryId=X | GET /admin/documents/:id | POST /admin/documents | PUT /admin/documents/:id | DELETE /admin/documents/:id |
| Procedure Form | Same with categoryId Form | Same | Same | Same | Same |
| Sustainability Report | Same with categoryId reports | Same | Same | Same | Same |
| Certificate | GET /certifications | GET /certifications/:id | POST /certifications | PUT /certifications/:id | DELETE /certifications/:id |
| Compliance National | GET /admin/documents?type=GENERAL&categoryId=Y | Same as documents | Same | Same | Same |
| Compliance International | Same with categoryId international | Same | Same | Same | Same |
| Compliance Standard | Same with categoryId standard | Same | Same | Same | Same |
| License | GET /licenses | GET /licenses/:id | POST /licenses | PUT /licenses/:id | DELETE /licenses/:id |
| Grievance | GET /admin/grievances | GET /admin/grievances/:id | POST /admin/grievances | PUT /admin/grievances/:id | DELETE /admin/grievances/:id |

Category IDs (X, Y) are resolved from `GET /admin/categories` by slug (e.g. `sop`, `form`, `sustainability-report`, `national`, `international`, `standard`).

**Categories for document filtering:** For Procedure (SOP, Form), Sustainability Report, and Compliance (National, International, Standard) to show filtered lists, create categories with these slugs via `POST /admin/categories`: `sop`, `form`, `sustainability-report`, `national`, `international`, `standard`. The Admin UI will show a hint if a category slug is missing.
