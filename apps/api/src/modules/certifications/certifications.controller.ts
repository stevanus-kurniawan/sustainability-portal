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
  UseGuards,
} from '@nestjs/common';
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

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: string,
    @Query('subContentId') subContentId?: string,
    @Query('expiringWithinDays') expiringWithinDays?: string,
  ) {
    return this.service.findAllAdmin({
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      search: search || undefined,
      status: status || undefined,
      categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
      subContentId: subContentId ? parseInt(subContentId, 10) : undefined,
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
  ) {
    return this.service.create(body);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateCertificationDto,
  ) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
