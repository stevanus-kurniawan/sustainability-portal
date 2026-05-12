import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { CertificationsService } from './certifications.service';
import { CreateCertificationDto } from './dto/create-certification.dto';
import { UpdateCertificationDto } from './dto/update-certification.dto';

@ApiTags('certifications')
@Controller('certifications')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth('bearer')
export class CertificationsController {
  constructor(private readonly service: CertificationsService) {}

  @Get('notification-rules')
  getNotificationRules() {
    return this.service.getNotificationRules();
  }

  @Get('issuers')
  findIssuerOptions(@Query('contentVersion') contentVersion?: string) {
    return this.service.findIssuerOptions({ contentVersion });
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('issuer') issuer?: string,
    @Query('categoryId') categoryId?: string,
    @Query('subContentId') subContentId?: string,
    @Query('contentVersion') contentVersion?: string,
    @Query('operationalUnitId') operationalUnitId?: string,
    @Query('expiringWithinDays') expiringWithinDays?: string,
  ) {
    return this.service.findAllAdmin({
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      search: search || undefined,
      status: status || undefined,
      issuer: issuer || undefined,
      categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
      subContentId: subContentId ? parseInt(subContentId, 10) : undefined,
      contentVersion,
      operationalUnitId: operationalUnitId ? parseInt(operationalUnitId, 10) : undefined,
      expiringWithinDays: expiringWithinDays ? parseInt(expiringWithinDays, 10) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOneAdmin(id);
  }

  @Post()
  create(
    @Body() body: CreateCertificationDto,
    @Req() req: Request & { user?: { id?: string } },
  ) {
    return this.service.create(body, req.user?.id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateCertificationDto,
    @Req() req: Request & { user?: { id?: string } },
  ) {
    return this.service.update(id, body, req.user?.id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
