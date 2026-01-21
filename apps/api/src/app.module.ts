import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { CertificationsModule } from './modules/certifications/certifications.module';
import { LicensesModule } from './modules/licenses/licenses.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { StrapiModule } from './modules/strapi/strapi.module';
import { NotificationEngineModule } from './modules/notification-engine/notification-engine.module';
import { HealthModule } from './modules/health/health.module';
import { QueuesModule } from './queues/queues.module';
import configuration from './config/configuration';
import { validate } from './config/env.validation';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      envFilePath: ['.env.local', '.env'],
    }),

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
    UsersModule,
    RolesModule,
    OrganizationsModule,
    CertificationsModule,
    LicensesModule,
    NotificationsModule,
    AuditLogsModule,
    StrapiModule,
    NotificationEngineModule,
    HealthModule,
    QueuesModule,
  ],
})
export class AppModule {}
