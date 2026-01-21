import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * OrganizationsService - Placeholder for organization-related operations
 *
 * Note: Organizations can be managed externally or in Strapi CMS.
 * This service provides API-side utilities.
 */
@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Log organization-related audit entry
   */
  async logAudit(
    userEmail: string,
    action: string,
    organizationId: string,
    metadata?: any,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userEmail,
        action,
        entityType: 'ORGANIZATION',
        entityId: organizationId,
        metadata,
      },
    });
  }
}
