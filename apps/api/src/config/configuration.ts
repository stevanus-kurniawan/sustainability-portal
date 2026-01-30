export default () => ({
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  nodeEnv: process.env.NODE_ENV || 'development',

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
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key-change-in-production',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    adminSecret: process.env.JWT_ADMIN_SECRET || 'admin-secret-key-change-in-production',
    adminExpiresIn: process.env.JWT_ADMIN_EXPIRES_IN || '15m',
  },

  // CORS
  cors: {
    origins: process.env.CORS_ORIGINS || 'http://localhost:3000',
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
