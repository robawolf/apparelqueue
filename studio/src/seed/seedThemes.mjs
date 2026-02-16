/**
 * Theme seeding script for Sanity
 * Pushes default theme configurations to the Sanity dataset
 */

import dotenv from 'dotenv';
import { createClient } from '@sanity/client';
import { defaultThemes } from './defaultThemes.mjs';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Create Sanity client for seeding
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_STUDIO_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2023-03-25',
  useCdn: false, // Don't use CDN for writing operations
  token: process.env.SANITY_API_TOKEN || process.env.SANITY_API_WRITE_TOKEN // Need write token for seeding
});

if (!client.config().projectId) {
  console.error('❌ Sanity Project ID is not set. Please check your environment variables.');
  console.error('Required: NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_STUDIO_PROJECT_ID');
  process.exit(1);
}

if (!client.config().token) {
  console.error('❌ Sanity API token is not set. Please check your environment variables.');
  console.error('Required: SANITY_API_TOKEN or SANITY_API_WRITE_TOKEN');
  console.error('You can get a token from: https://sanity.io/manage');
  process.exit(1);
}

/**
 * Seed all default themes to Sanity
 */
export async function seedAllThemes() {
  console.log('🎨 Starting theme seeding...');
  
  try {
    // Create a transaction for atomic operations
    const transaction = client.transaction();
    
    // Add each theme to the transaction
    defaultThemes.forEach(theme => {
      transaction.createOrReplace(theme);
    });
    
    // Execute the transaction
    const result = await transaction.commit();
    
    console.log(`✅ Successfully seeded ${defaultThemes.length} themes`);
    console.log('Themes created:', defaultThemes.map(t => t.title));
    
    return result;
  } catch (error) {
    console.error('❌ Failed to seed themes:', error);
    throw error;
  }
}

/**
 * Seed a specific theme by ID
 */
export async function seedTheme(themeId) {
  const theme = defaultThemes.find(t => t._id === themeId);
  
  if (!theme) {
    throw new Error(`Theme with ID "${themeId}" not found`);
  }
  
  console.log(`🎨 Seeding theme: ${theme.title}`);
  
  try {
    const result = await client.createOrReplace(theme);
    console.log(`✅ Successfully seeded theme: ${result.title}`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to seed theme ${theme.title}:`, error);
    throw error;
  }
}

/**
 * Remove all themes (use with caution)
 */
export async function clearAllThemes() {
  console.log('🗑️  Clearing all themes...');
  
  try {
    // Find all theme documents
    const themes = await client.fetch('*[_type == "theme"]{ _id }');
    
    if (themes.length === 0) {
      console.log('No themes found to clear');
      return [];
    }
    
    // Create transaction to delete all themes
    const transaction = client.transaction();
    themes.forEach(theme => {
      transaction.delete(theme._id);
    });
    
    const result = await transaction.commit();
    console.log(`✅ Cleared ${result.length} themes`);
    
    return result;
  } catch (error) {
    console.error('❌ Failed to clear themes:', error);
    throw error;
  }
}

/**
 * Reset themes - clear all and seed defaults
 */
export async function resetThemes() {
  console.log('🔄 Resetting themes...');
  
  try {
    await clearAllThemes();
    const result = await seedAllThemes();
    console.log('✅ Themes reset complete');
    return result;
  } catch (error) {
    console.error('❌ Failed to reset themes:', error);
    throw error;
  }
}

/**
 * Check if themes exist in Sanity
 */
export async function checkThemes() {
  try {
    // Get all themes
    const themes = await client.fetch(`
      *[_type == "theme"] | order(_createdAt desc) {
        _id,
        title,
        slug,
        primaryColor,
        _createdAt
      }
    `);
    
    // Get active theme from settings
    const activeThemeId = await client.fetch(`*[_type == "settings"][0].activeTheme._ref`);
    
    console.log(`📊 Found ${themes.length} themes in Sanity:`);
    
    themes.forEach(theme => {
      const isActive = theme._id === activeThemeId;
      console.log(`  - ${theme.title} (${theme.slug?.current}) ${isActive ? '✅ Active' : ''}`);
    });
    
    return themes;
  } catch (error) {
    console.error('❌ Failed to check themes:', error);
    throw error;
  }
}

/**
 * Set a theme as active by updating Settings document
 */
export async function activateTheme(themeId) {
  console.log(`🎯 Activating theme: ${themeId}`);
  
  try {
    // Get or create the settings document
    let settings = await client.fetch('*[_type == "settings"][0]{ _id }');
    
    if (!settings) {
      // Create settings document if it doesn't exist
      settings = await client.create({
        _type: 'settings',
        title: 'Site Settings',
        activeTheme: {
          _type: 'reference',
          _ref: themeId
        }
      });
    } else {
      // Update existing settings document
      await client.patch(settings._id).set({
        activeTheme: {
          _type: 'reference', 
          _ref: themeId
        }
      }).commit();
    }
    
    const activatedTheme = await client.fetch(`*[_type == "theme" && _id == $id][0]{ title }`, { id: themeId });
    
    console.log(`✅ Activated theme: ${activatedTheme?.title || themeId}`);
    
    return settings;
  } catch (error) {
    console.error('❌ Failed to activate theme:', error);
    throw error;
  }
}

// CLI-friendly exports for running via npm scripts
if (import.meta.url === `file://${process.argv[1]}`) {
  // Get command from command line args
  const command = process.argv[2];
  const arg = process.argv[3];
  
  switch (command) {
    case 'seed':
      seedAllThemes().catch(err => {
        console.error('Seeding failed:', err.message);
        process.exit(1);
      });
      break;
    case 'seed-one':
      if (!arg) {
        console.error('Please provide a theme ID: npm run seed-themes seed-one theme-minimal');
        process.exit(1);
      }
      seedTheme(arg).catch(err => {
        console.error('Seeding failed:', err.message);
        process.exit(1);
      });
      break;
    case 'clear':
      clearAllThemes().catch(err => {
        console.error('Clear failed:', err.message);
        process.exit(1);
      });
      break;
    case 'reset':
      resetThemes().catch(err => {
        console.error('Reset failed:', err.message);
        process.exit(1);
      });
      break;
    case 'check':
      checkThemes().catch(err => {
        console.error('Check failed:', err.message);
        process.exit(1);
      });
      break;
    case 'activate':
      if (!arg) {
        console.error('Please provide a theme ID: npm run seed-themes activate theme-minimal');
        process.exit(1);
      }
      activateTheme(arg).catch(err => {
        console.error('Activation failed:', err.message);
        process.exit(1);
      });
      break;
    default:
      console.log(`
🎨 Theme Seeding Commands:

  npm run seed-themes seed      - Seed all default themes
  npm run seed-themes seed-one <id> - Seed specific theme
  npm run seed-themes clear     - Remove all themes
  npm run seed-themes reset     - Clear and re-seed themes
  npm run seed-themes check     - List existing themes  
  npm run seed-themes activate <id> - Activate specific theme

Available theme IDs:
  - theme-default
  - theme-minimal  
  - theme-warm
  - theme-tech
  - theme-elegant
  - theme-nature
      `);
  }
}