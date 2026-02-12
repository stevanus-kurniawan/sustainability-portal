import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse = isHttpException ? exception.getResponse() : null;
    const message =
      (typeof errorResponse === 'string'
        ? errorResponse
        : (errorResponse as any)?.message) ||
      (exception as any)?.message ||
      'Internal server error';

    const path = request?.url;
    const method = request?.method;

    // Log without leaking sensitive details
    this.logger.error(
      `HTTP ${status} ${method} ${path} - ${message}`,
      isHttpException ? undefined : (exception as any)?.stack,
    );

    response.status(status).json({
      statusCode: status,
      error: HttpStatus[status] || 'Error',
      message,
      path,
      timestamp: new Date().toISOString(),
    });
  }
}

