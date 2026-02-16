/**
 * Sanity queries for theme data
 */

import { defineQuery } from 'next-sanity'

// Query to fetch theme configuration
export const THEME_QUERY = defineQuery(`
  *[_type == "theme" && defined(slug.current)] | order(_createdAt desc) {
    _id,
    _createdAt,
    title,
    "slug": slug.current,
    primaryColor,
    secondaryColor,
    accentColor,
    neutralColor,
    headingFont,
    bodyFont,
    fontSize,
    borderRadius,
    spacing,
    buttonStyle,
    cardStyle,
    navbarStyle,
    description
  }
`)

// Query to fetch a specific theme by slug
export const THEME_BY_SLUG_QUERY = defineQuery(`
  *[_type == "theme" && slug.current == $slug][0] {
    _id,
    _createdAt,
    title,
    "slug": slug.current,
    primaryColor,
    secondaryColor,
    accentColor,
    neutralColor,
    headingFont,
    bodyFont,
    fontSize,
    borderRadius,
    spacing,
    buttonStyle,
    cardStyle,
    navbarStyle,
    description
  }
`)

// Query to fetch the default/active theme
export const ACTIVE_THEME_QUERY = defineQuery(`
  *[_type == "theme" && defined(slug.current)] | order(_createdAt desc)[0] {
    _id,
    _createdAt,
    title,
    "slug": slug.current,
    primaryColor,
    secondaryColor,
    accentColor,
    neutralColor,
    headingFont,
    bodyFont,
    fontSize,
    borderRadius,
    spacing,
    buttonStyle,
    cardStyle,
    navbarStyle,
    description
  }
`)

// Query for theme preview data (lighter payload)
export const THEME_PREVIEW_QUERY = defineQuery(`
  *[_type == "theme" && defined(slug.current)] | order(_createdAt desc) {
    _id,
    title,
    "slug": slug.current,
    primaryColor,
    headingFont,
    buttonStyle
  }
`)