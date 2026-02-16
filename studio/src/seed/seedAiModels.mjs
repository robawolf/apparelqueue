/**
 * AI Model seeding script for Sanity
 * Pushes default AI model configurations to the Sanity dataset
 */

import dotenv from 'dotenv';
import { createClient } from '@sanity/client';
import { defaultAiModels } from './defaultAiModels.mjs';

// Load environment variables (try .env.local first, then .env)
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

// Create Sanity client for seeding
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_STUDIO_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2023-03-25',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN || process.env.SANITY_API_WRITE_TOKEN
});

if (!client.config().projectId) {
  console.error('Sanity Project ID is not set. Please check your environment variables.');
  console.error('Required: NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_STUDIO_PROJECT_ID');
  process.exit(1);
}

if (!client.config().token) {
  console.error('Sanity API token is not set. Please check your environment variables.');
  console.error('Required: SANITY_API_TOKEN or SANITY_API_WRITE_TOKEN');
  console.error('You can get a token from: https://sanity.io/manage');
  process.exit(1);
}

/**
 * Seed all default AI models to Sanity
 */
export async function seedAllAiModels() {
  console.log('Starting AI model seeding...');

  try {
    const transaction = client.transaction();

    defaultAiModels.forEach(model => {
      transaction.createOrReplace(model);
    });

    const result = await transaction.commit();

    console.log(`Successfully seeded ${defaultAiModels.length} AI models`);
    console.log('Models created:', defaultAiModels.map(m => m.name));

    return result;
  } catch (error) {
    console.error('Failed to seed AI models:', error);
    throw error;
  }
}

/**
 * Check existing AI models in Sanity
 */
export async function checkAiModels() {
  try {
    const models = await client.fetch(`
      *[_type == "aiModel"] | order(name asc) {
        _id,
        name,
        modelId,
        isDefault,
        _createdAt
      }
    `);

    console.log(`Found ${models.length} AI models in Sanity:`);

    models.forEach(model => {
      const defaultLabel = model.isDefault ? ' (Default)' : '';
      console.log(`  - ${model.name}${defaultLabel}: ${model.modelId}`);
    });

    return models;
  } catch (error) {
    console.error('Failed to check AI models:', error);
    throw error;
  }
}

/**
 * Clear all AI models
 */
export async function clearAllAiModels() {
  console.log('Clearing all AI models...');

  try {
    const models = await client.fetch('*[_type == "aiModel"]{ _id }');

    if (models.length === 0) {
      console.log('No AI models found to clear');
      return [];
    }

    const transaction = client.transaction();
    models.forEach(model => {
      transaction.delete(model._id);
    });

    const result = await transaction.commit();
    console.log(`Cleared ${result.length} AI models`);

    return result;
  } catch (error) {
    console.error('Failed to clear AI models:', error);
    throw error;
  }
}

// CLI handler
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  switch (command) {
    case 'seed':
      seedAllAiModels().catch(err => {
        console.error('Seeding failed:', err.message);
        process.exit(1);
      });
      break;
    case 'check':
      checkAiModels().catch(err => {
        console.error('Check failed:', err.message);
        process.exit(1);
      });
      break;
    case 'clear':
      clearAllAiModels().catch(err => {
        console.error('Clear failed:', err.message);
        process.exit(1);
      });
      break;
    default:
      console.log(`
AI Model Seeding Commands:

  node src/seed/seedAiModels.mjs seed   - Seed all default AI models
  node src/seed/seedAiModels.mjs check  - List existing AI models
  node src/seed/seedAiModels.mjs clear  - Remove all AI models

Available models:
${defaultAiModels.map(m => `  - ${m.name} (${m.modelId})`).join('\n')}
      `);
  }
}
