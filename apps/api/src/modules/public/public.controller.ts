import { Controller, Get, Param, ParseIntPipe, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { CategoriesService } from '../categories/categories.service';
import { CertificationsService } from '../certifications/certifications.service';
import { DocumentsService } from '../documents/documents.service';
import { GrievancesService } from '../grievances/grievances.service';
import { LicensesService } from '../licenses/licenses.service';
import { SubContentsService } from '../sub-contents/sub-contents.service';
import { TagsService } from '../tags/tags.service';
import { TraceabilityService } from '../traceability/traceability.service';
import { UploadService } from '../upload/upload.service';

@ApiTags('public')
@Controller('public')
@Public()
export class PublicController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly uploadService: UploadService,
    private readonly tagsService: TagsService,
    private readonly documentsService: DocumentsService,
    private readonly certificationsService: CertificationsService,
    private readonly licensesService: LicensesService,
    private readonly grievancesService: GrievancesService,
    private readonly traceabilityService: TraceabilityService,
    private readonly subContentsService: SubContentsService,
  ) {}

  @Get('navigation')
  getNavigation() {
    return this.categoriesService.getNavigationForPublic();
  }

  /** Stream file with Content-Disposition: inline for PDF/image preview in browser (iframe). */
  @Get('files/preview')
  async getFilePreview(@Query('key') key: string | undefined, @Res() res: Response) {
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ message: 'Missing or invalid key parameter' });
    }

    // Enforce that only document uploads can be accessed via this public endpoint.
    // Keys must be under the "uploads/" prefix and contain only safe characters.
    // Example valid key: uploads/uuid-v4.pdf
    const safeKeyPattern = /^uploads\/[a-zA-Z0-9._\-\/]+$/;
    if (!safeKeyPattern.test(key)) {
      return res.status(400).json({ message: 'Invalid file key format' });
    }

    const result = await this.uploadService.getObjectStream(key);
    if (!result) {
      return res.status(502).json({ message: 'Failed to stream file' });
    }
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    result.stream.on('error', () => {
      if (!res.headersSent) res.status(500).json({ message: 'Stream error' });
    });
    result.stream.pipe(res);
  }

  @Get('categories')
  getCategories() {
    return this.categoriesService.findAll(true).then((list) => ({ data: list }));
  }

  @Get('categories/:slug')
  getCategoryBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findBySlugPublic(slug).then((c) =>
      c ? { data: c } : { data: null },
    );
  }

  @Get('categories/:slug/sub-contents')
  getSubContents(@Param('slug') slug: string) {
    return this.subContentsService.findAllByCategorySlugPublic(slug).then((list) => ({
      data: list,
    }));
  }

  @Get('categories/:slug/sub-contents/:subSlug/documents')
  getSubContentDocuments(
    @Param('slug') slug: string,
    @Param('subSlug') subSlug: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.documentsService.findDocumentsByCategorySlugAndSubSlugPublic(
      slug,
      subSlug,
      page ? parseInt(page, 10) : undefined,
      pageSize ? parseInt(pageSize, 10) : undefined,
    );
  }

  @Get('categories/:slug/sub-contents/:subSlug/licenses')
  getSubContentLicenses(
    @Param('slug') slug: string,
    @Param('subSlug') subSlug: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.licensesService.findByCategorySlugAndSubSlugPublic(
      slug,
      subSlug,
      page ? parseInt(page, 10) : undefined,
      pageSize ? parseInt(pageSize, 10) : undefined,
    );
  }

  @Get('categories/:slug/sub-contents/:subSlug/certifications')
  getSubContentCertifications(
    @Param('slug') slug: string,
    @Param('subSlug') subSlug: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.certificationsService.findByCategorySlugAndSubSlugPublic(
      slug,
      subSlug,
      page ? parseInt(page, 10) : undefined,
      pageSize ? parseInt(pageSize, 10) : undefined,
    );
  }

  @Get('tags')
  getTags() {
    return this.tagsService.findAll().then((list) => ({ data: list }));
  }

  @Get('policies')
  getPolicies(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.documentsService.findPoliciesPublic(
      page ? parseInt(page, 10) : undefined,
      pageSize ? parseInt(pageSize, 10) : undefined,
    );
  }

  @Get('certifications')
  getCertifications(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.certificationsService.findAllPublic({
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      status,
      search,
    });
  }

  @Get('licenses')
  getLicenses(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.licensesService.findAllPublic({
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      status,
      search,
    });
  }

  @Get('library')
  getLibrary(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('category') category?: string,
    @Query('tags') tags?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.documentsService.findLibraryPublic({
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      category,
      tags,
      type,
      search,
      sortBy,
      sortOrder,
    });
  }

  @Get('library/:id')
  getDocument(@Param('id', ParseIntPipe) id: number) {
    return this.documentsService.findOnePublic(id).then((doc) =>
      doc ? { data: doc } : { data: null },
    );
  }

  @Get('grievances')
  getGrievances(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
  ) {
    return this.grievancesService.findAllPublic({
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      status,
      category,
    });
  }

  @Get('traceability')
  getTraceability(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('entityType') entityType?: string,
    @Query('recordType') recordType?: string,
    @Query('search') search?: string,
  ) {
    return this.traceabilityService.findRecordsPublic({
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      entityType,
      recordType,
      search,
    });
  }

  @Get('traceability/entities')
  getTraceabilityEntities(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('entityType') entityType?: string,
    @Query('search') search?: string,
  ) {
    return this.traceabilityService.findEntitiesPublic({
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      entityType,
      search,
    });
  }
}
