export default () => ({
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  nodeEnv: process.env.NODE_ENV || 'development',

  // Registration: only restrict to energi-up.com in production; dev/local allow any email.
  // Set REGISTRATION_DOMAIN_RESTRICTION_ENABLED=false to allow any email (e.g. local Docker with NODE_ENV=production).
  registration: {
    domainRestrictionEnabled:
      process.env.REGISTRATION_DOMAIN_RESTRICTION_ENABLED === 'true' ||
      (process.env.REGISTRATION_DOMAIN_RESTRICTION_ENABLED !== 'false' &&
        process.env.NODE_ENV === 'production'),
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
    secret: process.env.JWT_SECRET || 'super-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key-change-in-production',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    adminSecret: process.env.JWT_ADMIN_SECRET || 'admin-secret-key-change-in-production',
    adminExpiresIn: process.env.JWT_ADMIN_EXPIRES_IN || '8h',
  },

  // CORS (include 3002 for Docker web; 127.0.0.1 variants are added in main.ts)
  cors: {
    origins: process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3002,http://localhost:1337',
  },

  // MinIO (document storage)
  minio: {
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
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
});
