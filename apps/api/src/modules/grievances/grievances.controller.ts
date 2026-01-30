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
import { GrievancesService } from './grievances.service';

@ApiTags('admin/grievances')
@Controller('admin/grievances')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth('bearer')
export class GrievancesController {
  constructor(private readonly service: GrievancesService) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
  ) {
    return this.service.findAllAdmin({
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      status,
      category,
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
      caseNo: string;
      status?: string;
      category?: string;
      receivedDate: string;
      publicSummary?: string;
      evidenceDocumentId?: number;
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
      status?: string;
      category?: string;
      publicSummary?: string;
      evidenceDocumentId?: number | null;
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
