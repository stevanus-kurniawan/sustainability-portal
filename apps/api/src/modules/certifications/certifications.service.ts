import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * CertificationsService - Placeholder for certification-related operations
 *
 * Note: Certifications are primarily managed in Strapi CMS.
 * This service handles API-side operations like notifications and auditing.
 */
@Injectable()
export class CertificationsService {
  private readonly logger = new Logger(CertificationsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get certification notification rules
   */
  async getNotificationRules() {
    return this.prisma.notificationRule.findMany({
      where: {
        objectType: 'CERTIFICATION',
        isActive: true,
      },
      orderBy: { daysBeforeExpiry: 'desc' },
    });
  }

  /**
   * Check for expiring certifications and create notifications
   * This would be called by a scheduled job
   */
  async checkExpiringCertifications(): Promise<void> {
    const rules = await this.getNotificationRules();

    for (const rule of rules) {
      this.logger.log(
        `Checking certifications expiring in ${rule.daysBeforeExpiry} days (${rule.channel})`,
      );
      // Integration with Strapi would happen here
      // Fetch certifications from Strapi API
      // Create notifications for users
    }
  }

  /**
   * Log certification-related audit entry
   */
  async logAudit(
    userEmail: string,
    action: string,
    certificationId: string,
    metadata?: any,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userEmail,
        action,
        entityType: 'CERTIFICATION',
        entityId: certificationId,
        metadata,
      },
    });
  }
}
