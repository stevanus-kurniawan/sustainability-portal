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
import { NotificationEngineModule } from './modules/notification-engine/notification-engine.module';
import { HealthModule } from './modules/health/health.module';
import { QueuesModule } from './queues/queues.module';
import configuration from './config/configuration';
import { validate } from './config/env.validation';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

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

    // BullMQ for Redis queues
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
    NotificationEngineModule,
    HealthModule,
    QueuesModule,
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
  ],
})
export class AppModule {}

