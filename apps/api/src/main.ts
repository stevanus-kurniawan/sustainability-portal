import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Log unhandled errors that might bypass Nest exception filter (e.g. body parser, middleware)
  process.on('unhandledRejection', (reason: any) => {
    logger.error('Unhandled Rejection', reason?.stack ?? reason);
  });
  process.on('uncaughtException', (err: Error) => {
    logger.error('Uncaught Exception', err.stack);
  });

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.use(cookieParser());

  // Error-handling middleware: only called when next(err) is invoked (e.g. body-parser invalid JSON)
  app.use((err: any, _req: any, res: any, next: any) => {
    if (res.headersSent) return next(err);
    const status = err.status ?? err.statusCode ?? 500;
    const message = err.message ?? 'Internal server error';
    logger.warn(`Middleware error on ${_req?.method} ${_req?.url}: ${message}`, err?.stack);
    res.status(status >= 400 && status < 600 ? status : 500).json({
      statusCode: status >= 400 && status < 600 ? status : 500,
      error: status === 400 ? 'Bad Request' : 'Internal Server Error',
      message: status === 400 ? message : 'An error occurred. Check API logs.',
    });
  });

  // Global prefix
  const apiPrefix = configService.get('API_PREFIX', 'api/v1');
  app.setGlobalPrefix(apiPrefix);

  // CORS: allow configured origins (CORS_ORIGIN or CORS_ORIGINS) plus 127.0.0.1 variants for localhost
  const corsOriginsRaw =
    (configService.get('CORS_ORIGINS') && String(configService.get('CORS_ORIGINS')).trim()) ||
    configService.get('CORS_ORIGIN') ||
    configService.get('cors.origins') ||
    'http://localhost:3000,http://localhost:3002,http://localhost:3003,http://localhost:3004,http://localhost:1337';
  const corsOriginsList = (typeof corsOriginsRaw === 'string' ? corsOriginsRaw.split(',') : corsOriginsRaw as string[])
    .map((o) => (typeof o === 'string' ? o.trim() : ''))
    .filter(Boolean);
  const expandedOrigins = new Set<string>(corsOriginsList);
  corsOriginsList.forEach((origin) => {
    const match = /^(https?):\/\/localhost:(\d+)$/.exec(origin);
    if (match) expandedOrigins.add(`${match[1]}://127.0.0.1:${match[2]}`);
  });
  app.enableCors({
    origin: Array.from(expandedOrigins),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Global validation pipe (forbidNonWhitelisted: false to avoid 400/500 on extra props from proxy or form libs)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation at /docs (disabled by default in production)
  const swaggerDefault = process.env.NODE_ENV === 'production' ? 'false' : 'true';
  if (configService.get('SWAGGER_ENABLED', swaggerDefault) === 'true') {
    const config = new DocumentBuilder()
      .setTitle('SLMS API')
      .setDescription(
        'Sustainability Certification and Licensing Management System API\n\n' +
          '## Authentication\n' +
          'Most endpoints require JWT authentication. Use the `/auth/login` endpoint to obtain a token.\n\n' +
          '## Authorization\n' +
          'Role-based access control (RBAC) is used. Users can have multiple roles with permissions.\n\n' +
          '## Roles\n' +
          '- **SustainabilityAdmin**: Full access to all features\n' +
          '- **Legal**: Access to legal documents, certifications, and compliance\n' +
          '- **Auditor**: Read access to audit and verify compliance\n' +
          '- **PublicReader**: Read-only access to public documents',
      )
      .setVersion('1.0')
      .setContact('SLMS Team', 'https://slms.example.com', 'support@slms.example.com')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter JWT token',
          in: 'header',
        },
        'bearer',
      )
      .addTag('health', 'Health check endpoints')
      .addTag('auth', 'Authentication & authorization')
      .addTag('users', 'User management')
      .addTag('roles', 'Role & permission management')
      .addTag('public', 'Public content (no auth required)')
      .addTag('admin', 'Admin CRUD operations (via Strapi)')
      .addTag('organizations', 'Organization management')
      .addTag('certifications', 'Certification notifications')
      .addTag('licenses', 'License notifications')
      .addTag('notifications', 'Notification management')
      .addTag('audit-logs', 'Audit logging')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
      customSiteTitle: 'SLMS API Documentation',
    });
    logger.log('Swagger documentation enabled at /docs');
  }

  const port = configService.get('PORT', 3001);
  await app.listen(port);

  logger.log(`🚀 SLMS API running on http://localhost:${port}`);
  logger.log(`📚 Swagger docs: http://localhost:${port}/docs`);
  logger.log(`🔗 API endpoint: http://localhost:${port}/${apiPrefix}`);
}

bootstrap();
