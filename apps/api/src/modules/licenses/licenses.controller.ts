import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LicensesService } from './licenses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * LicensesController - API endpoints for license operations
 *
 * Note: Licenses CRUD is managed in Strapi CMS.
 * This controller handles notification rules and other API-specific features.
 */
@ApiTags('licenses')
@Controller('licenses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
export class LicensesController {
  constructor(private readonly service: LicensesService) {}

  @Get('notification-rules')
  @ApiOperation({
    summary: 'Get license notification rules',
    description: 'Returns active notification rules for license expiry',
  })
  getNotificationRules() {
    return this.service.getNotificationRules();
  }
}
