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
import { DocumentType } from '@prisma/client';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { DocumentsService } from './documents.service';

@ApiTags('admin/documents')
@Controller('admin/documents')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth('bearer')
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('isPublished') isPublished?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.service.findAllAdmin({
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      type,
      search: search?.trim() || undefined,
      isPublished: isPublished === 'true' ? true : isPublished === 'false' ? false : undefined,
      categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
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
      title: string;
      type: DocumentType;
      description?: string;
      externalLink?: string;
      isPublic?: boolean;
      isPublished?: boolean;
      categoryId?: number;
      tagIds?: number[];
      attachment?: { fileKey: string; fileName: string; mimeType?: string; fileSize?: number };
    },
  ) {
    return this.service.create(body);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      title?: string;
      type?: DocumentType;
      description?: string;
      externalLink?: string | null;
      isPublic?: boolean;
      isPublished?: boolean;
      categoryId?: number | null;
      tagIds?: number[];
      attachment?: { fileKey: string; fileName: string; mimeType?: string; fileSize?: number } | null;
    },
  ) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
