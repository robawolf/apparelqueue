# Theme Seeding System

This directory contains tools for seeding default themes into your Sanity dataset.

## Quick Start

```bash
# Seed all default themes
npm run seed-themes seed

# Check what themes exist
npm run seed-themes check

# Activate the minimal theme
npm run seed-themes activate theme-minimal
```

## Available Commands

### Seed All Themes
```bash
npm run seed-themes seed
```
Creates all 6 default themes in your Sanity dataset. The "Default Stablo Theme" will be marked as active.

### Seed Individual Theme
```bash
npm run seed-themes seed-one theme-minimal
npm run seed-themes seed-one theme-warm
```
Seeds a specific theme by its ID.

### Check Existing Themes
```bash
npm run seed-themes check
```
Lists all themes currently in your Sanity dataset, showing their status and key details.

### Activate a Theme
```bash
npm run seed-themes activate theme-tech
```
Sets the specified theme as active (deactivates all others). Changes will appear immediately on your site.

### Clear All Themes
```bash
npm run seed-themes clear
```
⚠️ **Warning**: Removes all theme documents from Sanity. Use with caution.

### Reset Themes
```bash
npm run seed-themes reset
```
Clears all existing themes and re-seeds the defaults. Useful for development.

## Default Themes

### 1. Default Stablo Theme (`theme-default`)
- **Colors**: Blue primary (#3B82F6), gray secondary
- **Typography**: Inter font family
- **Style**: Rounded buttons, shadow cards
- **Use case**: General purpose, clean design

### 2. Minimal Theme (`theme-minimal`)
- **Colors**: Dark gray primary (#1F2937), muted palette
- **Typography**: Inter with smaller scale
- **Style**: Sharp corners, border cards, transparent navbar
- **Use case**: Clean, professional sites

### 3. Warm & Cozy Theme (`theme-warm`)
- **Colors**: Red primary (#DC2626), warm amber accents
- **Typography**: Lora serif fonts, larger base size
- **Style**: Large radius, elevated cards, blur navbar
- **Use case**: Editorial, blog, storytelling sites

### 4. Tech Startup Theme (`theme-tech`)
- **Colors**: Violet primary (#8B5CF6), cyan and pink accents
- **Typography**: Montserrat headings, Inter body
- **Style**: Pill buttons, elevated cards, wide container
- **Use case**: Tech companies, startups, modern businesses

### 5. Elegant Magazine Theme (`theme-elegant`)
- **Colors**: Dark slate primary (#0F172A), red accent
- **Typography**: Playfair Display headings, Source Sans Pro body
- **Style**: Subtle radius, flat cards, dramatic type scale
- **Use case**: Magazines, luxury brands, editorial content

### 6. Nature & Outdoors Theme (`theme-nature`)
- **Colors**: Emerald green primary (#059669), earth tones
- **Typography**: Merriweather headings, Open Sans body
- **Style**: Rounded style, shadow cards
- **Use case**: Environmental, travel, outdoor brands

## Theme Structure

Each theme includes:

```javascript
{
  _type: "theme",
  _id: "theme-xxx",
  title: "Theme Name",
  slug: { current: "slug" },
  
  // Brand Colors
  primaryColor: { hex: "#XXXXXX" },
  secondaryColor: { hex: "#XXXXXX" },
  accentColor: { hex: "#XXXXXX" },
  neutralColor: { hex: "#XXXXXX" },
  
  // Typography
  headingFont: "Font Name",
  bodyFont: "Font Name",
  fontSize: { base: "16px", scale: 1.25 },
  
  // Layout & Spacing
  borderRadius: "md",
  spacing: {
    containerWidth: "1200px",
    sectionSpacing: "2rem"
  },
  
  // Components
  buttonStyle: "rounded",
  cardStyle: "shadow", 
  navbarStyle: "solid",
  
  isActive: false
}
```

## Integration with Frontend

Once seeded, themes are automatically:

1. **Loaded by ThemeLoader**: Fetches active theme from Sanity
2. **Converted to CSS**: Generates CSS variables via `generateThemeCSS()`
3. **Injected into DOM**: Applied via ThemeProvider context
4. **Updated in real-time**: Changes in Sanity Studio appear immediately

## Development Workflow

1. **Initial Setup**: `npm run seed-themes seed`
2. **Design in Sanity**: Edit themes in Studio at `/studio`
3. **Test Changes**: Use ThemeDevPanel to see live updates
4. **Switch Themes**: Use `activate` command or toggle in Studio
5. **Deploy**: Themes are automatically loaded in production

## Customization

### Adding New Themes

1. Add your theme to `defaultThemes.js`
2. Run `npm run seed-themes seed-one your-theme-id`
3. Activate with `npm run seed-themes activate your-theme-id`

### Modifying Existing Themes

Edit themes directly in Sanity Studio or modify the seed files and re-run seeding.

## Troubleshooting

### Theme Not Loading
- Check Sanity connection: `npm run seed-themes check`
- Verify active theme: Look for ✅ Active marker
- Check browser console for errors

### Changes Not Appearing
- Ensure theme is marked as `isActive: true`
- Check ThemeDevPanel in development mode
- Verify CSS variables in browser dev tools

### Seeding Failures
- Ensure Sanity credentials are configured
- Check network connection
- Verify theme schema is deployed to Sanity




