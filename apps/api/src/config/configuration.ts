const DEFAULT_USER_JWT_SECRET = 'super-secret-key-change-in-production';
const DEFAULT_REFRESH_JWT_SECRET = 'refresh-secret-key-change-in-production';
const DEFAULT_ADMIN_JWT_SECRET = 'admin-secret-key-change-in-production';
const DEFAULT_MINIO_ACCESS_KEY = 'minioadmin';
const DEFAULT_MINIO_SECRET_KEY = 'minioadmin';

export default () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProdLike = nodeEnv === 'production' || nodeEnv === 'uat';

  const jwtSecret = process.env.JWT_SECRET || DEFAULT_USER_JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || DEFAULT_REFRESH_JWT_SECRET;
  const jwtAdminSecret = process.env.JWT_ADMIN_SECRET || DEFAULT_ADMIN_JWT_SECRET;

  const minioAccessKey = process.env.MINIO_ACCESS_KEY || DEFAULT_MINIO_ACCESS_KEY;
  const minioSecretKey = process.env.MINIO_SECRET_KEY || DEFAULT_MINIO_SECRET_KEY;

  const weakRefreshSecrets = [DEFAULT_REFRESH_JWT_SECRET, 'refresh-secret-change-in-production'];
  const weakAdminSecrets = [DEFAULT_ADMIN_JWT_SECRET, 'admin-secret-change-in-production'];

  if (
    isProdLike &&
    (jwtSecret === DEFAULT_USER_JWT_SECRET ||
      weakRefreshSecrets.includes(jwtRefreshSecret) ||
      weakAdminSecrets.includes(jwtAdminSecret) ||
      minioAccessKey === DEFAULT_MINIO_ACCESS_KEY ||
      minioSecretKey === DEFAULT_MINIO_SECRET_KEY)
  ) {
    throw new Error(
      'Security error: In production/UAT environments, JWT and MinIO secrets must be set and must not use default placeholder values.',
    );
  }

  return {
    // Server
    port: parseInt(process.env.PORT || '3001', 10),
    apiPrefix: process.env.API_PREFIX || 'api/v1',
    nodeEnv,

    // Registration: only restrict to energi-up.com in production; dev/local allow any email.
    // Set REGISTRATION_DOMAIN_RESTRICTION_ENABLED=false to allow any email (e.g. local Docker with NODE_ENV=production).
    registration: {
      domainRestrictionEnabled:
        process.env.REGISTRATION_DOMAIN_RESTRICTION_ENABLED === 'true' ||
        (process.env.REGISTRATION_DOMAIN_RESTRICTION_ENABLED !== 'false' &&
          nodeEnv === 'production'),
    },

    // Database
    database: {
      url: process.env.DATABASE_URL,
    },

    // Redis
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
    },

    // JWT
    jwt: {
      secret: jwtSecret,
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
      refreshSecret: jwtRefreshSecret,
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      adminSecret: jwtAdminSecret,
      adminExpiresIn: process.env.JWT_ADMIN_EXPIRES_IN || '8h',
    },

    // CORS (CORS_ORIGIN is used by prod compose; CORS_ORIGINS for multiple origins)
    cors: {
      origins:
        process.env.CORS_ORIGINS ||
        process.env.CORS_ORIGIN ||
        'http://localhost:3000,http://localhost:3002,http://localhost:3003,http://localhost:3004,http://localhost:1337',
    },

    // MinIO (document storage)
    minio: {
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000', 10),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: minioAccessKey,
      secretKey: minioSecretKey,
      bucket: process.env.MINIO_BUCKET || 'slms-docs',
      publicUrl: process.env.MINIO_PUBLIC_URL || 'http://localhost:9000/slms-docs',
    },

    // Swagger
    swagger: {
      enabled: process.env.SWAGGER_ENABLED !== 'false',
    },

    // Future: Keycloak OIDC
    // keycloak: {
    //   realm: process.env.KEYCLOAK_REALM,
    //   authServerUrl: process.env.KEYCLOAK_AUTH_SERVER_URL,
    //   clientId: process.env.KEYCLOAK_CLIENT_ID,
    //   clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
    // },
  };
};
