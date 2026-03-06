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

export function buildVerifyEmailHtml(params: VerifyEmailHtmlParams): string {
  const { verifyUrl, webUrl } = params;

  const contentHtml = `
<p style="margin: 0; color: #6B6B6B; font-size: 14px; line-height: 1.5;"><strong>This link expires in 15 minutes.</strong></p>
`.trim();

  return renderBaseEmailTemplate({
    headerTitle: 'Verify your email',
    // Omit logo to avoid broken image when email client blocks images or URL is unreachable
    logoUrl: undefined,
    greeting: 'Welcome!',
    subtitle: 'Please verify your email address to activate your account.',
    contentHtml,
    cta: { text: 'Verify your email', url: verifyUrl },
    footerText:
      'This is an automated message from the Sustainability Licensing Management System (SLMS). Please do not reply to this email.',
    previewText: 'Please verify your email address to activate your account.',
  });
}
