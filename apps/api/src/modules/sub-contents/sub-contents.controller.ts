import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { SubContentsService } from './sub-contents.service';

@ApiTags('admin/categories/sub-contents')
@Controller('admin/categories/:categoryId/sub-contents')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth('bearer')
export class SubContentsController {
  constructor(private readonly service: SubContentsService) {}

  @Get()
  findAll(@Param('categoryId', ParseIntPipe) categoryId: number) {
    return this.service.findAllByCategoryId(categoryId).then((list) => ({ data: list }));
  }

  @Get(':id')
  findOne(
    @Param('categoryId', ParseIntPipe) _categoryId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.findOne(id);
  }

  @Post()
  create(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Body() body: { title: string; slug: string; order?: number; description?: string | null },
  ) {
    return this.service.create(categoryId, body);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { title?: string; slug?: string; order?: number; description?: string | null },
  ) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
