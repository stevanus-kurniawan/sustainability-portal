import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { AdminRolesGuard } from '../admin-auth/guards/admin-roles.guard';
import { AdminRoles } from '../admin-auth/decorators/admin-roles.decorator';
import { AdminUsersService, AuditActor } from './admin-users.service';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { AdminUserRoleDto } from './dto/admin-user-role.dto';
import { AdminUserStatusDto } from './dto/admin-user-status.dto';
import { UserStatus } from '@prisma/client';

function getActor(req: Request & { user?: { id: string; email: string; role: string } }): AuditActor {
  const user = req.user;
  return {
    adminId: user?.id ?? '',
    adminEmail: user?.email ?? 'unknown',
    adminRole: user?.role ?? 'ADMIN',
  };
}

function getIp(req: Request): string | undefined {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket?.remoteAddress;
}

function getUserAgent(req: Request): string | undefined {
  return req.headers['user-agent'];
}

@ApiTags('admin/users')
@Controller('admin/users')
@UseGuards(AdminAuthGuard, AdminRolesGuard)
@AdminRoles('SUPER_ADMIN', 'ADMIN')
@ApiBearerAuth('bearer')
export class AdminUsersController {
  constructor(private readonly service: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users with pagination, search, filter, sort' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: UserStatus })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 200, description: 'Paginated list of users' })
  list(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: UserStatus,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.service.list({
      page,
      pageSize,
      search,
      role,
      status,
      sortBy,
      sortOrder,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User detail' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user profile and/or role/status' })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 403, description: 'Cannot assign SUPER_ADMIN' })
  async update(
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserDto,
    @Req() req: Request,
  ) {
    return this.service.update(id, dto, getActor(req as any), getIp(req), getUserAgent(req));
  }

  @Patch(':id/role')
  @ApiOperation({ summary: 'Change user role' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  @ApiResponse({ status: 403, description: 'Only SUPER_ADMIN can assign SUPER_ADMIN' })
  async updateRole(
    @Param('id') id: string,
    @Body() dto: AdminUserRoleDto,
    @Req() req: Request,
  ) {
    return this.service.updateRole(
      id,
      dto.role,
      getActor(req as any),
      getIp(req),
      getUserAgent(req),
    );
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Change user status (e.g. Active, Suspended)' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: AdminUserStatusDto,
    @Req() req: Request,
  ) {
    return this.service.updateStatus(
      id,
      dto.status,
      getActor(req as any),
      getIp(req),
      getUserAgent(req),
    );
  }
}
