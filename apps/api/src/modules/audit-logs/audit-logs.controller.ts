import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('audit-logs')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('bearer')
export class AuditLogsController {
  constructor(private readonly service: AuditLogsService) {}

  @Get()
  @Roles('SustainabilityAdmin', 'Auditor')
  @ApiOperation({ summary: 'Get audit logs' })
  @ApiQuery({ name: 'userEmail', required: false })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'skip', type: Number, required: false })
  @ApiQuery({ name: 'take', type: Number, required: false })
  @ApiResponse({ status: 200, description: 'Audit logs returned' })
  findAll(
    @Query('userEmail') userEmail?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    return this.service.findAll({
      userEmail,
      entityType,
      entityId,
      action,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      skip,
      take,
    });
  }

  @Get('entity-types')
  @Roles('SustainabilityAdmin', 'Auditor')
  @ApiOperation({ summary: 'Get all entity types with counts' })
  getEntityTypes() {
    return this.service.getEntityTypes();
  }

  @Get('actions')
  @Roles('SustainabilityAdmin', 'Auditor')
  @ApiOperation({ summary: 'Get all actions with counts' })
  getActions() {
    return this.service.getActions();
  }

  @Get('user/:email')
  @Roles('SustainabilityAdmin', 'Auditor')
  @ApiOperation({ summary: 'Get user activity' })
  @ApiQuery({ name: 'days', type: Number, required: false, description: 'Number of days (default: 30)' })
  getUserActivity(@Param('email') email: string, @Query('days') days?: number) {
    return this.service.getUserActivity(email, days || 30);
  }

  @Get('entity/:entityType/:entityId')
  @Roles('SustainabilityAdmin', 'Auditor')
  @ApiOperation({ summary: 'Get entity history' })
  getEntityHistory(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.service.getEntityHistory(entityType, entityId);
  }

  @Get(':id')
  @Roles('SustainabilityAdmin', 'Auditor')
  @ApiOperation({ summary: 'Get audit log by ID' })
  @ApiResponse({ status: 200, description: 'Audit log found' })
  @ApiResponse({ status: 404, description: 'Audit log not found' })
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }
}
