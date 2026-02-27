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

  const preheaderHtml = previewText
    ? `<!--[if !mso]><!--><div style="display:none;max-height:0;overflow:hidden;">${previewText}</div><!--<![endif]-->`
    : '';

  const logoBlock = logoUrl
    ? `
    <tr>
      <td align="center" style="padding: 24px 24px 16px 24px;">
        <img src="${logoUrl}" alt="Logo" width="64" height="64" style="display:block;max-width:64px;height:auto;border:0;" />
      </td>
    </tr>
`
    : '';

  const greetingBlock = greeting
    ? `
    <tr>
      <td style="padding: 0 24px 16px 24px; font-family: ${theme.fontFamily}; font-size: ${theme.fontSizeH2}; font-weight: bold; color: ${theme.text}; line-height: 1.3;">
        ${greeting}
      </td>
    </tr>
`
    : '';

  const subtitleBlock = subtitle
    ? `
    <tr>
      <td style="padding: 0 24px 16px 24px; font-family: ${theme.fontFamily}; font-size: ${theme.fontSizeSmall}; color: ${theme.mutedText}; line-height: 1.5;">
        ${subtitle}
      </td>
    </tr>
`
    : '';

  const dividerBlock =
    greeting || subtitle || logoUrl
      ? `
    <tr>
      <td style="padding: 0 24px 16px 24px; border-bottom: 2px solid ${theme.primary};"></td>
    </tr>
`
      : '';

  const ctaBlock = cta
    ? `
    <tr>
      <td style="padding: 20px 24px 0 24px; text-align: center;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto;">
          <tr>
            <td style="border-radius: ${theme.radius}; background-color: ${theme.primary};">
              <a href="${cta.url}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 24px; font-family: ${theme.fontFamily}; font-size: ${theme.fontSizeBase}; font-weight: 600; color: #FFFFFF; text-decoration: none; border-radius: ${theme.radius};">
                ${cta.text}
              </a>
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
</head>
<body style="margin:0;padding:0;background-color:${theme.bg};font-family:${theme.fontFamily};-webkit-font-smoothing:antialiased;">
${preheaderHtml}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${theme.bg};">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;margin:0 auto;background-color:${theme.cardBg};border-radius:${theme.radius};overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.15);">
          <!-- Header bar -->
          <tr>
            <td style="background-color:${theme.headerBg};padding:16px 24px;text-align:center;">
              <span style="font-family:${theme.fontFamily};font-size:${theme.fontSizeH2};font-weight:bold;color:#FFFFFF;">${headerTitle}</span>
            </td>
          </tr>
          ${logoBlock}
          ${greetingBlock}
          ${subtitleBlock}
          ${dividerBlock}
          <!-- Content -->
          <tr>
            <td style="padding: 24px; font-family: ${theme.fontFamily}; font-size: ${theme.fontSizeBase}; color: ${theme.text}; line-height: 1.6;">
              ${contentHtml}
            </td>
          </tr>
          ${ctaBlock}
          <!-- Footer -->
          <tr>
            <td style="padding: 24px; font-family: ${theme.fontFamily}; font-size: 12px; color: ${theme.mutedText}; line-height: 1.5; border-top: 1px solid ${theme.border};">
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
