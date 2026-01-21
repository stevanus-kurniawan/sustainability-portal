import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { StrapiClientService } from './strapi-client.service';
import { PublicController } from './public/public.controller';
import { PublicService } from './public/public.service';
import { AdminController } from './admin/admin.controller';
import { AdminService } from './admin/admin.service';
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { NotificationEngineModule } from '../notification-engine/notification-engine.module';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    PrismaModule,
    AuditLogsModule,
    forwardRef(() => NotificationEngineModule),
  ],
  controllers: [PublicController, AdminController],
  providers: [StrapiClientService, PublicService, AdminService, AuditLogInterceptor],
  exports: [StrapiClientService, PublicService, AdminService],
})
export class StrapiModule {}
