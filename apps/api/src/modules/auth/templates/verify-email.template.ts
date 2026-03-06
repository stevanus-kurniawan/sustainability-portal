import { renderBaseEmailTemplate } from '../../notification-engine/templates/base-email.template';

export function buildVerifyEmailSubject(): string {
  return 'Verify your email';
}

export function buildVerifyEmailText(params: { verifyUrl: string }): string {
  return [
    'Welcome!',
    '',
    'Please verify your email address by clicking the link below:',
    params.verifyUrl,
    '',
    'This link expires in 15 minutes.',
  ].join('\n');
}

export interface VerifyEmailHtmlParams {
  verifyUrl: string;
  /** Web app base URL for logo (e.g. http://localhost:3000) */
  webUrl?: string;
}

/** Escape for HTML attribute so link works in all email clients (e.g. Outlook). */
function escapeUrlForHtml(url: string): string {
  return url.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function buildVerifyEmailHtml(params: VerifyEmailHtmlParams): string {
  const { verifyUrl, webUrl } = params;
  const safeUrl = escapeUrlForHtml(verifyUrl);

  const contentHtml = `
<p style="margin: 0; color: #6B6B6B; font-size: 14px;"><strong>This link expires in 15 minutes.</strong></p>
<p style="margin: 12px 0 0 0; color: #6B6B6B; font-size: 13px;">If the button does not open in your browser, copy and paste this link into your address bar:</p>
<p style="margin: 6px 0 0 0; word-break: break-all;"><a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color: #8B1538;">${escapeUrlForHtml(verifyUrl)}</a></p>
`.trim();

  return renderBaseEmailTemplate({
    headerTitle: 'Verify your email',
    logoUrl: webUrl ? `${webUrl.replace(/\/$/, '')}/logo.png` : undefined,
    greeting: 'Welcome!',
    subtitle: 'Please verify your email address to activate your account.',
    contentHtml,
    cta: { text: 'Verify your email', url: verifyUrl },
    footerText:
      'This is an automated message from the Sustainability Licensing Management System (SLMS). Please do not reply to this email.',
    previewText: 'Please verify your email address to activate your account.',
  });
}
