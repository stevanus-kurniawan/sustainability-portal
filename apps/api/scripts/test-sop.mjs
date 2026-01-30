/**
 * Test script: create 1 SOP document and verify it appears in the admin list.
 * Run from repo root: node apps/api/scripts/test-sop.mjs
 * Requires: API running at API_URL (default http://localhost:3001/api/v1),
 *            admin user admin@energi-up.com / Admin123! (or ADMIN_SEED_PASSWORD).
 */

const API_URL = process.env.API_URL || 'http://localhost:3001/api/v1';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@energi-up.com';
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD || 'Admin123!';

function extractTokenFromSetCookie(setCookieHeader) {
  if (!setCookieHeader) return null;
  const parts = setCookieHeader.split(';')[0].trim().split('=');
  if (parts[0] === 'admin_access_token' && parts[1]) return parts[1];
  return null;
}

async function main() {
  let sopCategoryId;
  console.log('Testing SOP flow: login -> get/create category "sop" -> create document -> list\n');

  // 1. Login
  const loginRes = await fetch(`${API_URL}/admin-auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!loginRes.ok) {
    const err = await loginRes.text();
    console.error('Login failed:', loginRes.status, err);
    process.exit(1);
  }
  const setCookie = loginRes.headers.get('set-cookie');
  const token = extractTokenFromSetCookie(setCookie);
  if (!token) {
    console.error('Could not extract admin_access_token from login response. Set-Cookie:', setCookie);
    process.exit(1);
  }
  console.log('1. Login OK');

  const authHeaders = {
    Cookie: `admin_access_token=${token}`,
    'Content-Type': 'application/json',
  };

  // 2. Get categories and find "sop"
  const categoriesRes = await fetch(`${API_URL}/admin/categories`, { headers: authHeaders });
  if (!categoriesRes.ok) {
    console.error('Categories fetch failed:', categoriesRes.status, await categoriesRes.text());
    process.exit(1);
  }
  const categories = await categoriesRes.json();
  const arr = Array.isArray(categories) ? categories : categories?.data ?? categories ?? [];
  const getSlug = (c) => (c.attributes && c.attributes.slug) || c.slug || '';
  const sopCategory = arr.find((c) => getSlug(c).toLowerCase() === 'sop');
  if (!sopCategory) {
    // Create category "sop"
    const createCatRes = await fetch(`${API_URL}/admin/categories`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'SOP (Standard Operating Procedures)',
        slug: 'sop',
        isPublic: true,
        displayOrder: 7,
      }),
    });
    if (!createCatRes.ok) {
      console.error('Create category failed:', createCatRes.status, await createCatRes.text());
      process.exit(1);
    }
    const created = await createCatRes.json();
    sopCategoryId = created.id;
    console.log('2. Category "sop" created, id:', sopCategoryId);
  } else {
    sopCategoryId = sopCategory.id;
    console.log('2. Category "sop" found, id:', sopCategoryId);
  }

  // 3. Create one GENERAL document (SOP) with that category
  const createDocRes = await fetch(`${API_URL}/admin/documents`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'Test SOP Document',
      type: 'GENERAL',
      description: 'Created by test script to verify SOP list.',
      isPublic: true,
      isPublished: true,
      categoryId: sopCategoryId,
    }),
  });
  if (!createDocRes.ok) {
    console.error('Create document failed:', createDocRes.status, await createDocRes.text());
    process.exit(1);
  }
  const doc = await createDocRes.json();
  const docId = doc.id;
  console.log('3. SOP document created, id:', docId);

  // 4. List documents with type=GENERAL and categoryId=sop
  const listRes = await fetch(
    `${API_URL}/admin/documents?type=GENERAL&categoryId=${sopCategoryId}&page=1&pageSize=20`,
    { headers: authHeaders }
  );
  if (!listRes.ok) {
    console.error('List documents failed:', listRes.status, await listRes.text());
    process.exit(1);
  }
  const listData = await listRes.json();
  const items = listData.data || [];
  const found = items.some((d) => d.id === docId);
  if (!found) {
    console.error('4. FAIL: New document not found in list. Total in list:', items.length);
    process.exit(1);
  }
  console.log('4. List contains the new SOP document. Total:', items.length);

  console.log('\nAll steps passed. SOP create + list flow is working.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
