import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { AdminRolesGuard } from '../admin-auth/guards/admin-roles.guard';
import { AdminRoles } from '../admin-auth/decorators/admin-roles.decorator';
import { AdminAdminsService, AuditActor } from './admin-admins.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

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

@ApiTags('admin/admins')
@Controller('admin/admins')
@UseGuards(AdminAuthGuard, AdminRolesGuard)
@AdminRoles('SUPER_ADMIN')
@ApiBearerAuth('bearer')
export class AdminAdminsController {
  constructor(private readonly service: AdminAdminsService) {}

  @Get()
  @ApiOperation({ summary: 'List all admins (SUPER_ADMIN only)' })
  @ApiResponse({ status: 200, description: 'List of admins' })
  list() {
    return this.service.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get admin by ID' })
  @ApiResponse({ status: 200, description: 'Admin detail' })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new admin (SUPER_ADMIN only)' })
  @ApiResponse({ status: 201, description: 'Admin created' })
  @ApiResponse({ status: 409, description: 'Admin email already exists' })
  async create(@Body() dto: CreateAdminDto, @Req() req: Request) {
    return this.service.create(
      dto,
      getActor(req as any),
      getIp(req),
      getUserAgent(req),
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update admin role/status (SUPER_ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Admin updated' })
  @ApiResponse({ status: 403, description: 'Cannot disable last SUPER_ADMIN' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAdminDto,
    @Req() req: Request,
  ) {
    return this.service.update(
      id,
      dto,
      getActor(req as any),
      getIp(req),
      getUserAgent(req),
    );
  }
}
