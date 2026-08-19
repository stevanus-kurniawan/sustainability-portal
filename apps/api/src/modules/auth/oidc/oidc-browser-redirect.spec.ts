import { sendOidcBrowserRedirect } from './oidc-browser-redirect';

describe('sendOidcBrowserRedirect', () => {
  it('returns 200 HTML that navigates after cookies can be stored', () => {
    const headers: Record<string, string> = {};
    const res = {
      setHeader: (k: string, v: string) => {
        headers[k] = v;
      },
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    sendOidcBrowserRedirect(res as any, 'http://portal.example:8000/');

    expect(res.status).toHaveBeenCalledWith(200);
    expect(headers['Content-Type']).toMatch(/text\/html/);
    const html = (res.send as jest.Mock).mock.calls[0][0] as string;
    expect(html).toContain('window.location.replace');
    expect(html).toContain('http://portal.example:8000/');
  });
});
