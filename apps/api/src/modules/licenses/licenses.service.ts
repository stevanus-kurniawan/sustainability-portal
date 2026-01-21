import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * LicensesService - Placeholder for license-related operations
 *
 * Note: Licenses are primarily managed in Strapi CMS.
 * This service handles API-side operations like notifications and auditing.
 */
@Injectable()
export class LicensesService {
  private readonly logger = new Logger(LicensesService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get license notification rules
   */
  async getNotificationRules() {
    return this.prisma.notificationRule.findMany({
      where: {
        objectType: 'LICENSE',
        isActive: true,
      },
      orderBy: { daysBeforeExpiry: 'desc' },
    });
  }

  /**
   * Check for expiring licenses and create notifications
   * This would be called by a scheduled job
   */
  async checkExpiringLicenses(): Promise<void> {
    const rules = await this.getNotificationRules();

    for (const rule of rules) {
      this.logger.log(
        `Checking licenses expiring in ${rule.daysBeforeExpiry} days (${rule.channel})`,
      );
      // Integration with Strapi would happen here
      // Fetch licenses from Strapi API
      // Create notifications for users
    }
  }

  /**
   * Log license-related audit entry
   */
  async logAudit(
    userEmail: string,
    action: string,
    licenseId: string,
    metadata?: any,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userEmail,
        action,
        entityType: 'LICENSE',
        entityId: licenseId,
        metadata,
      },
    });
  }
}
