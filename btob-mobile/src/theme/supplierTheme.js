import { BRAND } from './brand';

/**
 * Generates a structured theme object from supplier data.
 * Fallbacks to BRAND constants if supplier data is missing.
 */
export const getSupplierTheme = (supplier) => {
  if (!supplier) return {
    primary: BRAND.colors.primary,
    secondary: BRAND.colors.white,
    navbar: BRAND.colors.primary,
    navbarText: BRAND.colors.white,
    footer: BRAND.colors.slate[100],
    text: BRAND.colors.slate[800],
    accent: BRAND.colors.secondary,
    bg: BRAND.colors.slate[100],
    card: BRAND.colors.white,
    border: BRAND.colors.slate[200],
  };

  const primary = supplier.primary_color || BRAND.colors.primary;
  const secondary = supplier.secondary_color || BRAND.colors.white;
  const footer = supplier.footer_color || BRAND.colors.slate[50];
  const navbar = supplier.navbar_color || primary;

  // Helper to determine if a color is "Light" or "Dark" for contrast
  const getContrastText = (hexcolor, defaultDark = BRAND.colors.slate[800], defaultLight = '#FFFFFF') => {
    if (!hexcolor) return defaultDark;
    const r = parseInt(hexcolor.slice(1, 3), 16);
    const g = parseInt(hexcolor.slice(3, 5), 16);
    const b = parseInt(hexcolor.slice(5, 7), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? defaultDark : defaultLight;
  };

  const mainText = getContrastText(secondary);

  return {
    primary,
    secondary,
    primaryMuted: primary + '15',
    navbar,
    navbarText: supplier.navbar_text_color || getContrastText(navbar),
    footer,
    footerText: supplier.footer_text_color || getContrastText(footer),
    text: mainText,
    textMuted: mainText + '99',
    accent: supplier.accent_color || primary || BRAND.colors.secondary,
    bg: secondary,
    card: getContrastText(secondary) === '#FFFFFF' ? 'rgba(255,255,255,0.1)' : '#FFFFFF',
    border: mainText + '20',
    surface: '#FFFFFF',
    shadow: primary + '33',
  };
};
