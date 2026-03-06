import { renderBaseEmailTemplate } from '../../notification-engine/templates/base-email.template';

export function buildResetPasswordSubject(): string {
  return 'Reset your password';
}

export function buildResetPasswordText(params: { resetUrl: string }): string {
  return [
    'You requested a password reset.',
    '',
    'Click the link below to set a new password:',
    params.resetUrl,
    '',
    'This link expires in 1 hour. If you did not request this, you can safely ignore this email.',
  ].join('\n');
}

export interface ResetPasswordHtmlParams {
  resetUrl: string;
  webUrl?: string;
}

export function buildResetPasswordHtml(params: ResetPasswordHtmlParams): string {
  const { resetUrl, webUrl } = params;

  const contentHtml = `
<p style="margin: 0; color: #6B6B6B; font-size: 14px; line-height: 1.5;"><strong>This link expires in 1 hour.</strong> If you did not request a password reset, you can safely ignore this email.</p>
`.trim();

  return renderBaseEmailTemplate({
    headerTitle: 'Reset your password',
    // Omit logo to avoid broken image when email client blocks images or URL is unreachable
    logoUrl: undefined,
    greeting: 'Hello,',
    subtitle: 'You requested a password reset. Click the link below to set a new password.',
    contentHtml,
    cta: { text: 'Reset password', url: resetUrl },
    footerText:
      'This is an automated message from the Sustainability Licensing Management System (SLMS). Please do not reply to this email.',
    previewText: 'Reset your password – link expires in 1 hour.',
  });
}
