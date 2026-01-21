import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AuditLogInterceptor } from '../../../common/interceptors/audit-log.interceptor';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { NotificationEngineService } from '../../notification-engine/notification-engine.service';
import { ExpiryNotificationTask } from '../../notification-engine/expiry-notification.task';
import {
  PaginationDto,
  AdminDocumentQueryDto,
  CertificationQueryDto,
  LicenseQueryDto,
  GrievanceQueryDto,
  TraceabilityQueryDto,
} from '../dto/query.dto';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  CreateCertificationDto,
  UpdateCertificationDto,
  CreateLicenseDto,
  UpdateLicenseDto,
  CreateGrievanceCaseDto,
  UpdateGrievanceCaseDto,
  CreateTraceabilityEntityDto,
  UpdateTraceabilityEntityDto,
  CreateTraceabilityRecordDto,
  UpdateTraceabilityRecordDto,
} from '../dto/create-document.dto';
import { AuditLogQueryDto } from '../dto/audit-log-query.dto';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLogInterceptor)
@ApiBearerAuth('bearer')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly auditLogsService: AuditLogsService,
    private readonly notificationEngine: NotificationEngineService,
    private readonly expiryNotificationTask: ExpiryNotificationTask,
  ) {}

  // ==========================================
  // Audit Logs
  // ==========================================

  @Get('audit-logs')
  @Roles('SustainabilityAdmin', 'Auditor')
  @ApiOperation({
    summary: 'Get audit logs',
    description: 'Query audit logs with filters for entityType, date range, and pagination',
  })
  @ApiQuery({ name: 'entityType', required: false, description: 'Filter by entity type (e.g., documents, certifications)' })
  @ApiQuery({ name: 'action', required: false, description: 'Filter by action (CREATE, UPDATE, DELETE, PUBLISH, etc.)' })
  @ApiQuery({ name: 'userEmail', required: false, description: 'Filter by user email' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO format)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Audit logs returned with pagination' })
  async getAuditLogs(@Query() query: AuditLogQueryDto) {
    const [data, total] = await Promise.all([
      this.auditLogsService.findAll({
        entityType: query.entityType,
        action: query.action,
        userEmail: query.userEmail,
        startDate: query.from ? new Date(query.from) : undefined,
        endDate: query.to ? new Date(query.to) : undefined,
        skip: ((query.page || 1) - 1) * (query.pageSize || 25),
        take: query.pageSize || 25,
      }),
      this.auditLogsService.count({
        entityType: query.entityType,
        userEmail: query.userEmail,
        startDate: query.from ? new Date(query.from) : undefined,
        endDate: query.to ? new Date(query.to) : undefined,
      }),
    ]);

    return {
      data,
      meta: {
        pagination: {
          page: query.page || 1,
          pageSize: query.pageSize || 25,
          pageCount: Math.ceil(total / (query.pageSize || 25)),
          total,
        },
      },
    };
  }

  @Get('audit-logs/entity-types')
  @Roles('SustainabilityAdmin', 'Auditor')
  @ApiOperation({ summary: 'Get available entity types for filtering' })
  getAuditLogEntityTypes() {
    return this.auditLogsService.getEntityTypes();
  }

  @Get('audit-logs/actions')
  @Roles('SustainabilityAdmin', 'Auditor')
  @ApiOperation({ summary: 'Get available actions for filtering' })
  getAuditLogActions() {
    return this.auditLogsService.getActions();
  }

  @Get('audit-logs/:id')
  @Roles('SustainabilityAdmin', 'Auditor')
  @ApiOperation({ summary: 'Get audit log by ID' })
  getAuditLog(@Param('id') id: string) {
    return this.auditLogsService.findById(id);
  }

  // ==========================================
  // Notifications
  // ==========================================

  @Get('notifications')
  @Roles('SustainabilityAdmin', 'Legal', 'Auditor')
  @ApiOperation({
    summary: 'Get notifications for current user',
    description: 'Returns paginated notifications for the authenticated user',
  })
  @ApiQuery({ name: 'status', required: false, enum: ['SENT', 'READ', 'FAILED'] })
  @ApiQuery({ name: 'channel', required: false, enum: ['EMAIL', 'INAPP'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Notifications returned with pagination' })
  getNotifications(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('channel') channel?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.notificationEngine.getNotificationsForUser(req.user.email, {
      status: status as any,
      channel: channel as any,
      page: page || 1,
      pageSize: pageSize || 25,
    });
  }

  @Get('notifications/unread-count')
  @Roles('SustainabilityAdmin', 'Legal', 'Auditor')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadNotificationCount(@Request() req: any) {
    const count = await this.notificationEngine.getUnreadCount(req.user.email);
    return { count };
  }

  @Post('notifications/:id/read')
  @Roles('SustainabilityAdmin', 'Legal', 'Auditor')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markNotificationAsRead(@Param('id') id: string, @Request() req: any) {
    const notification = await this.notificationEngine.markAsRead(id, req.user.email);
    if (!notification) {
      return { success: false, message: 'Notification not found' };
    }
    return { success: true, notification };
  }

  @Post('notifications/mark-all-read')
  @Roles('SustainabilityAdmin', 'Legal', 'Auditor')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllNotificationsAsRead(@Request() req: any) {
    const count = await this.notificationEngine.markAllAsRead(req.user.email);
    return { success: true, count };
  }

  @Get('notifications/job-status')
  @Roles('SustainabilityAdmin')
  @ApiOperation({ summary: 'Get notification job status' })
  getNotificationJobStatus() {
    return this.expiryNotificationTask.getStatus();
  }

  @Post('notifications/run-expiry-check')
  @Roles('SustainabilityAdmin')
  @ApiOperation({
    summary: 'Manually trigger expiry notification check',
    description: 'Runs the expiry notification job immediately (admin only)',
  })
  @ApiResponse({ status: 200, description: 'Job execution result' })
  runExpiryNotificationCheck() {
    return this.expiryNotificationTask.runManually();
  }

  // ==========================================
  // Documents CRUD
  // ==========================================

  @Get('documents')
  @Roles('SustainabilityAdmin', 'Legal', 'Auditor')
  @ApiOperation({ summary: 'Get all documents' })
  @ApiResponse({ status: 200, description: 'Documents list returned' })
  getDocuments(@Query() query: AdminDocumentQueryDto) {
    return this.adminService.getDocuments(query);
  }

  @Get('documents/:id')
  @Roles('SustainabilityAdmin', 'Legal', 'Auditor')
  @ApiOperation({ summary: 'Get document by ID' })
  @ApiResponse({ status: 200, description: 'Document returned' })
  getDocument(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getDocument(id);
  }

  @Post('documents')
  @Roles('SustainabilityAdmin', 'Legal')
  @ApiOperation({ summary: 'Create a new document' })
  @ApiResponse({ status: 201, description: 'Document created' })
  createDocument(@Body() data: CreateDocumentDto) {
    return this.adminService.createDocument(data);
  }

  @Put('documents/:id')
  @Roles('SustainabilityAdmin', 'Legal')
  @ApiOperation({ summary: 'Update a document' })
  @ApiResponse({ status: 200, description: 'Document updated' })
  updateDocument(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateDocumentDto,
  ) {
    return this.adminService.updateDocument(id, data);
  }

  @Delete('documents/:id')
  @Roles('SustainabilityAdmin')
  @ApiOperation({ summary: 'Delete a document' })
  @ApiResponse({ status: 200, description: 'Document deleted' })
  deleteDocument(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteDocument(id);
  }

  @Post('documents/:id/publish')
  @Roles('SustainabilityAdmin', 'Legal')
  @ApiOperation({ summary: 'Publish a document' })
  @ApiResponse({ status: 200, description: 'Document published' })
  publishDocument(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.publishDocument(id);
  }

  @Post('documents/:id/unpublish')
  @Roles('SustainabilityAdmin', 'Legal')
  @ApiOperation({ summary: 'Unpublish a document' })
  @ApiResponse({ status: 200, description: 'Document unpublished' })
  unpublishDocument(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.unpublishDocument(id);
  }

  // ==========================================
  // Certifications CRUD
  // ==========================================

  @Get('certifications')
  @Roles('SustainabilityAdmin', 'Legal', 'Auditor')
  @ApiOperation({ summary: 'Get all certifications' })
  @ApiResponse({ status: 200, description: 'Certifications list returned' })
  getCertifications(@Query() query: CertificationQueryDto) {
    return this.adminService.getCertifications(query);
  }

  @Get('certifications/:id')
  @Roles('SustainabilityAdmin', 'Legal', 'Auditor')
  @ApiOperation({ summary: 'Get certification by ID' })
  @ApiResponse({ status: 200, description: 'Certification returned' })
  getCertification(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getCertification(id);
  }

  @Post('certifications')
  @Roles('SustainabilityAdmin', 'Legal')
  @ApiOperation({ summary: 'Create a new certification' })
  @ApiResponse({ status: 201, description: 'Certification created' })
  createCertification(@Body() data: CreateCertificationDto) {
    return this.adminService.createCertification(data);
  }

  @Put('certifications/:id')
  @Roles('SustainabilityAdmin', 'Legal')
  @ApiOperation({ summary: 'Update a certification' })
  @ApiResponse({ status: 200, description: 'Certification updated' })
  updateCertification(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateCertificationDto,
  ) {
    return this.adminService.updateCertification(id, data);
  }

  @Delete('certifications/:id')
  @Roles('SustainabilityAdmin')
  @ApiOperation({ summary: 'Delete a certification' })
  @ApiResponse({ status: 200, description: 'Certification deleted' })
  deleteCertification(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteCertification(id);
  }

  // ==========================================
  // Licenses CRUD
  // ==========================================

  @Get('licenses')
  @Roles('SustainabilityAdmin', 'Legal', 'Auditor')
  @ApiOperation({ summary: 'Get all licenses' })
  @ApiResponse({ status: 200, description: 'Licenses list returned' })
  getLicenses(@Query() query: LicenseQueryDto) {
    return this.adminService.getLicenses(query);
  }

  @Get('licenses/:id')
  @Roles('SustainabilityAdmin', 'Legal', 'Auditor')
  @ApiOperation({ summary: 'Get license by ID' })
  @ApiResponse({ status: 200, description: 'License returned' })
  getLicense(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getLicense(id);
  }

  @Post('licenses')
  @Roles('SustainabilityAdmin', 'Legal')
  @ApiOperation({ summary: 'Create a new license' })
  @ApiResponse({ status: 201, description: 'License created' })
  createLicense(@Body() data: CreateLicenseDto) {
    return this.adminService.createLicense(data);
  }

  @Put('licenses/:id')
  @Roles('SustainabilityAdmin', 'Legal')
  @ApiOperation({ summary: 'Update a license' })
  @ApiResponse({ status: 200, description: 'License updated' })
  updateLicense(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateLicenseDto,
  ) {
    return this.adminService.updateLicense(id, data);
  }

  @Delete('licenses/:id')
  @Roles('SustainabilityAdmin')
  @ApiOperation({ summary: 'Delete a license' })
  @ApiResponse({ status: 200, description: 'License deleted' })
  deleteLicense(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteLicense(id);
  }

  // ==========================================
  // Grievance Cases CRUD
  // ==========================================

  @Get('grievance-cases')
  @Roles('SustainabilityAdmin', 'Legal', 'Auditor')
  @ApiOperation({ summary: 'Get all grievance cases' })
  @ApiQuery({ name: 'status', required: false, enum: ['OPEN', 'IN_REVIEW', 'CLOSED'] })
  @ApiQuery({ name: 'category', required: false })
  @ApiResponse({ status: 200, description: 'Grievance cases list returned' })
  getGrievanceCases(@Query() query: GrievanceQueryDto) {
    return this.adminService.getGrievanceCases(query);
  }

  @Get('grievance-cases/:id')
  @Roles('SustainabilityAdmin', 'Legal', 'Auditor')
  @ApiOperation({ summary: 'Get grievance case by ID' })
  @ApiResponse({ status: 200, description: 'Grievance case returned' })
  getGrievanceCase(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getGrievanceCase(id);
  }

  @Post('grievance-cases')
  @Roles('SustainabilityAdmin', 'Legal')
  @ApiOperation({ summary: 'Create a new grievance case' })
  @ApiResponse({ status: 201, description: 'Grievance case created' })
  createGrievanceCase(@Body() data: CreateGrievanceCaseDto) {
    return this.adminService.createGrievanceCase(data);
  }

  @Put('grievance-cases/:id')
  @Roles('SustainabilityAdmin', 'Legal')
  @ApiOperation({ summary: 'Update a grievance case' })
  @ApiResponse({ status: 200, description: 'Grievance case updated' })
  updateGrievanceCase(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateGrievanceCaseDto,
  ) {
    return this.adminService.updateGrievanceCase(id, data);
  }

  @Delete('grievance-cases/:id')
  @Roles('SustainabilityAdmin')
  @ApiOperation({ summary: 'Delete a grievance case' })
  @ApiResponse({ status: 200, description: 'Grievance case deleted' })
  deleteGrievanceCase(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteGrievanceCase(id);
  }

  @Post('grievance-cases/:id/updates')
  @Roles('SustainabilityAdmin', 'Legal')
  @ApiOperation({ summary: 'Add update to grievance case' })
  @ApiResponse({ status: 201, description: 'Update added' })
  addGrievanceUpdate(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { message: string },
    @Request() req: any,
  ) {
    return this.adminService.addGrievanceUpdate(id, data.message, req.user.email);
  }

  // ==========================================
  // Traceability Entities CRUD
  // ==========================================

  @Get('traceability/entities')
  @Roles('SustainabilityAdmin', 'Legal', 'Auditor')
  @ApiOperation({ summary: 'Get all traceability entities' })
  @ApiQuery({ name: 'entityType', required: false, enum: ['FACTORY', 'SUPPLIER', 'SITE'] })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Traceability entities list returned' })
  getTraceabilityEntities(@Query() query: TraceabilityQueryDto) {
    return this.adminService.getTraceabilityEntities(query);
  }

  @Get('traceability/entities/:id')
  @Roles('SustainabilityAdmin', 'Legal', 'Auditor')
  @ApiOperation({ summary: 'Get traceability entity by ID' })
  @ApiResponse({ status: 200, description: 'Traceability entity returned' })
  getTraceabilityEntity(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getTraceabilityEntity(id);
  }

  @Post('traceability/entities')
  @Roles('SustainabilityAdmin', 'Legal')
  @ApiOperation({ summary: 'Create a new traceability entity' })
  @ApiResponse({ status: 201, description: 'Traceability entity created' })
  createTraceabilityEntity(@Body() data: CreateTraceabilityEntityDto) {
    return this.adminService.createTraceabilityEntity(data);
  }

  @Put('traceability/entities/:id')
  @Roles('SustainabilityAdmin', 'Legal')
  @ApiOperation({ summary: 'Update a traceability entity' })
  @ApiResponse({ status: 200, description: 'Traceability entity updated' })
  updateTraceabilityEntity(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateTraceabilityEntityDto,
  ) {
    return this.adminService.updateTraceabilityEntity(id, data);
  }

  @Delete('traceability/entities/:id')
  @Roles('SustainabilityAdmin')
  @ApiOperation({ summary: 'Delete a traceability entity' })
  @ApiResponse({ status: 200, description: 'Traceability entity deleted' })
  deleteTraceabilityEntity(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteTraceabilityEntity(id);
  }

  // ==========================================
  // Traceability Records CRUD
  // ==========================================

  @Get('traceability/records')
  @Roles('SustainabilityAdmin', 'Legal', 'Auditor')
  @ApiOperation({ summary: 'Get all traceability records' })
  @ApiQuery({ name: 'entityId', required: false, type: Number })
  @ApiQuery({ name: 'recordType', required: false, enum: ['AUDIT', 'CHAIN_OF_CUSTODY', 'ORIGIN'] })
  @ApiQuery({ name: 'isPublic', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Traceability records list returned' })
  getTraceabilityRecords(
    @Query() query: PaginationDto,
    @Query('entityId') entityId?: number,
    @Query('recordType') recordType?: string,
    @Query('isPublic') isPublic?: boolean,
  ) {
    return this.adminService.getTraceabilityRecords({ ...query, entityId, recordType, isPublic });
  }

  @Get('traceability/records/:id')
  @Roles('SustainabilityAdmin', 'Legal', 'Auditor')
  @ApiOperation({ summary: 'Get traceability record by ID' })
  @ApiResponse({ status: 200, description: 'Traceability record returned' })
  getTraceabilityRecord(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getTraceabilityRecord(id);
  }

  @Post('traceability/records')
  @Roles('SustainabilityAdmin', 'Legal')
  @ApiOperation({ summary: 'Create a new traceability record' })
  @ApiResponse({ status: 201, description: 'Traceability record created' })
  createTraceabilityRecord(@Body() data: CreateTraceabilityRecordDto) {
    return this.adminService.createTraceabilityRecord(data);
  }

  @Put('traceability/records/:id')
  @Roles('SustainabilityAdmin', 'Legal')
  @ApiOperation({ summary: 'Update a traceability record' })
  @ApiResponse({ status: 200, description: 'Traceability record updated' })
  updateTraceabilityRecord(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateTraceabilityRecordDto,
  ) {
    return this.adminService.updateTraceabilityRecord(id, data);
  }

  @Delete('traceability/records/:id')
  @Roles('SustainabilityAdmin')
  @ApiOperation({ summary: 'Delete a traceability record' })
  @ApiResponse({ status: 200, description: 'Traceability record deleted' })
  deleteTraceabilityRecord(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteTraceabilityRecord(id);
  }

  // ==========================================
  // Categories & Tags Management
  // ==========================================

  @Get('categories')
  @Roles('SustainabilityAdmin', 'Legal', 'Auditor')
  @ApiOperation({ summary: 'Get all categories' })
  getCategories(@Query() query: PaginationDto) {
    return this.adminService.getCategories(query);
  }

  @Post('categories')
  @Roles('SustainabilityAdmin')
  @ApiOperation({ summary: 'Create a new category' })
  createCategory(
    @Body() data: { name: string; slug?: string; isPublic?: boolean; displayOrder?: number },
  ) {
    return this.adminService.createCategory(data);
  }

  @Put('categories/:id')
  @Roles('SustainabilityAdmin')
  @ApiOperation({ summary: 'Update a category' })
  updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { name?: string; isPublic?: boolean; displayOrder?: number },
  ) {
    return this.adminService.updateCategory(id, data);
  }

  @Delete('categories/:id')
  @Roles('SustainabilityAdmin')
  @ApiOperation({ summary: 'Delete a category' })
  deleteCategory(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteCategory(id);
  }

  @Get('tags')
  @Roles('SustainabilityAdmin', 'Legal', 'Auditor')
  @ApiOperation({ summary: 'Get all tags' })
  getTags(@Query() query: PaginationDto) {
    return this.adminService.getTags(query);
  }

  @Post('tags')
  @Roles('SustainabilityAdmin')
  @ApiOperation({ summary: 'Create a new tag' })
  createTag(@Body() data: { name: string; slug?: string }) {
    return this.adminService.createTag(data);
  }

  @Put('tags/:id')
  @Roles('SustainabilityAdmin')
  @ApiOperation({ summary: 'Update a tag' })
  updateTag(@Param('id', ParseIntPipe) id: number, @Body() data: { name?: string }) {
    return this.adminService.updateTag(id, data);
  }

  @Delete('tags/:id')
  @Roles('SustainabilityAdmin')
  @ApiOperation({ summary: 'Delete a tag' })
  deleteTag(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteTag(id);
  }
}
