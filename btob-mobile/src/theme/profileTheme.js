import { BRAND } from './brand';

/**
 * profileTheme.js
 * 
 * Central design tokens for the Merchant Profile experience.
 * Synchronized with 'Steel & Fire' identity.
 */

export const THEME = {
  colors: {
    primary: BRAND.colors.primary,
    secondary: BRAND.colors.secondary,
    slate: BRAND.colors.slate,
    emerald: '#10B981',
    amber: '#F59E0B',
    rose: '#F43F5E',
    accent: BRAND.colors.accent,
    white: '#FFFFFF',
    transparent: 'transparent',
  },
  spacing: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radius: {
    md: 12,
    lg: 20,
    xl: 24,
    xxl: 30,
    full: 999,
  }
};
