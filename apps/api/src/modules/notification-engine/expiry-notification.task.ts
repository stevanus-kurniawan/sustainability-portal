import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { NotificationEngineService } from './notification-engine.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ExpiryNotificationTask {
  private readonly logger = new Logger(ExpiryNotificationTask.name);
  private isRunning = false;

  constructor(
    private readonly notificationEngine: NotificationEngineService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Run daily at 08:00 Asia/Jakarta (UTC+7)
   * Cron: minute hour day month weekday
   * 08:00 WIB = 01:00 UTC
   */
  @Cron('0 1 * * *', {
    name: 'expiry-notification-check',
    timeZone: 'Asia/Jakarta',
  })
  async handleExpiryNotifications(): Promise<void> {
    // Prevent concurrent execution
    if (this.isRunning) {
      this.logger.warn('Expiry notification job already running, skipping...');
      return;
    }

    // Check if job is enabled
    const isEnabled = this.configService.get('NOTIFICATION_JOB_ENABLED', 'true') === 'true';
    if (!isEnabled) {
      this.logger.log('Expiry notification job is disabled');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    this.logger.log('Starting expiry notification check...');

    try {
      const stats = await this.notificationEngine.processExpiryNotifications();

      const duration = Date.now() - startTime;
      this.logger.log(
        `Expiry notification check completed in ${duration}ms: ` +
          `${stats.processed} items processed, ` +
          `${stats.created} notifications created, ` +
          `${stats.emails} emails sent, ` +
          `${stats.errors} errors`,
      );

      // Log to audit
      await this.logJobExecution(stats, duration, null);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Expiry notification check failed:', error);

      await this.logJobExecution(null, duration, error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Manual trigger for testing or on-demand processing
   */
  async runManually(): Promise<any> {
    if (this.isRunning) {
      return { success: false, message: 'Job already running' };
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      const stats = await this.notificationEngine.processExpiryNotifications();
      const duration = Date.now() - startTime;

      await this.logJobExecution(stats, duration, null);

      return {
        success: true,
        duration,
        stats,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.logJobExecution(null, duration, error);

      return {
        success: false,
        duration,
        error: error.message,
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Log job execution to audit logs
   */
  private async logJobExecution(
    stats: any,
    duration: number,
    error: any,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userEmail: 'system@slms.local',
          action: 'SCHEDULED_JOB',
          entityType: 'EXPIRY_NOTIFICATION',
          entityId: null,
          metadata: {
            jobName: 'expiry-notification-check',
            duration,
            timestamp: new Date().toISOString(),
            success: !error,
            stats,
            error: error ? { message: error.message, stack: error.stack } : null,
          },
        },
      });
    } catch (auditError) {
      this.logger.error('Failed to log job execution:', auditError);
    }
  }

  /**
   * Get job status
   */
  getStatus(): { isRunning: boolean; isEnabled: boolean } {
    return {
      isRunning: this.isRunning,
      isEnabled: this.configService.get('NOTIFICATION_JOB_ENABLED', 'true') === 'true',
    };
  }
}
