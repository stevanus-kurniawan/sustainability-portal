/**
 * Email theme tokens derived from design system.
 * Source: apps/web/tailwind.config.ts, apps/web/src/app/globals.css
 * These values are resolved to literal colors for email clients (no CSS vars).
 */
export interface EmailTheme {
  /** Outer background (dark/brand) */
  bg: string;
  /** Card/container background */
  cardBg: string;
  /** Header bar background (primary/danger/accent) */
  headerBg: string;
  /** Primary text color */
  text: string;
  /** Muted/secondary text */
  mutedText: string;
  /** Primary brand color (buttons, links, accents) */
  primary: string;
  /** Border color */
  border: string;
  /** Border radius (use pixel values for email) */
  radius: string;
  /** Font stack (email-safe) */
  fontFamily: string;
  /** Body font size */
  fontSizeBase: string;
  /** Small font size */
  fontSizeSmall: string;
  /** Heading font size */
  fontSizeH2: string;
}

/**
 * Returns email-safe theme values from design tokens.
 * All values are literal strings for inline CSS (no CSS variables).
 */
export function getEmailThemeFromTokens(): EmailTheme {
  return {
    bg: '#9E2C25',        // brand.deep - dark header/outer background
    cardBg: '#FFFFFF',    // surface
    headerBg: '#C43A31',  // primary / danger / brand.primary
    text: '#2B2B2B',      // charcoal
    mutedText: '#6B6B6B', // steel
    primary: '#C43A31',   // primary / danger
    border: '#E0E0E0',    // border-light
    radius: '8px',        // md from tailwind
    fontFamily: 'Inter, Arial, Helvetica, sans-serif',
    fontSizeBase: '16px',
    fontSizeSmall: '14px',
    fontSizeH2: '24px',
  };
}
