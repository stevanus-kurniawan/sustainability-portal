import {
  PrismaClient,
  UserStatus,
  NotificationObjectType,
  NotificationChannel,
} from '@prisma/client';

const prisma = new PrismaClient();

// ==========================================
// Seed Data Definitions
// ==========================================

const ROLES = [
  {
    name: 'SustainabilityAdmin',
    description: 'Full access to all sustainability management features',
  },
  {
    name: 'Legal',
    description: 'Access to legal documents, certifications, and compliance',
  },
  {
    name: 'Auditor',
    description: 'Read access to audit and verify compliance records',
  },
  {
    name: 'PublicReader',
    description: 'Read-only access to public documents and information',
  },
];

// Permission domains
const DOMAINS = [
  'users',
  'roles',
  'certifications',
  'licenses',
  'documents',
  'grievances',
  'traceability',
  'notifications',
  'audit_logs',
];

// Generate permissions for each domain
const PERMISSIONS = DOMAINS.flatMap((domain) => [
  {
    code: `${domain}:read`,
    description: `Read access to ${domain}`,
  },
  {
    code: `${domain}:write`,
    description: `Write access to ${domain} (create, update, delete)`,
  },
]);

// Role-Permission mappings
const ROLE_PERMISSIONS: Record<string, string[]> = {
  SustainabilityAdmin: [
    // Full access to everything
    ...DOMAINS.flatMap((d) => [`${d}:read`, `${d}:write`]),
  ],
  Legal: [
    'users:read',
    'certifications:read',
    'certifications:write',
    'licenses:read',
    'licenses:write',
    'documents:read',
    'documents:write',
    'grievances:read',
    'grievances:write',
    'audit_logs:read',
  ],
  Auditor: [
    'users:read',
    'certifications:read',
    'licenses:read',
    'documents:read',
    'grievances:read',
    'traceability:read',
    'audit_logs:read',
  ],
  PublicReader: [
    'certifications:read',
    'licenses:read',
    'documents:read',
    'traceability:read',
  ],
};

// Notification rules: 90, 60, 30 days before expiry for CERTIFICATION and LICENSE
const NOTIFICATION_RULES: Array<{
  objectType: NotificationObjectType;
  daysBeforeExpiry: number;
  channel: NotificationChannel;
}> = [
  // Certification notifications
  { objectType: 'CERTIFICATION', daysBeforeExpiry: 90, channel: 'EMAIL' },
  { objectType: 'CERTIFICATION', daysBeforeExpiry: 90, channel: 'INAPP' },
  { objectType: 'CERTIFICATION', daysBeforeExpiry: 60, channel: 'EMAIL' },
  { objectType: 'CERTIFICATION', daysBeforeExpiry: 60, channel: 'INAPP' },
  { objectType: 'CERTIFICATION', daysBeforeExpiry: 30, channel: 'EMAIL' },
  { objectType: 'CERTIFICATION', daysBeforeExpiry: 30, channel: 'INAPP' },
  // License notifications
  { objectType: 'LICENSE', daysBeforeExpiry: 90, channel: 'EMAIL' },
  { objectType: 'LICENSE', daysBeforeExpiry: 90, channel: 'INAPP' },
  { objectType: 'LICENSE', daysBeforeExpiry: 60, channel: 'EMAIL' },
  { objectType: 'LICENSE', daysBeforeExpiry: 60, channel: 'INAPP' },
  { objectType: 'LICENSE', daysBeforeExpiry: 30, channel: 'EMAIL' },
  { objectType: 'LICENSE', daysBeforeExpiry: 30, channel: 'INAPP' },
];

// ==========================================
// Seed Functions
// ==========================================

async function seedRoles() {
  console.log('📋 Seeding roles...');

  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
    console.log(`  ✅ Role: ${role.name}`);
  }
}

async function seedPermissions() {
  console.log('🔐 Seeding permissions...');

  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: { description: permission.description },
      create: permission,
    });
  }
  console.log(`  ✅ Created ${PERMISSIONS.length} permissions`);
}

async function seedRolePermissions() {
  console.log('🔗 Linking role permissions...');

  for (const [roleName, permissionCodes] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      console.log(`  ⚠️ Role not found: ${roleName}`);
      continue;
    }

    for (const code of permissionCodes) {
      const permission = await prisma.permission.findUnique({ where: { code } });
      if (!permission) {
        console.log(`  ⚠️ Permission not found: ${code}`);
        continue;
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }

    console.log(`  ✅ ${roleName}: ${permissionCodes.length} permissions`);
  }
}

async function seedNotificationRules() {
  console.log('🔔 Seeding notification rules...');

  for (const rule of NOTIFICATION_RULES) {
    await prisma.notificationRule.upsert({
      where: {
        objectType_daysBeforeExpiry_channel: {
          objectType: rule.objectType,
          daysBeforeExpiry: rule.daysBeforeExpiry,
          channel: rule.channel,
        },
      },
      update: { isActive: true },
      create: {
        ...rule,
        isActive: true,
      },
    });
  }

  console.log(`  ✅ Created ${NOTIFICATION_RULES.length} notification rules`);
  console.log('     - CERTIFICATION: 90, 60, 30 days (EMAIL + INAPP)');
  console.log('     - LICENSE: 90, 60, 30 days (EMAIL + INAPP)');
}

async function seedDefaultUsers() {
  console.log('👤 Seeding default users...');

  // Create system admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@slms.local' },
    update: {},
    create: {
      email: 'admin@slms.local',
      name: 'System Administrator',
      status: UserStatus.ACTIVE,
    },
  });

  // Assign SustainabilityAdmin role to admin user
  const adminRole = await prisma.role.findUnique({
    where: { name: 'SustainabilityAdmin' },
  });

  if (adminRole) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: adminRole.id,
        },
      },
      update: {},
      create: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    });
  }

  console.log(`  ✅ User: ${adminUser.email} (SustainabilityAdmin)`);

  // Create auditor user
  const auditorUser = await prisma.user.upsert({
    where: { email: 'auditor@slms.local' },
    update: {},
    create: {
      email: 'auditor@slms.local',
      name: 'Default Auditor',
      status: UserStatus.ACTIVE,
    },
  });

  const auditorRole = await prisma.role.findUnique({
    where: { name: 'Auditor' },
  });

  if (auditorRole) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: auditorUser.id,
          roleId: auditorRole.id,
        },
      },
      update: {},
      create: {
        userId: auditorUser.id,
        roleId: auditorRole.id,
      },
    });
  }

  console.log(`  ✅ User: ${auditorUser.email} (Auditor)`);
}

// ==========================================
// Main Seed Function
// ==========================================

async function main() {
  console.log('');
  console.log('🌱 ====================================');
  console.log('   SLMS Database Seeding');
  console.log('   ====================================');
  console.log('');

  await seedRoles();
  await seedPermissions();
  await seedRolePermissions();
  await seedNotificationRules();
  await seedDefaultUsers();

  console.log('');
  console.log('🎉 ====================================');
  console.log('   Database seeding completed!');
  console.log('   ====================================');
  console.log('');
  console.log('📊 Summary:');
  console.log(`   - Roles: ${ROLES.length}`);
  console.log(`   - Permissions: ${PERMISSIONS.length}`);
  console.log(`   - Notification Rules: ${NOTIFICATION_RULES.length}`);
  console.log('');
  console.log('👤 Default Users:');
  console.log('   - admin@slms.local (SustainabilityAdmin)');
  console.log('   - auditor@slms.local (Auditor)');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
