import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  // ==========================================
  // User Notifications
  // ==========================================

  @Get()
  @ApiOperation({ summary: 'Get notifications for current user' })
  @ApiQuery({ name: 'status', enum: ['SENT', 'READ', 'FAILED'], required: false })
  @ApiQuery({ name: 'skip', type: Number, required: false })
  @ApiQuery({ name: 'take', type: Number, required: false })
  findAll(
    @Request() req: any,
    @Query('status') status?: 'SENT' | 'READ' | 'FAILED',
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    return this.service.findAll({
      userEmail: req.user.email,
      status,
      skip,
      take,
    });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@Request() req: any) {
    const count = await this.service.getUnreadCount(req.user.email);
    return { count };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification by ID' })
  @ApiResponse({ status: 200, description: 'Notification found' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.service.findByIdForUser(id, req.user.email);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  markAsRead(@Request() req: any, @Param('id') id: string) {
    return this.service.markAsReadForUser(id, req.user.email);
  }

  @Post('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Request() req: any) {
    await this.service.markAllAsRead(req.user.email);
    return { message: 'All notifications marked as read' };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  remove(@Request() req: any, @Param('id') id: string) {
    return this.service.deleteForUser(id, req.user.email);
  }

  // ==========================================
  // Notification Rules (Admin only)
  // ==========================================

  @Get('rules/all')
  @UseGuards(RolesGuard)
  @Roles('SustainabilityAdmin')
  @ApiOperation({ summary: 'Get all notification rules' })
  @ApiQuery({ name: 'objectType', enum: ['CERTIFICATION', 'LICENSE', 'DOC_VERSION'], required: false })
  @ApiQuery({ name: 'channel', enum: ['EMAIL', 'INAPP'], required: false })
  @ApiQuery({ name: 'isActive', type: Boolean, required: false })
  findAllRules(
    @Query('objectType') objectType?: string,
    @Query('channel') channel?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.service.findAllRules({ objectType, channel, isActive });
  }

  @Get('rules/:id')
  @UseGuards(RolesGuard)
  @Roles('SustainabilityAdmin')
  @ApiOperation({ summary: 'Get notification rule by ID' })
  findRuleById(@Param('id') id: string) {
    return this.service.findRuleById(id);
  }

  @Post('rules')
  @UseGuards(RolesGuard)
  @Roles('SustainabilityAdmin')
  @ApiOperation({ summary: 'Create notification rule' })
  createRule(
    @Body()
    data: {
      objectType: string;
      daysBeforeExpiry: number;
      channel: string;
      isActive?: boolean;
    },
  ) {
    return this.service.createRule(data);
  }

  @Patch('rules/:id')
  @UseGuards(RolesGuard)
  @Roles('SustainabilityAdmin')
  @ApiOperation({ summary: 'Update notification rule' })
  updateRule(@Param('id') id: string, @Body() data: { isActive?: boolean }) {
    return this.service.updateRule(id, data);
  }

  @Post('rules/:id/toggle')
  @UseGuards(RolesGuard)
  @Roles('SustainabilityAdmin')
  @ApiOperation({ summary: 'Toggle notification rule active status' })
  toggleRule(@Param('id') id: string) {
    return this.service.toggleRule(id);
  }

  @Delete('rules/:id')
  @UseGuards(RolesGuard)
  @Roles('SustainabilityAdmin')
  @ApiOperation({ summary: 'Delete notification rule' })
  deleteRule(@Param('id') id: string) {
    return this.service.deleteRule(id);
  }
}
