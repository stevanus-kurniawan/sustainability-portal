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
import { TraceabilityService } from './traceability.service';

@ApiTags('admin/traceability')
@Controller('admin/traceability')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth('bearer')
export class TraceabilityController {
  constructor(private readonly service: TraceabilityService) {}

  @Get('entities')
  findAllEntities(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.service.findAllEntitiesAdmin({
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get('entities/:id')
  findOneEntity(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOneEntityAdmin(id);
  }

  @Post('entities')
  createEntity(
    @Body()
    body: {
      entityType: string;
      name: string;
      code?: string;
      region?: string;
    },
  ) {
    return this.service.createEntity(body);
  }

  @Put('entities/:id')
  updateEntity(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; code?: string; region?: string },
  ) {
    return this.service.updateEntity(id, body);
  }

  @Delete('entities/:id')
  removeEntity(@Param('id', ParseIntPipe) id: number) {
    return this.service.removeEntity(id);
  }

  @Get('records')
  findAllRecords(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.service.findAllRecordsAdmin({
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Post('records')
  createRecord(
    @Body()
    body: {
      entityId: number;
      recordType: string;
      recordDate: string;
      isPublic?: boolean;
      evidenceDocumentId?: number;
    },
  ) {
    return this.service.createRecord(body);
  }

  @Delete('records/:id')
  removeRecord(@Param('id', ParseIntPipe) id: number) {
    return this.service.removeRecord(id);
  }
}
