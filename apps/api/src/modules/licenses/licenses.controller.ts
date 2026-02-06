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
import { LicensesService } from './licenses.service';

@ApiTags('licenses')
@Controller('licenses')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth('bearer')
export class LicensesController {
  constructor(private readonly service: LicensesService) {}

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
    @Query('subContentId') subContentId?: string,
  ) {
    return this.service.findAllAdmin({
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      search: search || undefined,
      status: status || undefined,
      subContentId: subContentId ? parseInt(subContentId, 10) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOneAdmin(id);
  }

  @Post()
  create(
    @Body()
    body: {
      name: string;
      authority?: string;
      licenseNo?: string;
      issuedDate?: string;
      expiryDate?: string;
      documentId?: number;
      subContentId?: number | null;
      externalLink?: string;
    },
  ) {
    return this.service.create(body);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      name?: string;
      authority?: string;
      licenseNo?: string;
      issuedDate?: string;
      expiryDate?: string;
      documentId?: number | null;
      subContentId?: number | null;
      externalLink?: string | null;
    },
  ) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
