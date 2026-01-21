export default ({ env }: { env: any }) => ({
  'users-permissions': {
    config: {
      jwtSecret: env('JWT_SECRET'),
    },
  },
  i18n: {
    enabled: true,
    config: {
      defaultLocale: 'en',
      locales: ['en'],
    },
  },
  upload: {
    config: {
      provider: 'aws-s3',
      providerOptions: {
        // Base URL for accessing uploaded files
        // For MinIO: http://localhost:9000/slms-docs
        // For Alibaba Cloud OSS: https://bucket-name.oss-region.aliyuncs.com
        baseUrl: env('STORAGE_BASE_URL', env('STORAGE_ENDPOINT', 'http://localhost:9000') + '/' + env('STORAGE_BUCKET', 'slms-docs')),
        s3Options: {
          credentials: {
            accessKeyId: env('STORAGE_ACCESS_KEY_ID', 'minioadmin'),
            secretAccessKey: env('STORAGE_ACCESS_KEY_SECRET', 'minioadmin'),
          },
          region: env('STORAGE_REGION', 'us-east-1'),
          endpoint: env('STORAGE_ENDPOINT', 'http://localhost:9000'),
          // forcePathStyle: true for MinIO and some S3-compatible services
          // forcePathStyle: false for Alibaba Cloud OSS (uses virtual-hosted style)
          forcePathStyle: env.bool('STORAGE_FORCE_PATH_STYLE', true),
        },
        params: {
          Bucket: env('STORAGE_BUCKET', 'slms-docs'),
          // Optional: Set ACL for uploaded files
          // ACL: env('STORAGE_ACL', 'public-read'),
        },
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
    },
  },
});
