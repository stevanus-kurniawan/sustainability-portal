import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { NotificationEngineService } from './notification-engine.service';
import { EmailService } from './email.service';
import { ExpiryNotificationTask } from './expiry-notification.task';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule,
    PrismaModule,
  ],
  providers: [NotificationEngineService, EmailService, ExpiryNotificationTask],
  exports: [NotificationEngineService, EmailService, ExpiryNotificationTask],
})
export class NotificationEngineModule {}
