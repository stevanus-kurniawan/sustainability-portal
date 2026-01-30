import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.use(cookieParser());

  // Global prefix
  const apiPrefix = configService.get('API_PREFIX', 'api/v1');
  app.setGlobalPrefix(apiPrefix);

  // CORS
  app.enableCors({
    origin: configService.get('CORS_ORIGINS', 'http://localhost:3000,http://localhost:1337').split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation at /docs
  if (configService.get('SWAGGER_ENABLED', 'true') === 'true') {
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
