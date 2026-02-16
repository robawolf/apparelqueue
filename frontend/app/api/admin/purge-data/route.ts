import {NextRequest, NextResponse} from 'next/server'
import {createClient} from '@sanity/client'
import {apiVersion, dataset, projectId} from '@/lib/sanity/api'

/**
 * API endpoint for purging test data from Sanity
 * Requires ADMIN_SECRET and SANITY_API_TOKEN with write permissions
 *
 * Usage:
 * POST /api/admin/purge-data
 * Headers:
 *   - Authorization: Bearer {ADMIN_SECRET}
 *   - Content-Type: application/json
 * Body: {
 *   schemaTypes: ['post', 'product', 'scrape'], // Array of schema types to purge
 *   dryRun: false, // If true, only returns count without deleting
 *   filter: '*[_type == "post" && !(_id in path("drafts.**"))]' // Optional custom filter
 * }
 */

// Initialize Sanity client with write permissions
// Uses 'raw' perspective to see ALL documents including drafts
const writeClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN,
  perspective: 'raw',
})

// Schema types that can be purged
const PURGEABLE_TYPES = ['post', 'product', 'scrape']

// Dependency order for deletion - documents that reference others must be deleted first
// post -> references product, scrape
// scrape -> references product
// product -> references scrape
const DELETION_ORDER = ['post', 'scrape', 'product']

// Map of which document types reference which other types, and what fields to unset
// Format: { targetType: [{ sourceType, field, isArray }] }
const REFERENCE_MAP: Record<string, Array<{sourceType: string; field: string; isArray: boolean}>> = {
  scrape: [
    {sourceType: 'post', field: 'scrapes', isArray: true},
  ],
  product: [
    {sourceType: 'post', field: 'product', isArray: false},
    {sourceType: 'post', field: 'products', isArray: true},
    {sourceType: 'scrape', field: 'product', isArray: false},
  ],
}

/**
 * Sort schema types in proper deletion order to avoid reference conflicts
 * Documents that reference others must be deleted before the referenced documents
 */
function sortByDeletionOrder(types: string[]): string[] {
  return [...types].sort((a, b) => {
    const orderA = DELETION_ORDER.indexOf(a)
    const orderB = DELETION_ORDER.indexOf(b)
    // Types not in the order list go last
    if (orderA === -1) return 1
    if (orderB === -1) return -1
    return orderA - orderB
  })
}

/**
 * Unlink all references to documents of a given type before deleting them
 * This patches referencing documents to remove the reference fields
 *
 * IMPORTANT: We always unlink from ALL documents (including drafts) because
 * even if we're only deleting published docs, draft docs can still block
 * deletion if they hold references to the target documents.
 */
async function unlinkReferences(
  client: typeof writeClient,
  targetType: string,
  targetIds: string[]
): Promise<{patched: number; errors: string[]; details: string[]}> {
  const refs = REFERENCE_MAP[targetType]
  if (!refs || refs.length === 0 || targetIds.length === 0) {
    return {patched: 0, errors: [], details: []}
  }

  let patched = 0
  const errors: string[] = []
  const details: string[] = []

  for (const {sourceType, field, isArray} of refs) {
    try {
      // Find ALL documents (including drafts) that reference any of the target IDs
      // We must unlink from drafts too, or they'll block deletion
      // Use different GROQ syntax for single refs vs arrays
      const query = isArray
        ? `*[_type == "${sourceType}" && defined(${field}) && count(${field}[@._ref in $targetIds]) > 0]._id`
        : `*[_type == "${sourceType}" && defined(${field}) && ${field}._ref in $targetIds]._id`

      console.log(`[Unlink] Query for ${sourceType}.${field}:`, query)
      console.log(`[Unlink] Target IDs (first 5):`, targetIds.slice(0, 5))

      const docIds = await client.fetch(query, {targetIds})
      console.log(`[Unlink] Found ${docIds.length} ${sourceType} docs with ${field} refs to unlink`)

      details.push(`${sourceType}.${field}: found ${docIds.length} docs`)

      if (docIds.length > 0) {
        // Patch in batches
        const batchSize = 100
        for (let i = 0; i < docIds.length; i += batchSize) {
          const batch = docIds.slice(i, i + batchSize)
          const transaction = client.transaction()

          for (const id of batch) {
            // Unset the field (works for both single refs and arrays)
            transaction.patch(id, (patch) => patch.unset([field]))
          }

          try {
            await transaction.commit()
            patched += batch.length
            console.log(`[Unlink] Successfully patched ${batch.length} docs to unset ${field}`)
          } catch (patchError: any) {
            console.error(`[Unlink] Patch failed for ${sourceType}.${field}:`, patchError.message)
            errors.push(`Patch failed for ${sourceType}.${field}: ${patchError.message}`)
          }
        }
      }
    } catch (error: any) {
      console.error(`[Unlink] Query failed for ${sourceType}.${field}:`, error.message)
      errors.push(`Failed to unlink ${sourceType}.${field}: ${error.message}`)
    }
  }

  return {patched, errors, details}
}

export async function POST(request: NextRequest) {
  try {
    // Check authorization
    const authHeader = request.headers.get('authorization')
    const adminSecret = process.env.ADMIN_SECRET || 'change-this-secret'

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {error: 'Missing authorization header'},
        {status: 401}
      )
    }

    const token = authHeader.substring(7)
    if (token !== adminSecret) {
      return NextResponse.json(
        {error: 'Invalid authorization token'},
        {status: 401}
      )
    }

    // Check if we have write token
    if (!process.env.SANITY_API_WRITE_TOKEN && !process.env.SANITY_API_TOKEN) {
      return NextResponse.json(
        {error: 'SANITY_API_WRITE_TOKEN or SANITY_API_TOKEN not configured'},
        {status: 500}
      )
    }

    // Parse request body
    const body = await request.json()
    const {
      schemaTypes = [],
      dryRun = false,
      filter: customFilter,
      excludeDrafts = true
    } = body

    // Validate schema types
    const invalidTypes = schemaTypes.filter((type: string) => !PURGEABLE_TYPES.includes(type))
    if (invalidTypes.length > 0) {
      return NextResponse.json(
        {
          error: `Invalid schema types: ${invalidTypes.join(', ')}`,
          validTypes: PURGEABLE_TYPES
        },
        {status: 400}
      )
    }

    // Safety check: prevent accidental purge all
    if (schemaTypes.length === 0 && !customFilter) {
      return NextResponse.json(
        {error: 'No schema types specified and no custom filter provided'},
        {status: 400}
      )
    }

    const results: any = {}
    let totalDeleted = 0
    let totalFound = 0
    let totalUnlinked = 0

    // Sort types in dependency order to avoid reference conflicts
    // e.g., delete posts before products, since posts reference products
    const sortedTypes = sortByDeletionOrder(schemaTypes)

    // Process each schema type in dependency order
    for (const schemaType of sortedTypes) {
      // Build the query
      let query = customFilter || `*[_type == "${schemaType}"`

      // Exclude drafts by default
      if (excludeDrafts && !customFilter) {
        query += ' && !(_id in path("drafts.**"))'
      }

      if (!customFilter) {
        query += ']'
      }

      // First, count the documents
      const countQuery = `count(${query})`
      let count = 0
      try {
        count = await writeClient.fetch(countQuery)
        totalFound += count
      } catch (countError: any) {
        results[schemaType] = {
          query,
          found: 0,
          deleted: 0,
          unlinked: 0,
          error: `Count query failed: ${countError.message}`
        }
        continue
      }

      results[schemaType] = {
        query,
        found: count,
        deleted: 0,
        unlinked: 0,
        error: null
      }

      if (count > 0 && !dryRun) {
        // Get all document IDs to delete
        const docsQuery = `${query}._id`
        let docIds: string[] = []
        try {
          docIds = await writeClient.fetch(docsQuery)
          console.log(`[Purge] Found ${docIds.length} ${schemaType} docs to delete`)
        } catch (fetchError: any) {
          results[schemaType].error = `Fetch IDs failed: ${fetchError.message}`
          continue
        }

        // IMPORTANT: Unlink all references to these documents before deleting
        // This prevents "document is referenced" errors
        // Note: We unlink from ALL docs (including drafts) even if excludeDrafts is true
        const unlinkResult = await unlinkReferences(writeClient, schemaType, docIds)
        results[schemaType].unlinked = unlinkResult.patched
        results[schemaType].unlinkDetails = unlinkResult.details
        totalUnlinked += unlinkResult.patched
        if (unlinkResult.errors.length > 0) {
          results[schemaType].unlinkErrors = unlinkResult.errors
        }

        // Delete in batches of 100
        const batchSize = 100
        let deleted = 0
        const deleteErrors: string[] = []

        for (let i = 0; i < docIds.length; i += batchSize) {
          const batch = docIds.slice(i, i + batchSize)
          const transaction = writeClient.transaction()

          for (const id of batch) {
            transaction.delete(id)
          }

          try {
            await transaction.commit()
            deleted += batch.length
            console.log(`[Purge] Deleted batch of ${batch.length} ${schemaType} docs`)
          } catch (deleteError: any) {
            console.error(`[Purge] Delete failed for ${schemaType}:`, deleteError.message)
            deleteErrors.push(deleteError.message)
          }
        }

        results[schemaType].deleted = deleted
        totalDeleted += deleted
        if (deleteErrors.length > 0) {
          results[schemaType].error = deleteErrors.join('; ')
        }
      }
    }

    // Handle custom filter if no schema types specified
    if (schemaTypes.length === 0 && customFilter) {
      try {
        const countQuery = `count(${customFilter})`
        const count = await writeClient.fetch(countQuery)
        totalFound = count

        results.customFilter = {
          query: customFilter,
          found: count,
          deleted: 0,
          error: null
        }

        if (count > 0 && !dryRun) {
          const docsQuery = `${customFilter}._id`
          const docIds = await writeClient.fetch(docsQuery)

          const batchSize = 100
          let deleted = 0

          for (let i = 0; i < docIds.length; i += batchSize) {
            const batch = docIds.slice(i, i + batchSize)
            const transaction = writeClient.transaction()

            for (const id of batch) {
              transaction.delete(id)
            }

            await transaction.commit()
            deleted += batch.length
          }

          results.customFilter.deleted = deleted
          totalDeleted = deleted
        }
      } catch (error: any) {
        results.customFilter = {
          query: customFilter,
          found: 0,
          deleted: 0,
          error: error.message || 'Unknown error'
        }
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      totalFound,
      totalDeleted,
      totalUnlinked,
      deletionOrder: sortedTypes,
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Purge data error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || 'Unknown error'
      },
      {status: 500}
    )
  }
}

// GET method to check endpoint status
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    validTypes: PURGEABLE_TYPES,
    requiresAuth: true,
    methods: ['GET', 'POST']
  })
}