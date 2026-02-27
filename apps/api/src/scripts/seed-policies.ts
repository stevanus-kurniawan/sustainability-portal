/**
 * Seed initial Policy (GENERAL) documents via the same DocumentsService.create path as admin CRUD.
 * Idempotent: re-run skips existing documents by title.
 * Use --dry-run to log what would be created without writing.
 *
 * Run: npm run seed:policies [-- --dry-run]
 * Or:  npx ts-node -r tsconfig-paths/register src/scripts/seed-policies.ts [--dry-run]
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DocumentsService } from '../modules/documents/documents.service';
import { PrismaService } from '../prisma/prisma.service';

const POLICY_TITLES = [
  'POL-DWS.01: Code of Conduct & Business Integrity Policy',
  'POL-DWS.02: Sustainability & Responsible Business Policy',
  'POL-DWS.03: Human Rights & Labour Policy',
  'POL-DWS.04: Health, Safety, Environment & Quality Policy',
  'POL-DWS.05: Supplier Code of Conduct Policy',
  'POL-DWS.06: Grievance Mechanism Policy',
  'POL-DWS.07: Compliance, Risk & Due Diligence Policy',
];

const CATEGORY_ID = 7;

function parseArgs(): { dryRun: boolean; adminEmail: string } {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const emailIdx = args.indexOf('--admin-email');
  const adminEmail =
    emailIdx >= 0 && args[emailIdx + 1]
      ? args[emailIdx + 1]
      : process.env.SEED_ADMIN_EMAIL || 'admin@energi-up.com';
  return { dryRun, adminEmail };
}

async function seedPolicies() {
  const { dryRun, adminEmail } = parseArgs();

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
    const admin = await prisma.admin.findFirst({
      where: { email: adminEmail.trim().toLowerCase(), status: 'ACTIVE' },
    });
    if (!admin) {
      throw new Error(
        `Admin not found for email "${adminEmail}". Create an admin (e.g. run prisma seed) or set SEED_ADMIN_EMAIL / --admin-email.`,
      );
    }
    console.log(`👤 Actor: ${admin.email} (id: ${admin.id})\n`);

    // 2) Validate category_id = 7 exists
    const category = await prisma.category.findUnique({
      where: { id: CATEGORY_ID },
    });
    if (!category) {
      throw new Error(
        `Category with id=${CATEGORY_ID} does not exist. Create it first (e.g. run prisma seed) or use a valid category id.`,
      );
    }
    console.log(`📁 Category: id=${CATEGORY_ID} (${category.name})\n`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const title of POLICY_TITLES) {
      const existing = await prisma.document.findFirst({
        where: { title },
      });

      if (existing) {
        console.log(`  ⏭️  Skip (exists): ${title}`);
        skippedCount++;
        continue;
      }

      if (dryRun) {
        console.log(`  📄 Would create: ${title}`);
        createdCount++;
        continue;
      }

      const payload = {
        title,
        description: title,
        type: 'GENERAL' as const,
        isPublic: true,
        isPublished: true,
        categoryId: CATEGORY_ID,
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
              source: 'seed-policies',
            },
          },
        });
      }

      console.log(`  ✅ Created: ${title} (id=${documentId})`);
      createdCount++;
    }

    console.log('\n' + '='.repeat(50));
    console.log(`Done. Created: ${createdCount}, Skipped: ${skippedCount}`);
    if (dryRun) {
      console.log('(Dry run – no records were written.)');
    }
  } finally {
    await app.close();
  }
}

seedPolicies()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  });
