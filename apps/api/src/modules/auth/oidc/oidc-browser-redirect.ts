import { Response } from 'express';

/**
 * Return 200 HTML that sets cookies on this document, then navigates.
 * A 303 Location + Set-Cookie is dropped by some browsers/proxies (and by
 * Next.js NextResponse.redirect), which leaves Hub SSO users on /login.
 */
export function sendOidcBrowserRedirect(res: Response, dest: string): void {
  const safeJson = JSON.stringify(dest);
  const safeAttr = dest
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="Cache-Control" content="no-store"><title>Signing in</title><script>(function(){var d=${safeJson};function go(){window.location.replace(d);}if(document.readyState==="complete"){setTimeout(go,50);}else{window.addEventListener("load",function(){setTimeout(go,50);});}})();</script><noscript><meta http-equiv="refresh" content="0;url=${safeAttr}"></noscript></head><body><p>Signing you in…</p></body></html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.status(200).send(html);
}
