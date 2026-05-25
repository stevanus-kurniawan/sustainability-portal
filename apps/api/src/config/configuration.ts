const DEFAULT_USER_JWT_SECRET = 'super-secret-key-change-in-production';
const DEFAULT_REFRESH_JWT_SECRET = 'refresh-secret-key-change-in-production';
const DEFAULT_ADMIN_JWT_SECRET = 'admin-secret-key-change-in-production';

export default () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProdLike = nodeEnv === 'production' || nodeEnv === 'uat';

  const jwtSecret = process.env.JWT_SECRET || DEFAULT_USER_JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || DEFAULT_REFRESH_JWT_SECRET;
  const jwtAdminSecret = process.env.JWT_ADMIN_SECRET || DEFAULT_ADMIN_JWT_SECRET;
  const storageRootPath = process.env.STORAGE_ROOT_PATH || '/app/storage';

  const weakRefreshSecrets = [DEFAULT_REFRESH_JWT_SECRET, 'refresh-secret-change-in-production'];
  const weakAdminSecrets = [DEFAULT_ADMIN_JWT_SECRET, 'admin-secret-change-in-production'];

  if (isProdLike) {
    const jwtWeak =
      jwtSecret === DEFAULT_USER_JWT_SECRET ||
      weakRefreshSecrets.includes(jwtRefreshSecret) ||
      weakAdminSecrets.includes(jwtAdminSecret);
    const filesystemMissing = !process.env.STORAGE_ROOT_PATH;

    if (jwtWeak || filesystemMissing) {
      throw new Error(
        'Security error: In production/UAT environments, JWT secrets must be set and STORAGE_ROOT_PATH must be configured.',
      );
    }
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

    // Document storage (Synology NFS/SMB mount or local bind mount)
    storage: {
      rootPath: storageRootPath,
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
