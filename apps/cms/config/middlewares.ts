export default ({ env }: { env: any }) => {
  // Parse storage endpoint for CSP
  const storageEndpoint = env('STORAGE_ENDPOINT', 'http://localhost:9000');
  const storageHost = storageEndpoint.replace('http://', '').replace('https://', '').split('/')[0];

  // Parse base URL if different from endpoint (e.g., Alibaba Cloud OSS CDN)
  const storageBaseUrl = env('STORAGE_BASE_URL', '');
  const baseUrlHost = storageBaseUrl ? storageBaseUrl.replace('http://', '').replace('https://', '').split('/')[0] : '';

  // Build CSP hosts list
  const cspHosts = [storageHost];
  if (baseUrlHost && baseUrlHost !== storageHost) {
    cspHosts.push(baseUrlHost);
  }
  // Add Alibaba Cloud OSS domains
  cspHosts.push('*.aliyuncs.com', '*.oss-cn-*.aliyuncs.com');

  return [
    'strapi::logger',
    'strapi::errors',
    {
      name: 'strapi::security',
      config: {
        contentSecurityPolicy: {
          useDefaults: true,
          directives: {
            'connect-src': ["'self'", 'https:'],
            'img-src': [
              "'self'",
              'data:',
              'blob:',
              'market-assets.strapi.io',
              ...cspHosts,
            ],
            'media-src': [
              "'self'",
              'data:',
              'blob:',
              ...cspHosts,
            ],
            upgradeInsecureRequests: null,
          },
        },
      },
    },
    {
      name: 'strapi::cors',
      config: {
        origin: [
          'http://localhost:3000',
          'http://localhost:3001',
          storageEndpoint,
        ],
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
        headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
        keepHeaderOnError: true,
      },
    },
    'strapi::poweredBy',
    'strapi::query',
    'strapi::body',
    'strapi::session',
    'strapi::favicon',
    'strapi::public',
  ];
};
