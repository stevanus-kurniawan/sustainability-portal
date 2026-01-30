import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { CategoriesService } from '../categories/categories.service';
import { CertificationsService } from '../certifications/certifications.service';
import { DocumentsService } from '../documents/documents.service';
import { GrievancesService } from '../grievances/grievances.service';
import { LicensesService } from '../licenses/licenses.service';
import { TagsService } from '../tags/tags.service';
import { TraceabilityService } from '../traceability/traceability.service';

@ApiTags('public')
@Controller('public')
@Public()
export class PublicController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly tagsService: TagsService,
    private readonly documentsService: DocumentsService,
    private readonly certificationsService: CertificationsService,
    private readonly licensesService: LicensesService,
    private readonly grievancesService: GrievancesService,
    private readonly traceabilityService: TraceabilityService,
  ) {}

  @Get('navigation')
  getNavigation() {
    return this.categoriesService.getNavigationForPublic();
  }

  @Get('categories')
  getCategories() {
    return this.categoriesService.findAll(true).then((list) => ({ data: list }));
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
