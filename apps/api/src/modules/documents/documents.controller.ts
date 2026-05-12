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
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

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
    @Query('subContentId') subContentId?: string,
    @Query('contentVersion') contentVersion?: string,
    @Query('policyKind') policyKind?: string,
    @Query('regulationKind') regulationKind?: string,
    @Query('documentType') documentType?: string,
    @Query('regulationOnly') regulationOnly?: string,
    @Query('procedureScope') procedureScope?: string,
    @Query('procedureOnly') procedureOnly?: string,
    @Query('updateOnly') updateOnly?: string,
    @Query('operationalUnitId') operationalUnitId?: string,
  ) {
    return this.service.findAllAdmin({
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      type,
      search: search?.trim() || undefined,
      isPublished: isPublished === 'true' ? true : isPublished === 'false' ? false : undefined,
      categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
      subContentId: subContentId ? parseInt(subContentId, 10) : undefined,
      contentVersion,
      policyKind,
      regulationKind,
      documentType,
      regulationOnly: regulationOnly === 'true',
      procedureScope,
      procedureOnly: procedureOnly === 'true',
      updateOnly: updateOnly === 'true',
      operationalUnitId: operationalUnitId ? parseInt(operationalUnitId, 10) : undefined,
    });
  }

  @Get('deleted')
  findAllDeleted(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAllDeleted({
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      type,
      search: search?.trim() || undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOneAdmin(id);
  }

  @Post()
  create(
    @Req() req: Request & { user: { id: string } },
    @Body() body: CreateDocumentDto,
  ) {
    return this.service.create(body, req.user?.id);
  }

  @Put(':id')
  update(
    @Req() req: Request & { user: { id: string } },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateDocumentDto,
  ) {
    return this.service.update(id, body, req.user?.id);
  }

  @Delete(':id')
  remove(
    @Req() req: Request & { user: { id: string } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.remove(id, req.user?.id);
  }

  @Post(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.service.restore(id);
  }
}
