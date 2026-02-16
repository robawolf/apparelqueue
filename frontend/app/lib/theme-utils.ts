import { ThemeConfig } from '@/app/context/ThemeContext'
import type { Color } from '@/sanity.types'

// Default theme values to fall back on
const DEFAULT_THEME = {
  primaryColor: '#3b82f6', // blue-500
  secondaryColor: '#64748b', // slate-500
  accentColor: '#10b981', // emerald-500
  neutralColor: '#6b7280', // gray-500
  headingFont: 'Inter',
  bodyFont: 'Inter',
  fontSize: {
    base: '16px',
    scale: 1.25
  },
  borderRadius: 'md',
  spacing: {
    containerWidth: '1200px',
    sectionSpacing: '2rem'
  },
  buttonStyle: 'rounded',
  cardStyle: 'shadow',
  navbarStyle: 'solid'
}

/**
 * Converts a Sanity color object to a hex string
 */
function getColorValue(color?: Color | null): string {
  if (!color?.hex) return ''
  return color.hex
}

/**
 * Converts border radius setting to CSS value
 */
function getBorderRadiusValue(borderRadius?: string): string {
  const radiusMap = {
    none: '0px',
    sm: '2px',
    md: '6px',
    lg: '12px',
    xl: '24px',
    full: '9999px'
  }
  return radiusMap[borderRadius as keyof typeof radiusMap] || radiusMap.md
}

/**
 * Generates font size scale based on base size and ratio
 */
function generateFontScale(fontSize?: { base?: string; scale?: number } | null) {
  const base = fontSize?.base || DEFAULT_THEME.fontSize.base
  const scale = fontSize?.scale || DEFAULT_THEME.fontSize.scale

  const baseSize = parseFloat(base)
  const unit = base.replace(baseSize.toString(), '')

  return {
    xs: `${(baseSize / Math.pow(scale, 2)).toFixed(2)}${unit}`,
    sm: `${(baseSize / scale).toFixed(2)}${unit}`,
    base: base,
    lg: `${(baseSize * scale).toFixed(2)}${unit}`,
    xl: `${(baseSize * Math.pow(scale, 2)).toFixed(2)}${unit}`,
    '2xl': `${(baseSize * Math.pow(scale, 3)).toFixed(2)}${unit}`,
    '3xl': `${(baseSize * Math.pow(scale, 4)).toFixed(2)}${unit}`,
    '4xl': `${(baseSize * Math.pow(scale, 5)).toFixed(2)}${unit}`,
  }
}

/**
 * Generates Google Fonts URL for the selected fonts
 */
export function generateFontsUrl(theme?: ThemeConfig | null): string {
  if (!theme) return ''

  const fonts = new Set<string>()

  if (theme.headingFont && theme.headingFont !== 'Inter') {
    fonts.add(theme.headingFont.replace(' ', '+'))
  }

  if (theme.bodyFont && theme.bodyFont !== 'Inter' && theme.bodyFont !== theme.headingFont) {
    fonts.add(theme.bodyFont.replace(' ', '+'))
  }

  if (fonts.size === 0) return ''

  return `https://fonts.googleapis.com/css2?${Array.from(fonts).map(font =>
    `family=${font}:wght@300;400;500;600;700&display=swap`
  ).join('&')}`
}

/**
 * Converts theme configuration to CSS custom properties
 */
export function themeToCustomProperties(theme?: ThemeConfig | null): Record<string, string> {
  if (!theme) return {}

  const fontScale = generateFontScale(theme.fontSize)

  return {
    // Colors
    '--color-primary': getColorValue(theme.primaryColor) || DEFAULT_THEME.primaryColor,
    '--color-secondary': getColorValue(theme.secondaryColor) || DEFAULT_THEME.secondaryColor,
    '--color-accent': getColorValue(theme.accentColor) || DEFAULT_THEME.accentColor,
    '--color-neutral': getColorValue(theme.neutralColor) || DEFAULT_THEME.neutralColor,

    // Typography
    '--font-heading': theme.headingFont || DEFAULT_THEME.headingFont,
    '--font-body': theme.bodyFont || DEFAULT_THEME.bodyFont,
    '--text-xs': fontScale.xs,
    '--text-sm': fontScale.sm,
    '--text-base': fontScale.base,
    '--text-lg': fontScale.lg,
    '--text-xl': fontScale.xl,
    '--text-2xl': fontScale['2xl'],
    '--text-3xl': fontScale['3xl'],
    '--text-4xl': fontScale['4xl'],

    // Layout
    '--border-radius': getBorderRadiusValue(theme.borderRadius || undefined),
    '--container-width': theme.spacing?.containerWidth || DEFAULT_THEME.spacing.containerWidth,
    '--section-spacing': theme.spacing?.sectionSpacing || DEFAULT_THEME.spacing.sectionSpacing,

    // Component styles (these can be used by components to determine styling)
    '--button-style': theme.buttonStyle || DEFAULT_THEME.buttonStyle,
    '--card-style': theme.cardStyle || DEFAULT_THEME.cardStyle,
    '--navbar-style': theme.navbarStyle || DEFAULT_THEME.navbarStyle,
  }
}

/**
 * Converts CSS custom properties object to style string
 */
export function customPropertiesToStyleString(properties: Record<string, string>): string {
  return Object.entries(properties)
    .map(([key, value]) => `${key}: ${value};`)
    .join(' ')
}

/**
 * Generates Tailwind CSS classes based on theme configuration
 */
export function generateThemeClasses(theme?: ThemeConfig | null): {
  button: string
  card: string
  container: string
  heading: string
  body: string
} {
  if (!theme) {
    return {
      button: 'rounded-md',
      card: 'shadow-md',
      container: 'max-w-7xl',
      heading: 'font-inter',
      body: 'font-inter'
    }
  }

  // Button classes
  const buttonClasses = theme.buttonStyle === 'pill'
    ? 'rounded-full'
    : theme.buttonStyle === 'square'
    ? 'rounded-none'
    : 'rounded-md'

  // Card classes
  const cardClasses = theme.cardStyle === 'flat'
    ? 'border-0 shadow-none'
    : theme.cardStyle === 'border'
    ? 'border border-gray-200 shadow-none'
    : theme.cardStyle === 'elevated'
    ? 'shadow-lg'
    : 'shadow-md'

  // Container classes based on width
  const containerClasses = theme.spacing?.containerWidth === '1024px'
    ? 'max-w-5xl'
    : theme.spacing?.containerWidth === '1400px'
    ? 'max-w-7xl'
    : theme.spacing?.containerWidth === '1600px'
    ? 'max-w-8xl'
    : 'max-w-6xl'

  return {
    button: buttonClasses,
    card: cardClasses,
    container: containerClasses,
    heading: `font-[var(--font-heading)]`,
    body: `font-[var(--font-body)]`
  }
}