import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CertificationsService } from './certifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * CertificationsController - API endpoints for certification operations
 *
 * Note: Certifications CRUD is managed in Strapi CMS.
 * This controller handles notification rules and other API-specific features.
 */
@ApiTags('certifications')
@Controller('certifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
export class CertificationsController {
  constructor(private readonly service: CertificationsService) {}

  @Get('notification-rules')
  @ApiOperation({
    summary: 'Get certification notification rules',
    description: 'Returns active notification rules for certification expiry',
  })
  getNotificationRules() {
    return this.service.getNotificationRules();
  }
}
