/**
 * Theme preset loading utilities
 *
 * This module provides build-time theme selection via environment variables.
 * Themes are statically defined based on the defaultThemes from the Sanity seed data,
 * enabling multi-tenant deployments via separate builds with different theme configs.
 */

import type { ThemeConfig } from '@/app/context/ThemeContext'

/**
 * Default theme presets matching studio/src/seed/defaultThemes.mjs
 * These are TypeScript versions of the themes for build-time selection
 */
const themePresets: Record<string, ThemeConfig> = {
  minimal: {
    _id: 'theme-minimal',
    title: 'Minimal Theme',
    slug: { current: 'minimal', _type: 'slug' },
    description: 'Clean, minimal design with subtle colors and sharp edges.',
    primaryColor: { hex: '#1F2937', _type: 'color' },
    secondaryColor: { hex: '#9CA3AF', _type: 'color' },
    accentColor: { hex: '#047857', _type: 'color' },
    neutralColor: { hex: '#6B7280', _type: 'color' },
    headingFont: 'Inter',
    bodyFont: 'Inter',
    fontSize: {
      base: '16px',
      scale: 1.2,
    },
    borderRadius: 'none',
    spacing: {
      containerWidth: '1024px',
      sectionSpacing: '2rem',
    },
    buttonStyle: 'square',
    cardStyle: 'border',
    navbarStyle: 'transparent',
  },

  warm: {
    _id: 'theme-warm',
    title: 'Warm & Cozy Theme',
    slug: { current: 'warm', _type: 'slug' },
    description: 'Warm colors with serif typography for a welcoming, editorial feel.',
    primaryColor: { hex: '#92400E', _type: 'color' },
    secondaryColor: { hex: '#C2410C', _type: 'color' },
    accentColor: { hex: '#BE123C', _type: 'color' },
    neutralColor: { hex: '#78350F', _type: 'color' },
    headingFont: 'Lora',
    bodyFont: 'Lora',
    fontSize: {
      base: '18px',
      scale: 1.3,
    },
    borderRadius: 'lg',
    spacing: {
      containerWidth: '1200px',
      sectionSpacing: '3rem',
    },
    buttonStyle: 'rounded',
    cardStyle: 'elevated',
    navbarStyle: 'blur',
  },

  tech: {
    _id: 'theme-tech',
    title: 'Tech Startup Theme',
    slug: { current: 'tech', _type: 'slug' },
    description: 'Modern tech aesthetic with bold colors and pill-shaped elements.',
    primaryColor: { hex: '#7C3AED', _type: 'color' },
    secondaryColor: { hex: '#0891B2', _type: 'color' },
    accentColor: { hex: '#EC4899', _type: 'color' },
    neutralColor: { hex: '#1E293B', _type: 'color' },
    headingFont: 'Montserrat',
    bodyFont: 'Inter',
    fontSize: {
      base: '16px',
      scale: 1.25,
    },
    borderRadius: 'xl',
    spacing: {
      containerWidth: '1400px',
      sectionSpacing: '4rem',
    },
    buttonStyle: 'pill',
    cardStyle: 'elevated',
    navbarStyle: 'blur',
  },

  elegant: {
    _id: 'theme-elegant',
    title: 'Elegant Magazine Theme',
    slug: { current: 'elegant', _type: 'slug' },
    description: 'Sophisticated design inspired by high-end magazines and editorial layouts.',
    primaryColor: { hex: '#0F172A', _type: 'color' },
    secondaryColor: { hex: '#64748B', _type: 'color' },
    accentColor: { hex: '#B91C1C', _type: 'color' },
    neutralColor: { hex: '#334155', _type: 'color' },
    headingFont: 'Playfair Display',
    bodyFont: 'Source Sans Pro',
    fontSize: {
      base: '16px',
      scale: 1.35,
    },
    borderRadius: 'sm',
    spacing: {
      containerWidth: '1200px',
      sectionSpacing: '3rem',
    },
    buttonStyle: 'rounded',
    cardStyle: 'flat',
    navbarStyle: 'solid',
  },

  nature: {
    _id: 'theme-nature',
    title: 'Nature & Outdoors Theme',
    slug: { current: 'nature', _type: 'slug' },
    description: 'Earth-inspired colors perfect for outdoor, travel, or environmental content.',
    primaryColor: { hex: '#047857', _type: 'color' },
    secondaryColor: { hex: '#0E7490', _type: 'color' },
    accentColor: { hex: '#B45309', _type: 'color' },
    neutralColor: { hex: '#166534', _type: 'color' },
    headingFont: 'Merriweather',
    bodyFont: 'Open Sans',
    fontSize: {
      base: '16px',
      scale: 1.25,
    },
    borderRadius: 'lg',
    spacing: {
      containerWidth: '1200px',
      sectionSpacing: '2rem',
    },
    buttonStyle: 'rounded',
    cardStyle: 'shadow',
    navbarStyle: 'solid',
  },
}

/**
 * Available theme names for validation and documentation
 */
export const AVAILABLE_THEMES = Object.keys(themePresets) as Array<keyof typeof themePresets>

/**
 * Get the theme configuration based on environment variable
 * @throws {Error} If theme name is invalid
 */
export function getThemeByName(themeName?: string): ThemeConfig {
  const name = (themeName || 'minimal').toLowerCase()

  if (!themePresets[name]) {
    throw new Error(
      `Invalid theme name: "${name}". Available themes: ${AVAILABLE_THEMES.join(', ')}`
    )
  }

  return themePresets[name]
}

/**
 * Get the current theme from environment variable
 * Uses NEXT_PUBLIC_THEME_NAME with fallback to 'minimal'
 */
export function getCurrentTheme(): ThemeConfig {
  const themeName = process.env.NEXT_PUBLIC_THEME_NAME || 'minimal'
  return getThemeByName(themeName)
}

/**
 * Validates theme name at build time
 * Call this early in your build process to fail fast on invalid configs
 */
export function validateThemeName(themeName?: string): void {
  const name = themeName || process.env.NEXT_PUBLIC_THEME_NAME || 'minimal'

  if (!themePresets[name.toLowerCase()]) {
    console.error('\n❌ Invalid theme configuration!')
    console.error(`   Theme "${name}" not found.`)
    console.error(`   Available themes: ${AVAILABLE_THEMES.join(', ')}\n`)
    throw new Error(`Invalid NEXT_PUBLIC_THEME_NAME: "${name}"`)
  }

  console.log(`✓ Using theme: ${name}`)
}
