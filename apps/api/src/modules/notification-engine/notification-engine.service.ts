import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StrapiClientService } from '../strapi/strapi-client.service';
import { EmailService } from './email.service';
import {
  NotificationObjectType,
  NotificationChannel,
  NotificationStatus,
} from '@prisma/client';

interface ExpiringItem {
  id: number;
  name: string;
  expiryDate: string;
  status?: string;
  issuer?: string;
  authority?: string;
}

interface NotificationCreateData {
  userEmail: string;
  title: string;
  message: string;
  channel: NotificationChannel;
  objectType: NotificationObjectType;
  objectId: string;
  daysBeforeExp: number;
  idempotencyKey: string;
}

@Injectable()
export class NotificationEngineService {
  private readonly logger = new Logger(NotificationEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => StrapiClientService))
    private readonly strapiClient: StrapiClientService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Process expiry notifications for all items
   */
  async processExpiryNotifications(): Promise<{
    processed: number;
    created: number;
    emails: number;
    errors: number;
  }> {
    const stats = { processed: 0, created: 0, emails: 0, errors: 0 };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

    // Get active notification rules
    const rules = await this.prisma.notificationRule.findMany({
      where: { isActive: true },
    });

    this.logger.log(`Processing ${rules.length} active notification rules`);

    // Get certifications and licenses from Strapi
    const [certifications, licenses] = await Promise.all([
      this.fetchCertifications(),
      this.fetchLicenses(),
    ]);

    // Group rules by object type
    const certRules = rules.filter((r) => r.objectType === 'CERTIFICATION');
    const licenseRules = rules.filter((r) => r.objectType === 'LICENSE');

    // Process certifications
    for (const cert of certifications) {
      stats.processed++;
      const result = await this.processItem(
        cert,
        'CERTIFICATION',
        certRules,
        todayStr,
      );
      stats.created += result.created;
      stats.emails += result.emails;
      stats.errors += result.errors;
    }

    // Process licenses
    for (const license of licenses) {
      stats.processed++;
      const result = await this.processItem(
        license,
        'LICENSE',
        licenseRules,
        todayStr,
      );
      stats.created += result.created;
      stats.emails += result.emails;
      stats.errors += result.errors;
    }

    this.logger.log(
      `Expiry notifications processed: ${stats.processed} items, ${stats.created} notifications created, ${stats.emails} emails sent, ${stats.errors} errors`,
    );

    return stats;
  }

  /**
   * Process a single item for notifications
   */
  private async processItem(
    item: ExpiringItem,
    objectType: 'CERTIFICATION' | 'LICENSE',
    rules: Array<{
      id: string;
      daysBeforeExpiry: number;
      channel: NotificationChannel;
    }>,
    todayStr: string,
  ): Promise<{ created: number; emails: number; errors: number }> {
    const stats = { created: 0, emails: 0, errors: 0 };

    if (!item.expiryDate) {
      return stats;
    }

    const expiryDate = new Date(item.expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiryDate.setHours(0, 0, 0, 0);

    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Skip if already expired
    if (daysUntilExpiry < 0) {
      return stats;
    }

    // Check which rules apply
    for (const rule of rules) {
      if (daysUntilExpiry === rule.daysBeforeExpiry) {
        try {
          const result = await this.createNotification(
            item,
            objectType,
            rule.daysBeforeExpiry,
            rule.channel,
            todayStr,
          );
          if (result.created) stats.created++;
          if (result.emailSent) stats.emails++;
        } catch (error) {
          this.logger.error(
            `Error processing ${objectType} ${item.id}:`,
            error,
          );
          stats.errors++;
        }
      }
    }

    return stats;
  }

  /**
   * Create a notification with idempotency check
   */
  private async createNotification(
    item: ExpiringItem,
    objectType: NotificationObjectType,
    daysBeforeExpiry: number,
    channel: NotificationChannel,
    todayStr: string,
  ): Promise<{ created: boolean; emailSent: boolean }> {
    // Generate idempotency key: objectType_objectId_days_date
    const idempotencyKey = `${objectType}_${item.id}_${daysBeforeExpiry}_${todayStr}`;

    // Check if notification already exists
    const existing = await this.prisma.notification.findUnique({
      where: { idempotencyKey },
    });

    if (existing) {
      this.logger.debug(`Notification already exists: ${idempotencyKey}`);
      return { created: false, emailSent: false };
    }

    // Get notification recipients (admins and legal)
    const recipients = await this.getNotificationRecipients();
    if (recipients.length === 0) {
      this.logger.warn('No notification recipients found');
      return { created: false, emailSent: false };
    }

    const itemTypeLabel = objectType === 'CERTIFICATION' ? 'Certification' : 'License';
    const title = `${itemTypeLabel} Expiring in ${daysBeforeExpiry} Days: ${item.name}`;
    const message = this.buildNotificationMessage(
      item,
      itemTypeLabel,
      daysBeforeExpiry,
    );

    let emailSent = false;

    // Create notifications for each recipient
    for (const recipient of recipients) {
      const recipientIdempotencyKey = `${idempotencyKey}_${channel}_${recipient}`;

      try {
        await this.prisma.notification.create({
          data: {
            userEmail: recipient,
            title,
            message,
            channel,
            objectType,
            objectId: String(item.id),
            daysBeforeExp: daysBeforeExpiry,
            idempotencyKey: recipientIdempotencyKey,
            status: NotificationStatus.SENT,
            sentAt: new Date(),
          },
        });

        // Send email if channel is EMAIL
        if (channel === NotificationChannel.EMAIL) {
          const sent = await this.emailService.sendExpiryNotification(
            recipient,
            itemTypeLabel,
            item.name,
            daysBeforeExpiry,
            new Date(item.expiryDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
          );
          if (sent) emailSent = true;
        }
      } catch (error) {
        // Handle unique constraint violation (duplicate)
        if (error.code === 'P2002') {
          this.logger.debug(`Duplicate notification skipped: ${recipientIdempotencyKey}`);
        } else {
          throw error;
        }
      }
    }

    return { created: true, emailSent };
  }

  /**
   * Build notification message
   */
  private buildNotificationMessage(
    item: ExpiringItem,
    itemType: string,
    daysRemaining: number,
  ): string {
    const expiryDateStr = new Date(item.expiryDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let details = `${itemType}: ${item.name}\n`;
    details += `Expiry Date: ${expiryDateStr}\n`;
    details += `Days Remaining: ${daysRemaining}\n`;

    if (item.issuer) {
      details += `Issuer: ${item.issuer}\n`;
    }
    if (item.authority) {
      details += `Authority: ${item.authority}\n`;
    }

    return details;
  }

  /**
   * Get users who should receive notifications
   */
  private async getNotificationRecipients(): Promise<string[]> {
    // Get users with SustainabilityAdmin or Legal roles
    const users = await this.prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        userRoles: {
          some: {
            role: {
              name: {
                in: ['SustainabilityAdmin', 'Legal'],
              },
            },
          },
        },
      },
      select: { email: true },
    });

    return users.map((u) => u.email);
  }

  /**
   * Fetch certifications from Strapi
   */
  private async fetchCertifications(): Promise<ExpiringItem[]> {
    try {
      const response = await this.strapiClient.get<any[]>('certifications', {
        pagination: { pageSize: 1000 },
        fields: ['id', 'name', 'expiryDate', 'status', 'issuer'],
      });

      if (!response.data) return [];

      return response.data.map((item: any) => ({
        id: item.id,
        name: item.attributes?.name || item.name || `Certification #${item.id}`,
        expiryDate: item.attributes?.expiryDate || item.expiryDate,
        status: item.attributes?.status || item.status,
        issuer: item.attributes?.issuer || item.issuer,
      }));
    } catch (error) {
      this.logger.error('Failed to fetch certifications from Strapi:', error);
      return [];
    }
  }

  /**
   * Fetch licenses from Strapi
   */
  private async fetchLicenses(): Promise<ExpiringItem[]> {
    try {
      const response = await this.strapiClient.get<any[]>('licenses', {
        pagination: { pageSize: 1000 },
        fields: ['id', 'name', 'expiryDate', 'status', 'authority'],
      });

      if (!response.data) return [];

      return response.data.map((item: any) => ({
        id: item.id,
        name: item.attributes?.name || item.name || `License #${item.id}`,
        expiryDate: item.attributes?.expiryDate || item.expiryDate,
        status: item.attributes?.status || item.status,
        authority: item.attributes?.authority || item.authority,
      }));
    } catch (error) {
      this.logger.error('Failed to fetch licenses from Strapi:', error);
      return [];
    }
  }

  /**
   * Get notifications for a user with pagination
   */
  async getNotificationsForUser(
    userEmail: string,
    params: {
      status?: NotificationStatus;
      channel?: NotificationChannel;
      page?: number;
      pageSize?: number;
    },
  ) {
    const { status, channel, page = 1, pageSize = 25 } = params;

    const where = {
      userEmail,
      ...(status && { status }),
      ...(channel && { channel }),
    };

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data,
      meta: {
        pagination: {
          page,
          pageSize,
          pageCount: Math.ceil(total / pageSize),
          total,
        },
      },
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string, userEmail: string): Promise<any> {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userEmail },
    });

    if (!notification) {
      return null;
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userEmail: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userEmail,
        status: NotificationStatus.SENT,
      },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userEmail: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userEmail,
        status: NotificationStatus.SENT,
      },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });

    return result.count;
  }
}
