import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PublicService } from './public.service';
import {
  PaginationDto,
  LibraryQueryDto,
  CertificationQueryDto,
  LicenseQueryDto,
  GrievanceQueryDto,
  TraceabilityQueryDto,
} from '../dto/query.dto';
import { Public } from '../../auth/decorators/public.decorator';

@ApiTags('public')
@Controller('public')
@Public()
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  // ==========================================
  // Policies
  // ==========================================

  @Get('policies')
  @ApiOperation({
    summary: 'Get published policies',
    description: 'Returns public policy documents (type=POLICY, isPublished=true, isPublic=true)',
  })
  @ApiResponse({ status: 200, description: 'Policies list returned' })
  getPolicies(@Query() query: PaginationDto) {
    return this.publicService.getPolicies(query);
  }

  // ==========================================
  // Certifications
  // ==========================================

  @Get('certifications')
  @ApiOperation({
    summary: 'Get published certifications',
    description: 'Returns all published certifications',
  })
  @ApiResponse({ status: 200, description: 'Certifications list returned' })
  getCertifications(@Query() query: CertificationQueryDto) {
    return this.publicService.getCertifications(query);
  }

  // ==========================================
  // Licenses
  // ==========================================

  @Get('licenses')
  @ApiOperation({
    summary: 'Get published licenses',
    description: 'Returns all published licenses',
  })
  @ApiResponse({ status: 200, description: 'Licenses list returned' })
  getLicenses(@Query() query: LicenseQueryDto) {
    return this.publicService.getLicenses(query);
  }

  // ==========================================
  // Document Library
  // ==========================================

  @Get('library')
  @ApiOperation({
    summary: 'Get document library',
    description:
      'Returns documents where isPublished=true AND isPublic=true. Supports filtering by category, tags, type, and keyword search.',
  })
  @ApiQuery({ name: 'category', required: false, description: 'Category slug' })
  @ApiQuery({
    name: 'tags',
    required: false,
    description: 'Tag slugs (comma-separated)',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['POLICY', 'CERTIFICATION', 'LICENSE', 'GRIEVANCE', 'TRACEABILITY', 'GENERAL'],
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search keyword' })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['title', 'publishedAt', 'createdAt'],
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 200, description: 'Document library returned' })
  getLibrary(@Query() query: LibraryQueryDto) {
    return this.publicService.getLibrary(query);
  }

  @Get('library/:id')
  @ApiOperation({
    summary: 'Get single document',
    description: 'Returns a document by ID (only if public and published)',
  })
  @ApiResponse({ status: 200, description: 'Document returned' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  getDocument(@Param('id', ParseIntPipe) id: number) {
    return this.publicService.getDocument(id);
  }

  // ==========================================
  // Grievances
  // ==========================================

  @Get('grievances')
  @ApiOperation({
    summary: 'Get public grievances',
    description: 'Returns grievance cases where isPublicSummary=true',
  })
  @ApiResponse({ status: 200, description: 'Grievances list returned' })
  getGrievances(@Query() query: GrievanceQueryDto) {
    return this.publicService.getGrievances(query);
  }

  // ==========================================
  // Traceability
  // ==========================================

  @Get('traceability')
  @ApiOperation({
    summary: 'Get public traceability records',
    description: 'Returns traceability records where isPublic=true',
  })
  @ApiResponse({ status: 200, description: 'Traceability records returned' })
  getTraceability(@Query() query: TraceabilityQueryDto) {
    return this.publicService.getTraceability(query);
  }

  @Get('traceability/entities')
  @ApiOperation({
    summary: 'Get traceability entities',
    description: 'Returns factories, suppliers, and sites',
  })
  @ApiResponse({ status: 200, description: 'Traceability entities returned' })
  getTraceabilityEntities(@Query() query: TraceabilityQueryDto) {
    return this.publicService.getTraceabilityEntities(query);
  }

  // ==========================================
  // Filter Options
  // ==========================================

  @Get('categories')
  @ApiOperation({
    summary: 'Get categories',
    description: 'Returns public categories for filtering',
  })
  @ApiResponse({ status: 200, description: 'Categories list returned' })
  getCategories() {
    return this.publicService.getCategories();
  }

  @Get('tags')
  @ApiOperation({
    summary: 'Get tags',
    description: 'Returns tags for filtering',
  })
  @ApiResponse({ status: 200, description: 'Tags list returned' })
  getTags() {
    return this.publicService.getTags();
  }
}
