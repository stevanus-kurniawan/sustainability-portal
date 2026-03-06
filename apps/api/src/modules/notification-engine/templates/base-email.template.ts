import { getEmailThemeFromTokens } from '../../../config/email-theme';

export interface BaseEmailTemplateParams {
  /** Header title (e.g. "System Generated Email") */
  headerTitle?: string;
  /** Logo URL (absolute, e.g. https://example.com/logo.png) */
  logoUrl?: string;
  /** Greeting (e.g. "Hello," or "Hello Mr/Mrs, (fullname)" if fullname exists) */
  greeting?: string;
  /** Optional subtitle */
  subtitle?: string;
  /** REQUIRED: existing email body HTML (content) */
  contentHtml: string;
  /** Optional CTA button */
  cta?: { text: string; url: string };
  /** Footer text (default: "Please do not reply to this email.") */
  footerText?: string;
  /** Hidden preheader text for inbox preview */
  previewText?: string;
}

const DEFAULT_HEADER_TITLE = 'Sustainability Portal';
const DEFAULT_FOOTER_TEXT =
  'This is an automated message from the Sustainability Licensing Management System (SLMS). Please do not reply to this email.';

/**
 * Renders a consistent branded HTML email template.
 * Uses design tokens, table-based layout, inline CSS, Outlook/Gmail friendly.
 */
export function renderBaseEmailTemplate(params: BaseEmailTemplateParams): string {
  const {
    headerTitle = DEFAULT_HEADER_TITLE,
    logoUrl,
    greeting,
    subtitle,
    contentHtml,
    cta,
    footerText = DEFAULT_FOOTER_TEXT,
    previewText,
  } = params;

  const theme = getEmailThemeFromTokens();

  // Preheader: hidden text for inbox preview (Gmail, Apple Mail, etc.)
  const preheaderHtml = previewText
    ? `<!--[if !mso]><!--><span style="display:none;max-height:0;max-width:0;overflow:hidden;mso-hide:all;">${previewText}</span><!--<![endif]-->`
    : '';

  // Only show logo when URL is absolute (http/https); relative or invalid URLs cause broken images in email clients
  const hasValidLogoUrl =
    logoUrl &&
    typeof logoUrl === 'string' &&
    (logoUrl.startsWith('https://') || logoUrl.startsWith('http://'));
  const logoBlock =
    hasValidLogoUrl
      ? `
    <tr>
      <td align="center" style="padding: 28px 24px 12px 24px;">
        <img src="${logoUrl}" alt="Logo" width="72" height="72" style="display:block;max-width:72px;height:auto;border:0;" />
      </td>
    </tr>
`
      : '';

  const greetingBlock = greeting
    ? `
    <tr>
      <td style="padding: 0 32px 8px 32px; font-family: ${theme.fontFamily}; font-size: 22px; font-weight: 700; color: ${theme.text}; line-height: 1.35; letter-spacing: -0.02em;">
        ${greeting}
      </td>
    </tr>
`
    : '';

  const subtitleBlock = subtitle
    ? `
    <tr>
      <td style="padding: 0 32px 20px 32px; font-family: ${theme.fontFamily}; font-size: ${theme.fontSizeSmall}; color: ${theme.mutedText}; line-height: 1.55;">
        ${subtitle}
      </td>
    </tr>
`
    : '';

  const dividerBlock =
    greeting || subtitle || hasValidLogoUrl
      ? `
    <tr>
      <td style="padding: 0 32px; border-bottom: 1px solid ${theme.border};"></td>
    </tr>
`
      : '';

  // Escape URL for HTML so token query string (e.g. containing &) does not break the link
  const ctaHref = cta ? cta.url.replace(/&/g, '&amp;').replace(/"/g, '&quot;') : '';
  // Button styled like app primary: #C43A31 bg, white text, rounded. Background on both td and a for Outlook/Gmail compatibility.
  const ctaBlock = cta
    ? `
    <tr>
      <td style="padding: 28px 32px 8px 32px; text-align: center;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto;">
          <tr>
            <td align="center" style="border-radius: 8px; background-color: ${theme.primary};">
              <a href="${ctaHref}" target="_blank" rel="noopener noreferrer" style="display: block; padding: 12px 24px; font-family: ${theme.fontFamily}; font-size: 14px; font-weight: 600; color: #FFFFFF !important; -webkit-text-fill-color: #FFFFFF; text-decoration: none; border-radius: 8px; background-color: ${theme.primary};">${cta.text}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${headerTitle}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${theme.bg};font-family:${theme.fontFamily};-webkit-font-smoothing:antialiased;">
${preheaderHtml}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${theme.bg}; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px; margin: 0 auto; background-color: ${theme.cardBg}; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.12);">
          <!-- Header bar -->
          <tr>
            <td style="background-color: ${theme.headerBg}; padding: 20px 32px; text-align: center;">
              <span style="font-family: ${theme.fontFamily}; font-size: 18px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.02em;">${headerTitle}</span>
            </td>
          </tr>
          ${logoBlock}
          ${greetingBlock}
          ${subtitleBlock}
          ${dividerBlock}
          <!-- Content -->
          <tr>
            <td style="padding: 24px 32px; font-family: ${theme.fontFamily}; font-size: ${theme.fontSizeBase}; color: ${theme.text}; line-height: 1.6;">
              ${contentHtml}
            </td>
          </tr>
          ${ctaBlock}
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; font-family: ${theme.fontFamily}; font-size: 12px; color: ${theme.mutedText}; line-height: 1.5; border-top: 1px solid ${theme.border}; background-color: #FAFAFA;">
              ${footerText}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
