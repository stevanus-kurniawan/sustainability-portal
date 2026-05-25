import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { CreateOperationalUnitDto } from './dto/create-operational-unit.dto';
import { UpdateOperationalUnitDto } from './dto/update-operational-unit.dto';
import { OperationalUnitsService } from './operational-units.service';

@ApiTags('admin/operational-units')
@Controller('admin/operational-units')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth('bearer')
export class OperationalUnitsController {
  constructor(private readonly service: OperationalUnitsService) {}

  @Get()
  findAll() {
    return this.service.findAll({ includeAudit: true });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id, { includeAudit: true });
  }

  @Post()
  create(@Body() body: CreateOperationalUnitDto, @Req() req: Request & { user?: { id?: string } }) {
    return this.service.create(body, req.user?.id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateOperationalUnitDto,
    @Req() req: Request & { user?: { id?: string } },
  ) {
    return this.service.update(id, body, req.user?.id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
