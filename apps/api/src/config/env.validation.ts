import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, validateSync } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT: number = 3001;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  @IsOptional()
  REDIS_HOST: string = 'localhost';

  @IsNumber()
  @IsOptional()
  REDIS_PORT: number = 6379;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN: string = '8h';

  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN: string = '7d';

  @IsString()
  @IsOptional()
  CORS_ORIGINS: string = 'http://localhost:3000,http://localhost:3002,http://localhost:3003';

  @IsString()
  @IsOptional()
  API_PREFIX: string = 'api/v1';

  @IsString()
  @IsOptional()
  SWAGGER_ENABLED: string = 'true';

  // Email / App URLs (used for verification links and notifications)
  @IsString()
  @IsOptional()
  APP_BASE_URL?: string;

  @IsString()
  @IsOptional()
  SMTP_HOST?: string;

  @IsNumber()
  @IsOptional()
  SMTP_PORT?: number;

  @IsString()
  @IsOptional()
  SMTP_USER?: string;

  @IsString()
  @IsOptional()
  SMTP_PASS?: string;

  @IsString()
  @IsOptional()
  SMTP_SECURE?: string;

  @IsString()
  @IsOptional()
  MAIL_FROM_NAME?: string;

  @IsString()
  @IsOptional()
  MAIL_FROM_ADDRESS?: string;

  // Admin JWT
  @IsString()
  JWT_ADMIN_SECRET: string;

  // Document storage (filesystem mount)
  @IsString()
  @IsOptional()
  STORAGE_ROOT_PATH: string = '/app/storage';

  // Throttling (rate limiting)
  @IsNumber()
  @IsOptional()
  THROTTLE_TTL?: number;

  @IsNumber()
  @IsOptional()
  THROTTLE_LIMIT?: number;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const messages = errors.map((e) => {
      const prop = e.property;
      const constraints = e.constraints ? Object.values(e.constraints).join(', ') : 'invalid';
      return `${prop}: ${constraints}`;
    });
    throw new Error(
      `Environment validation failed:\n${messages.join('\n')}\n\n` +
        'Check apps/api/.env (or .env.local). Required: DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, JWT_ADMIN_SECRET.',
    );
  }

  return validatedConfig;
}
