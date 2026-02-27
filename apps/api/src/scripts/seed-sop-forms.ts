/**
 * Seed SOP/Form (GENERAL) documents via the same DocumentsService.create path as admin CRUD.
 * Idempotent: re-run skips existing documents by title.
 * Use --dry-run to log what would be created without writing.
 *
 * Category: resolved by slug "sop" or "form", or override with --categoryId=<number>.
 * Actor: same as Policy seed (SEED_ADMIN_EMAIL / --admin-email).
 *
 * Run: npm run seed:sop-forms [-- --dry-run] [-- --categoryId=7] [-- --admin-email=...]
 * Or:  npx ts-node src/scripts/seed-sop-forms.ts [--dry-run] [--categoryId=7] [--actorUserId=<admin-uuid>]
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DocumentsService } from '../modules/documents/documents.service';
import { PrismaService } from '../prisma/prisma.service';

const SOP_FORM_TITLES = [
  'FORM-D02-SUS.01-01: Supplier Onboarding',
  'FORM-D02-SUS.01-02: Supplier Self-Declaration',
  'FORM-D02-SUS.01-03: Supplier Due Diligence',
  'FORM-D02-SUS.01-04: Environmental Impact Assessment',
  'FORM-D02-SUS.01-05: Waste Management Declaration',
  'FORM-D02-SUS.01-06: Occupational Health & Safety Checklist',
  'FORM-D02-SUS.01-07: Anti-Bribery & Corruption Acknowledgement',
  'FORM-D02-SUS.01-08: Worker Grievance Submission Form',
  'FORM-D02-SUS.01-09: Supplier Performance Evaluation',
  'FORM-D02-SUS.01-10: Risk Assessment & Mitigation Plan',
  'FORM-D02-SUS.01-11: Compliance Self-Assessment',
  'FORM-D02-SUS.01-12: Traceability Data Submission',
  'FORM-D02-SUS.01-13: Corrective Action Plan',
  'FORM-D02-SUS.01-14: Sustainability Training Attendance',
  'FORM-D02-SUS.01-15: Legal Compliance Declaration',
  'FORM-D02-SUS.01-16: Site Inspection Report',
  'FORM-D02-SUS.01-17: Incident Reporting Form',
  'FORM-D02-SUS.01-18: Annual Sustainability Review',
];

/** Slug(s) to try when resolving category (first found wins). */
const DEFAULT_CATEGORY_SLUGS = ['sop', 'form'];

function parseArgs(): {
  dryRun: boolean;
  adminEmail: string;
  categoryId: number | undefined;
  actorUserId: string | undefined;
} {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const emailIdx = args.indexOf('--admin-email');
  const adminEmail =
    emailIdx >= 0 && args[emailIdx + 1]
      ? args[emailIdx + 1]
      : process.env.SEED_ADMIN_EMAIL || 'admin@energi-up.com';

  let categoryId: number | undefined;
  const categoryArg = args.find((a) => a.startsWith('--categoryId='));
  if (categoryArg) {
    const value = categoryArg.split('=')[1];
    const n = value ? parseInt(value, 10) : NaN;
    if (!Number.isNaN(n)) categoryId = n;
  }

  let actorUserId: string | undefined;
  const actorArg = args.find((a) => a.startsWith('--actorUserId='));
  if (actorArg) {
    const value = actorArg.split('=')[1]?.trim();
    if (value) actorUserId = value;
  }
  if (!actorUserId && process.env.SYSTEM_USER_ID) actorUserId = process.env.SYSTEM_USER_ID;

  return { dryRun, adminEmail, categoryId, actorUserId };
}

/** Derive unique key code = text before ":" trimmed (e.g. "FORM-D02-SUS.01-01"). */
function codeFromTitle(title: string): string {
  const idx = title.indexOf(':');
  return (idx >= 0 ? title.slice(0, idx).trim() : title.trim()) || title;
}

async function seedSopForms() {
  const { dryRun, adminEmail, categoryId: categoryIdArg, actorUserId } = parseArgs();

  if (dryRun) {
    console.log('🔍 DRY RUN – no changes will be written.\n');
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: dryRun ? ['error'] : ['log', 'error'],
  });

  const documentsService = app.get(DocumentsService);
  const prisma = app.get(PrismaService);

  try {
    // 1) Resolve actor (admin) for created_by_id / updated_by_id
    let admin: { id: string; email: string } | null = null;
    if (actorUserId) {
      admin = await prisma.admin.findFirst({
        where: { id: actorUserId, status: 'ACTIVE' },
      });
      if (!admin) {
        throw new Error(
          `Admin not found for actorUserId "${actorUserId}". Use a valid admin id (UUID) or omit to use SEED_ADMIN_EMAIL / --admin-email.`,
        );
      }
    }
    if (!admin) {
      admin = await prisma.admin.findFirst({
        where: { email: adminEmail.trim().toLowerCase(), status: 'ACTIVE' },
      });
    }
    if (!admin) {
      throw new Error(
        `Admin not found for email "${adminEmail}". Create an admin (e.g. run prisma seed) or set SEED_ADMIN_EMAIL / --admin-email or --actorUserId=<admin-uuid>.`,
      );
    }
    console.log(`👤 Actor: ${admin.email} (id: ${admin.id})\n`);

    // 2) Resolve category: by --categoryId or by slug (sop / form)
    let category: { id: number; name: string; slug: string } | null = null;

    if (categoryIdArg != null) {
      category = await prisma.category.findUnique({
        where: { id: categoryIdArg },
      });
      if (!category) {
        throw new Error(
          `Category with id=${categoryIdArg} does not exist. Do not create categories silently; create it first (e.g. run prisma seed) or use a valid category id.`,
        );
      }
      console.log(`📁 Category: id=${category.id} (${category.name}) [from --categoryId]\n`);
    } else {
      for (const slug of DEFAULT_CATEGORY_SLUGS) {
        category = await prisma.category.findFirst({
          where: { slug: slug.toLowerCase() },
        });
        if (category) {
          console.log(`📁 Category: id=${category.id} (${category.name}) [slug: ${category.slug}]\n`);
          break;
        }
      }
      if (!category) {
        throw new Error(
          `No category found for slugs: ${DEFAULT_CATEGORY_SLUGS.join(', ')}. Create categories (e.g. run prisma seed) or pass --categoryId=<number>.`,
        );
      }
    }

    const categoryId = category.id;

    let createdCount = 0;
    let skippedCount = 0;
    const createdTitles: string[] = [];
    const skippedTitles: string[] = [];

    for (const title of SOP_FORM_TITLES) {
      const existing = await prisma.document.findFirst({
        where: { title },
      });

      if (existing) {
        console.log(`  ⏭️  Skip (exists): ${title}`);
        skippedCount++;
        skippedTitles.push(title);
        continue;
      }

      if (dryRun) {
        console.log(`  📄 Would create: ${title} [code: ${codeFromTitle(title)}]`);
        createdCount++;
        createdTitles.push(title);
        continue;
      }

      const payload = {
        title,
        description: title,
        type: 'GENERAL' as const,
        isPublic: true,
        isPublished: true,
        categoryId,
      };

      const result = await documentsService.create(payload, admin.id);
      const documentId =
        typeof (result as { id?: number })?.id === 'number' ? (result as { id: number }).id : null;

      if (documentId != null) {
        await prisma.auditLog.create({
          data: {
            userEmail: admin.email,
            action: 'CREATE',
            entityType: 'documents',
            entityId: String(documentId),
            metadata: {
              method: 'POST',
              path: '/admin/documents',
              requestBody: payload,
              timestamp: new Date().toISOString(),
              responseId: documentId,
              success: true,
              source: 'seed-sop-forms',
            },
          },
        });
      }

      console.log(`  ✅ Created: ${title} (id=${documentId})`);
      createdCount++;
      createdTitles.push(title);
    }

    // Summary

    console.log('\n' + '='.repeat(50));
    console.log(`Done. Created: ${createdCount}, Skipped: ${skippedCount}`);
    if (createdTitles.length) {
      console.log('Created:', createdTitles.join('; '));
    }
    if (skippedTitles.length) {
      console.log('Skipped:', skippedTitles.join('; '));
    }
    if (dryRun) {
      console.log('(Dry run – no records were written.)');
    }
  } finally {
    await app.close();
  }
}

seedSopForms()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  });
