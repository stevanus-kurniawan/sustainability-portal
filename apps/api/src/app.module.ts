import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminAuthModule } from './modules/admin-auth/admin-auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { SubContentsModule } from './modules/sub-contents/sub-contents.module';
import { CertificationsModule } from './modules/certifications/certifications.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { GrievancesModule } from './modules/grievances/grievances.module';
import { LicensesModule } from './modules/licenses/licenses.module';
import { PublicModule } from './modules/public/public.module';
import { TagsModule } from './modules/tags/tags.module';
import { TraceabilityModule } from './modules/traceability/traceability.module';
import { UploadModule } from './modules/upload/upload.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { AdminUsersModule } from './modules/admin-users/admin-users.module';
import { AdminAdminsModule } from './modules/admin-admins/admin-admins.module';
import { NotificationEngineModule } from './modules/notification-engine/notification-engine.module';
import { HealthModule } from './modules/health/health.module';
import { PlanningActivitiesModule } from './modules/planning-activities/planning-activities.module';
import { OperationalUnitsModule } from './modules/operational-units/operational-units.module';
import { QueuesModule } from './queues/queues.module';
import configuration from './config/configuration';
import { validate } from './config/env.validation';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { CsrfGuard } from './common/guards/csrf.guard';

const redisEnabled = process.env.REDIS_ENABLED !== 'false';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting (global, use library defaults)
    ThrottlerModule.forRoot(),

    // BullMQ for Redis queues (optional: set REDIS_ENABLED=false to run without Redis, e.g. local dev)
    ...(redisEnabled
      ? [
          BullModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
              connection: {
                host: configService.get('REDIS_HOST', 'localhost'),
                port: configService.get('REDIS_PORT', 6379),
                password: configService.get('REDIS_PASSWORD', undefined),
              },
            }),
            inject: [ConfigService],
          }),
          QueuesModule,
        ]
      : []),

    // Database
    PrismaModule,

    // Feature modules
    AuthModule,
    AdminAuthModule,
    UsersModule,
    RolesModule,
    OrganizationsModule,
    CategoriesModule,
    SubContentsModule,
    TagsModule,
    DocumentsModule,
    CertificationsModule,
    LicensesModule,
    GrievancesModule,
    TraceabilityModule,
    PublicModule,
    UploadModule,
    NotificationsModule,
    AuditLogsModule,
    AdminUsersModule,
    AdminAdminsModule,
    NotificationEngineModule,
    HealthModule,
    PlanningActivitiesModule,
    OperationalUnitsModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
  ],
})
export class AppModule {}

