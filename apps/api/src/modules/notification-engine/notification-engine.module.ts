import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { NotificationEngineService } from './notification-engine.service';
import { EmailService } from './email.service';
import { ExpiryNotificationTask } from './expiry-notification.task';
import { PrismaModule } from '../../prisma/prisma.module';
import { StrapiModule } from '../strapi/strapi.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule,
    PrismaModule,
    forwardRef(() => StrapiModule),
  ],
  providers: [NotificationEngineService, EmailService, ExpiryNotificationTask],
  exports: [NotificationEngineService, EmailService, ExpiryNotificationTask],
})
export class NotificationEngineModule {}
