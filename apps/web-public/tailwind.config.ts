import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors from design tokens
        brand: {
          primary: '#C43A31',
          deep: '#9E2C25',
        },
        // Semantic colors
        primary: {
          DEFAULT: '#C43A31',
          foreground: '#FFFFFF',
          hover: '#9E2C25',
        },
        secondary: {
          DEFAULT: '#F4F4F4',
          foreground: '#2B2B2B',
          hover: '#E8E8E8',
        },
        destructive: {
          DEFAULT: '#C43A31',
          foreground: '#FFFFFF',
        },
        // Text colors
        charcoal: '#2B2B2B',
        steel: '#6B6B6B',
        // Background colors
        surface: '#FFFFFF',
        light: '#F4F4F4',
        lighter: '#FAFAFA',
        // Border colors
        'border-light': '#E0E0E0',
        'border-medium': '#C4C4C4',
        'border-dark': '#9E9E9E',
        // Status colors
        success: '#00d97e',
        warning: '#fdab3d',
        danger: '#C43A31',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Merriweather', 'Georgia', 'serif'],
      },
      fontSize: {
        h1: ['40px', { lineHeight: '1.2', fontWeight: '700' }],
        h2: ['32px', { lineHeight: '1.3', fontWeight: '700' }],
        h3: ['24px', { lineHeight: '1.4', fontWeight: '600' }],
        base: ['16px', { lineHeight: '1.5' }],
        small: ['14px', { lineHeight: '1.5' }],
        xs: ['12px', { lineHeight: '1.5' }],
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '16px',
        '4': '24px',
        '5': '32px',
        '6': '40px',
        '7': '64px',
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 2px 4px 0 rgba(0, 0, 0, 0.08)',
        lg: '0 4px 8px 0 rgba(0, 0, 0, 0.10)',
      },
      transitionDuration: {
        fast: '150ms',
        base: '200ms',
        slow: '250ms',
      },
    },
  },
  plugins: [],
};

export default config;
