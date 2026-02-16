#!/usr/bin/env node

/**
 * Flexible data purge script for Sanity content
 *
 * Usage:
 *   npm run purge-data                    # Run with current configuration
 *   npm run purge-data -- --dry-run       # Dry run to see what would be deleted
 *   npm run purge-data -- --production    # Use production URL
 *   npm run purge-data -- --filter="*[_type == 'post' && date < '2024-01-01']"
 *
 * Configuration:
 *   - Comment/uncomment schema types in SCHEMA_TYPES_TO_PURGE
 *   - Set DRY_RUN to true for safety
 *   - Configure URLs and credentials in .env.local
 */

require('dotenv').config({path: '.env.local'})

// ============================================
// CONFIGURATION - MODIFY THIS SECTION
// ============================================

/**
 * Schema types to purge - comment/uncomment as needed
 * Comment out any types you want to preserve
 */
const SCHEMA_TYPES_TO_PURGE = [
  // 'page',          // Static pages (about, contact, etc.)
  'post',          // Blog posts
  'product',       // Product documents
  'scrape',        // Scrape data
  // 'person',        // Author/team member profiles
  // 'category',      // Category taxonomy
  // 'settings',      // Global settings (BE VERY CAREFUL!)
]

/**
 * Safety settings
 */
const CONFIG = {
  // Set to true to only show what would be deleted without actually deleting
  DRY_RUN: false,

  // Exclude draft documents (recommended)
  EXCLUDE_DRAFTS: true,

  // Custom filter (optional) - overrides schema types if set
  // Examples:
  // CUSTOM_FILTER: '*[_type == "post" && date < "2024-01-01"]',  // Old posts
  // CUSTOM_FILTER: '*[_type == "product" && approvalStatus == "pending"]',  // Pending products
  // CUSTOM_FILTER: '*[_type == "scrape" && scrapedAt < "2024-01-01"]',  // Old scrapes
  CUSTOM_FILTER: null,

  // Batch processing
  BATCH_DELAY_MS: 1000, // Delay between batches to avoid rate limiting
}

// ============================================
// END CONFIGURATION
// ============================================

// Parse command line arguments
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run') || CONFIG.DRY_RUN
const isProduction = args.includes('--production')
const forceRun = args.includes('--force')

// Extract custom filter from command line if provided
const filterArg = args.find(arg => arg.startsWith('--filter='))
const customFilter = filterArg
  ? filterArg.replace('--filter=', '')
  : CONFIG.CUSTOM_FILTER

// Environment configuration
const API_URL = isProduction
  ? process.env.NEXT_PUBLIC_PRODUCTION_URL || 'https://your-production-url.com'
  : process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-this-secret'

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

// Helper functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSection(title) {
  console.log()
  log('=' .repeat(60), 'cyan')
  log(title, 'bright')
  log('=' .repeat(60), 'cyan')
}

async function confirmPurge() {
  if (forceRun) return true
  if (isDryRun) return true

  return new Promise((resolve) => {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    })

    log('\n⚠️  WARNING: This will permanently delete data!', 'red')
    log(`Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`, 'yellow')

    readline.question('\nType "DELETE" to confirm: ', (answer) => {
      readline.close()
      resolve(answer === 'DELETE')
    })
  })
}

async function purgeData() {
  logSection('SANITY DATA PURGE SCRIPT')

  // Display configuration
  log('\nConfiguration:', 'bright')
  log(`  API URL: ${API_URL}`)
  log(`  Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`, isProduction ? 'red' : 'green')
  log(`  Dry Run: ${isDryRun ? 'YES (no data will be deleted)' : 'NO (data WILL be deleted)'}`, isDryRun ? 'green' : 'yellow')
  log(`  Exclude Drafts: ${CONFIG.EXCLUDE_DRAFTS ? 'YES' : 'NO'}`)

  if (customFilter) {
    log('\nUsing custom filter:', 'yellow')
    log(`  ${customFilter}`)
  } else {
    log('\nSchema types to purge:', 'bright')
    if (SCHEMA_TYPES_TO_PURGE.length === 0) {
      log('  ❌ No schema types selected!', 'red')
      log('\n  Please uncomment schema types in SCHEMA_TYPES_TO_PURGE', 'yellow')
      process.exit(1)
    }
    SCHEMA_TYPES_TO_PURGE.forEach(type => {
      log(`  • ${type}`, 'cyan')
    })
  }

  // Confirm before proceeding
  if (!await confirmPurge()) {
    log('\n❌ Purge cancelled', 'red')
    process.exit(0)
  }

  // Prepare request body
  const requestBody = {
    dryRun: isDryRun,
    excludeDrafts: CONFIG.EXCLUDE_DRAFTS,
  }

  if (customFilter) {
    requestBody.filter = customFilter
  } else {
    requestBody.schemaTypes = SCHEMA_TYPES_TO_PURGE
  }

  try {
    log('\n🔄 Sending purge request...', 'cyan')

    const response = await fetch(`${API_URL}/api/admin/purge-data`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ADMIN_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()

    // Display results
    logSection('PURGE RESULTS')

    if (result.dryRun) {
      log('🔍 DRY RUN - No data was deleted', 'green')
    }

    log(`\nTotal documents found: ${result.totalFound}`, 'bright')
    if (!result.dryRun) {
      log(`Total documents deleted: ${result.totalDeleted}`, result.totalDeleted > 0 ? 'red' : 'green')
    }

    // Display per-type results
    if (Object.keys(result.results).length > 0) {
      log('\nDetailed results:', 'bright')

      for (const [type, data] of Object.entries(result.results)) {
        console.log()
        log(`  ${type}:`, 'cyan')
        log(`    Query: ${data.query}`)
        log(`    Found: ${data.found}`)

        if (!result.dryRun) {
          log(`    Deleted: ${data.deleted}`, data.deleted > 0 ? 'yellow' : 'green')
        }

        if (data.error) {
          log(`    Error: ${data.error}`, 'red')
        }
      }
    }

    // Summary
    console.log()
    if (result.dryRun) {
      log('✅ Dry run completed successfully', 'green')
      log('   To actually delete data, run with DRY_RUN = false', 'yellow')
    } else if (result.totalDeleted > 0) {
      log(`✅ Successfully deleted ${result.totalDeleted} documents`, 'green')
    } else {
      log('ℹ️  No documents were deleted', 'blue')
    }

    log(`\nCompleted at: ${new Date(result.timestamp).toLocaleString()}`, 'cyan')

  } catch (error) {
    logSection('ERROR')
    log(`❌ Purge failed: ${error.message}`, 'red')

    // Provide helpful error messages
    if (error.message.includes('ECONNREFUSED')) {
      log('\n💡 Make sure the Next.js server is running:', 'yellow')
      log('   npm run dev:next', 'cyan')
    } else if (error.message.includes('401')) {
      log('\n💡 Authentication failed. Check ADMIN_SECRET in .env.local', 'yellow')
    } else if (error.message.includes('500')) {
      log('\n💡 Server error. Check if SANITY_API_WRITE_TOKEN is configured', 'yellow')
    }

    process.exit(1)
  }
}

// Run the script
purgeData().catch(error => {
  console.error('Unexpected error:', error)
  process.exit(1)
})