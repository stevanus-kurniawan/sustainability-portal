import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { TagsService } from './tags.service';

@ApiTags('admin/tags')
@Controller('admin/tags')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth('bearer')
export class TagsController {
  constructor(private readonly service: TagsService) {}

  @Get()
  findAll() {
    return this.service.findAll({ includeAudit: true });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() body: { name: string; slug: string }, @Req() req: Request & { user?: { id?: string } }) {
    return this.service.create(body, req.user?.id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; slug?: string },
    @Req() req: Request & { user?: { id?: string } },
  ) {
    return this.service.update(id, body, req.user?.id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
