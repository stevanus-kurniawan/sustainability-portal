import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

interface AuditLogData {
  userEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const path = request.path;

    // Only audit POST, PUT, PATCH, DELETE on /admin/* endpoints
    if (!this.shouldAudit(method, path)) {
      return next.handle();
    }

    const startTime = Date.now();
    const requestBody = this.sanitizeBody(request.body);

    return next.handle().pipe(
      tap({
        next: async (responseData) => {
          try {
            const auditData = this.buildAuditData(request, responseData, requestBody);
            await this.saveAuditLog(auditData);
            this.logger.debug(
              `Audit log: ${auditData.action} ${auditData.entityType} by ${auditData.userEmail} (${Date.now() - startTime}ms)`,
            );
          } catch (error) {
            this.logger.error('Failed to save audit log:', error);
          }
        },
        error: async (error) => {
          try {
            const auditData = this.buildAuditData(request, null, requestBody, error);
            await this.saveAuditLog(auditData);
            this.logger.debug(
              `Audit log (error): ${auditData.action} ${auditData.entityType} by ${auditData.userEmail}`,
            );
          } catch (auditError) {
            this.logger.error('Failed to save error audit log:', auditError);
          }
        },
      }),
    );
  }

  private shouldAudit(method: string, path: string): boolean {
    const auditMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    const isAdminPath = path.includes('/admin/');
    const isAuditLogsPath = path.includes('/audit-logs');

    // Audit mutations on admin endpoints, but not audit-logs queries
    return auditMethods.includes(method) && isAdminPath && !isAuditLogsPath;
  }

  private buildAuditData(
    request: any,
    responseData: any,
    requestBody: any,
    error?: any,
  ): AuditLogData {
    const user = request.user || {};
    const method = request.method;
    const path = request.path;
    const params = request.params;

    // Extract entity type from path
    // e.g., /api/v1/admin/documents/123 -> documents
    // e.g., /api/v1/admin/certifications -> certifications
    // e.g., /api/v1/admin/traceability/entities/123 -> traceability-entities
    const entityType = this.extractEntityType(path);

    // Extract entity ID from params or response
    const entityId = this.extractEntityId(params, responseData, method);

    // Build action string
    const action = this.buildAction(method, path);

    // Build metadata
    const metadata: Record<string, any> = {
      method,
      path,
      requestBody: requestBody,
      timestamp: new Date().toISOString(),
    };

    if (responseData?.data?.id) {
      metadata.responseId = responseData.data.id;
    }

    if (error) {
      metadata.error = {
        message: error.message,
        status: error.status || error.statusCode,
      };
      metadata.success = false;
    } else {
      metadata.success = true;
    }

    // For updates, try to capture what changed
    if (method === 'PUT' || method === 'PATCH') {
      metadata.changes = requestBody;
    }

    return {
      userEmail: user.email || 'system',
      action,
      entityType,
      entityId,
      metadata,
    };
  }

  private extractEntityType(path: string): string {
    // Remove API prefix and admin prefix
    // /api/v1/admin/documents/123 -> documents
    // /api/v1/admin/traceability/entities/123 -> traceability-entities
    // /api/v1/admin/grievance-cases/123/updates -> grievance-cases

    const parts = path.split('/').filter(Boolean);
    const adminIndex = parts.indexOf('admin');

    if (adminIndex === -1 || adminIndex >= parts.length - 1) {
      return 'unknown';
    }

    // Get the part after 'admin'
    const entityPart = parts[adminIndex + 1];

    // Handle nested paths like traceability/entities
    if (entityPart === 'traceability' && parts.length > adminIndex + 2) {
      const subEntity = parts[adminIndex + 2];
      if (subEntity === 'entities' || subEntity === 'records') {
        return `traceability-${subEntity}`;
      }
    }

    // Handle sub-resources like /grievance-cases/123/updates
    return entityPart;
  }

  private extractEntityId(
    params: Record<string, string>,
    responseData: any,
    method: string,
  ): string | undefined {
    // From URL params
    if (params?.id) {
      return String(params.id);
    }

    // From response for POST (create) operations
    if (method === 'POST' && responseData?.data?.id) {
      return String(responseData.data.id);
    }

    return undefined;
  }

  private buildAction(method: string, path: string): string {
    const actionMap: Record<string, string> = {
      POST: 'CREATE',
      PUT: 'UPDATE',
      PATCH: 'UPDATE',
      DELETE: 'DELETE',
    };

    const baseAction = actionMap[method] || method;

    // Check for special actions
    if (path.includes('/publish')) {
      return 'PUBLISH';
    }
    if (path.includes('/unpublish')) {
      return 'UNPUBLISH';
    }
    if (path.includes('/updates')) {
      return 'ADD_UPDATE';
    }

    return baseAction;
  }

  private sanitizeBody(body: any): any {
    if (!body) return null;

    // Create a copy to avoid mutating the original
    const sanitized = { ...body };

    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization'];
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    // Limit large fields
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'string' && value.length > 1000) {
        sanitized[key] = value.substring(0, 1000) + '... [TRUNCATED]';
      }
    }

    return sanitized;
  }

  private async saveAuditLog(data: AuditLogData): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userEmail: data.userEmail,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        metadata: data.metadata,
      },
    });
  }
}
