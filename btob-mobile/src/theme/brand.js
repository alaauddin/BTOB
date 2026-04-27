/**
 * brand.js
 * 
 * Rawaage Brand Identity Design Tokens.
 */

export const BRAND = {
  colors: {
    primary: '#2B587E',       // Steel Blue
    primaryLight: '#5C8EAE',  // Light Blue
    primaryDark: '#1E3C52',
    secondary: '#D27321',      // Vibrant Orange
    secondaryLight: '#F39C12',
    accent: '#CBA660',         // Gold Accent
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    white: '#FFFFFF',
    slate: {
      50: '#F8FAFC',
      100: '#F1F5F9',
      200: '#E2E8F0',
      300: '#CBD5E1',
      400: '#94A3B8',
      500: '#64748B',
      600: '#475569',
      700: '#334155',
      800: '#1E293B',
      900: '#0F172A',
    },
    glass: 'rgba(255, 255, 255, 0.15)',
    glassDark: 'rgba(0, 0, 0, 0.2)',
  },
  typography: {
    regular: 'Cairo_400Regular',
    medium: 'Cairo_500Medium',
    semiBold: 'Cairo_600SemiBold',
    bold: 'Cairo_700Bold',
    extraBold: 'Cairo_900Black',
  },
  gradients: {
    primary: ['#2B587E', '#5C8EAE'],
    secondary: ['#D27321', '#F39C12'],
    glass: ['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.05)'],
  }
};
