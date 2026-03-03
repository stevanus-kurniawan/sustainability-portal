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
    if (status === HttpStatus.INTERNAL_SERVER_ERROR && !isHttpException) {
      const ex = exception as any;
      const name = ex?.name ?? ex?.constructor?.name ?? 'Error';
      console.error(`[AllExceptionsFilter] 500 on ${method} ${path} - ${name}: ${ex?.message ?? exception}`);
      const stack = ex?.stack;
      if (stack) console.error('[AllExceptionsFilter] 500 stack:', stack);
    }

    try {
      if (!response.headersSent) {
        response.status(status).json({
          statusCode: status,
          error: HttpStatus[status] || 'Error',
          message,
          path,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (sendErr: any) {
      this.logger.error('Failed to send error response', sendErr?.stack);
      if (!response.headersSent) {
        try {
          response.status(500).send('Internal Server Error');
        } catch (_) {}
      }
    }
  }
}

