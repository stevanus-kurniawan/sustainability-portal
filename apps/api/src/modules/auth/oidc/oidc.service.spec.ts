import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OidcService } from './oidc.service';

describe('OidcService.isConfigured', () => {
  async function createService(env: Record<string, string>) {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OidcService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => env[key]),
          },
        },
        { provide: JwtService, useValue: { sign: jest.fn(), verify: jest.fn() } },
      ],
    }).compile();
    return module.get(OidcService);
  }

  it('is false when discovery URL is missing', async () => {
    const service = await createService({ 'oidc.clientId': 'app' });
    expect(service.isConfigured()).toBe(false);
  });

  it('is false when discovery URL still has a placeholder host', async () => {
    const service = await createService({
      'oidc.discoveryUrl':
        'https://<hub-host>/api/sso/.well-known/openid-configuration',
      'oidc.clientId': 'app',
    });
    expect(service.isConfigured()).toBe(false);
  });

  it('is true when discovery URL and client id are set', async () => {
    const service = await createService({
      'oidc.discoveryUrl':
        'https://hub.example.com/api/sso/.well-known/openid-configuration',
      'oidc.clientId': 'sustainability-portal',
    });
    expect(service.isConfigured()).toBe(true);
  });
});
