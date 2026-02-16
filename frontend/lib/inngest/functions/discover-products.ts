import {inngest} from '../client'
import {sanityWrite} from '@/lib/sanity-write'
import {searchAmazonProducts} from '@/lib/scrapingbee'
import {generateWithDeepSeek, parseJsonResponse} from '@/lib/ai'
import {searchWeb, type BraveSearchResult} from '@/lib/brave-search'
import {createJobLogger} from '@/lib/logger'
import {sendProductDiscoveryNotification} from '@/lib/telegram'

const logger = createJobLogger('discover-products')

// Configuration
const MIN_RATING = 4.5
const MAX_PRODUCTS_PER_RUN = 3
const NICHE = process.env.NICHE || 'travel gear'
const BRAVE_ENABLED = !!process.env.BRAVE_SEARCH_API_KEY
const CURRENT_YEAR = new Date().getFullYear()

// System prompt for multi-signal product ranking
const MULTI_SIGNAL_RANKING_PROMPT = `You are an expert product curator for a ${NICHE} blog. Analyze each product candidate using ALL available signals and select the ${MAX_PRODUCTS_PER_RUN} BEST products.

EVALUATION SIGNALS (use ALL of these):

1. AMAZON SIGNALS (15% weight)
   - Rating: Higher is better (4.5+ preferred)
   - Review Count: More reviews = more confidence (1000+ is excellent)
   - Calculate: amazonScore = (rating/5 * 5) + min(reviewCount/1000, 5)

2. EDITORIAL CONFIDENCE (35% weight)
   - Count how many "best of" articles mention each product
   - Higher mention count = more trusted by reviewers
   - Calculate: editorialScore = min(mentionCount * 2, 10)

3. SENTIMENT ANALYSIS (25% weight)
   - Analyze the editorial snippets for each product
   - Look for: enthusiasm, criticism, caveats, recommendations
   - Score 1-10 (10 = universally praised, 1 = widely criticized)

4. PRICE-VALUE ANALYSIS (25% weight)
   - Evaluate based on product positioning and features implied by name
   - Consider: Is this budget, mid-range, or premium?
   - Score 1-10 (10 = exceptional value for money)

5. BRAND QUALITY (penalty factor)
   - PENALIZE generic store brands: Amazon Basics, Solimo, Amazon Essentials, AmazonCommercial
   - PREFER established third-party brands with reputation
   - Unbranded products should score lower in overall evaluation

OVERALL SCORE: Calculate weighted average of all signals.

RESPONSE FORMAT (JSON only, no markdown):
{
  "rankedProducts": [
    {
      "asin": "B0XXXXXXXXX",
      "name": "Exact product name",
      "brand": "Brand or null",
      "amazonScore": 8.5,
      "editorialScore": 6,
      "sentimentScore": 8,
      "valueScore": 7,
      "overallScore": 7.4,
      "reasoning": "Why this product was selected",
      "confidence": "high"
    }
  ],
  "analysisNotes": "Overall observations about the candidate pool"
}`

// Interfaces
interface TargetSubcategory {
  _id: string
  name: string
  slug: string
  searchFocus: string
  targetProductCount: number
  discoveryPriority: number
  parentCategory: {_id: string; name: string}
}

interface ExistingProduct {
  _id: string
  asin: string
  name: string
}

interface SearchProduct {
  asin: string
  title: string
  brand?: string
  rating?: number
  reviews_count?: number
  url_image?: string
}

interface ProductCandidate {
  asin: string
  name: string
  brand: string | null
  amazonRating: number | null
  amazonReviewCount: number | null
  editorialMentionCount: number
  editorialSnippets: string[]
  image: string | null
}

interface RankedProduct {
  asin: string
  name: string
  brand: string | null
  amazonScore: number
  editorialScore: number
  sentimentScore: number
  valueScore: number
  overallScore: number
  reasoning: string
  confidence: 'high' | 'medium' | 'low'
  image: string | null
}

interface ProductRankingResponse {
  rankedProducts: RankedProduct[]
  analysisNotes: string
}

interface BraveDiagnostics {
  apiKeyPresent: boolean
  queriesAttempted: number
  queriesSucceeded: number
  totalResults: number
  filteredResults: number
  errors: string[]
}

/**
 * Search Brave for editorial "best of" content with full diagnostics
 */
async function searchEditorialContent(
  searchFocus: string,
  subcategoryName: string,
): Promise<{results: BraveSearchResult[]; diagnostics: BraveDiagnostics}> {
  const diagnostics: BraveDiagnostics = {
    apiKeyPresent: BRAVE_ENABLED,
    queriesAttempted: 0,
    queriesSucceeded: 0,
    totalResults: 0,
    filteredResults: 0,
    errors: [],
  }

  if (!BRAVE_ENABLED) {
    diagnostics.errors.push('BRAVE_SEARCH_API_KEY environment variable not set')
    logger.warn({diagnostics}, 'Brave Search disabled - API key missing')
    return {results: [], diagnostics}
  }

  // Expanded editorial queries for better coverage
  const editorialQueries = [
    `best ${searchFocus} ${CURRENT_YEAR} review`,
    `${searchFocus} buyer guide`,
    `top ${searchFocus} compared ${CURRENT_YEAR}`,
    `${subcategoryName} recommendations ${NICHE}`,
    `${searchFocus} pros cons review`,
  ]

  const allResults: BraveSearchResult[] = []

  for (const query of editorialQueries) {
    diagnostics.queriesAttempted++
    try {
      logger.debug({query}, 'Executing Brave search query')
      const results = await searchWeb(query, {count: 10, freshness: 'py'})
      allResults.push(...results)
      diagnostics.queriesSucceeded++
      logger.debug({query, resultCount: results.length}, 'Brave query succeeded')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      diagnostics.errors.push(`Query "${query}": ${errorMessage}`)
      logger.warn({query, error: errorMessage}, 'Brave search query failed')
    }
  }

  diagnostics.totalResults = allResults.length

  // Deduplicate by URL and filter out e-commerce sites
  const seen = new Set<string>()
  const excludedDomains = ['amazon.com', 'amzn.to', 'ebay.com', 'walmart.com', 'target.com', 'aliexpress.com']

  const filtered = allResults.filter((result) => {
    if (seen.has(result.url)) return false
    seen.add(result.url)
    return !excludedDomains.some((domain) => result.url.toLowerCase().includes(domain))
  })

  diagnostics.filteredResults = filtered.length

  logger.info({diagnostics, searchFocus}, 'Brave editorial search complete')

  return {results: filtered, diagnostics}
}

interface CandidateBuildResult {
  candidates: ProductCandidate[]
  stats: {
    totalAmazonProducts: number
    skippedExisting: number
    skippedLowRating: number
    skippedNoEditorial: number
    candidatesWithEditorial: number
  }
}

/**
 * Build product candidates with editorial mention signals
 */
function buildProductCandidates(
  amazonProducts: SearchProduct[],
  braveResults: BraveSearchResult[],
  existingAsins: string[],
): CandidateBuildResult {
  const candidates: ProductCandidate[] = []
  const stats = {
    totalAmazonProducts: amazonProducts.length,
    skippedExisting: 0,
    skippedLowRating: 0,
    skippedNoEditorial: 0,
    candidatesWithEditorial: 0,
  }

  // Build a map of product mentions from editorial content
  const editorialMentions = new Map<string, {count: number; snippets: string[]}>()

  for (const result of braveResults) {
    // Match products mentioned in editorial content (fuzzy title matching)
    for (const product of amazonProducts) {
      const titleWords = product.title
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3)
        .slice(0, 6)
      const matchesInContent =
        titleWords.filter(
          (word) => result.title.toLowerCase().includes(word) || result.description.toLowerCase().includes(word),
        ).length >= 3

      if (matchesInContent) {
        const existing = editorialMentions.get(product.asin) || {count: 0, snippets: []}
        existing.count++
        existing.snippets.push(`${result.title}: ${result.description}`)
        editorialMentions.set(product.asin, existing)
      }
    }
  }

  // Build candidate list
  for (const product of amazonProducts) {
    if (existingAsins.includes(product.asin)) {
      stats.skippedExisting++
      continue
    }
    if (product.rating && product.rating < MIN_RATING) {
      stats.skippedLowRating++
      continue
    }

    const mentions = editorialMentions.get(product.asin) || {count: 0, snippets: []}
    if (mentions.count === 0) {
      stats.skippedNoEditorial++
      continue // Skip products without editorial validation
    }

    candidates.push({
      asin: product.asin,
      name: product.title,
      brand: product.brand || null,
      amazonRating: product.rating || null,
      amazonReviewCount: product.reviews_count || null,
      editorialMentionCount: mentions.count,
      editorialSnippets: mentions.snippets.slice(0, 3),
      image: product.url_image || null,
    })
  }

  stats.candidatesWithEditorial = candidates.length

  // Sort by editorial mentions (products mentioned in reviews are higher quality signals)
  candidates.sort((a, b) => b.editorialMentionCount - a.editorialMentionCount)

  return {
    candidates: candidates.slice(0, 25), // Limit to top 25 candidates for AI ranking
    stats,
  }
}

/**
 * Discover new products by targeting subcategories with highest discovery priority
 * Uses multi-signal AI ranking to select the best products
 */
export const discoverProducts = inngest.createFunction(
  {
    id: 'discover-products',
    name: 'Discover Products',
    concurrency: {limit: 1},
  },
  [
    {cron: '0 */6 * * *'}, // Every 6 hours
    {event: 'job/discover-products'},
  ],
  async ({step}) => {
    logger.info({niche: NICHE, braveEnabled: BRAVE_ENABLED}, 'Starting product discovery')

    // Step 1: Find highest priority active subcategory
    const targetSubcategory = await step.run('find-target-subcategory', async () => {
      const subcategory = await sanityWrite.fetch<TargetSubcategory | null>(`
        *[
          _type == "category"
          && defined(parentCategory)
          && discoveryStatus == "active"
          && defined(searchFocus)
          && discoveryPriority > 0
        ] | order(discoveryPriority desc, lastDiscoveryAt asc)[0] {
          _id,
          name,
          "slug": slug.current,
          searchFocus,
          targetProductCount,
          discoveryPriority,
          "parentCategory": parentCategory->{_id, name}
        }
      `)

      if (!subcategory) {
        logger.warn({}, 'No active subcategory with pending discovery')
        return null
      }

      logger.info(
        {
          subcategory: subcategory.name,
          parent: subcategory.parentCategory.name,
          searchFocus: subcategory.searchFocus,
          priority: subcategory.discoveryPriority,
        },
        'Selected target subcategory',
      )

      return subcategory
    })

    if (!targetSubcategory) {
      return {
        success: true,
        skipped: true,
        reason:
          'No active subcategories with pending discovery. Create subcategories with searchFocus and discoveryStatus=active.',
      }
    }

    // Step 2: Fetch existing products to avoid duplicates
    const existingProducts = await step.run('fetch-existing-products', async () => {
      return await sanityWrite.fetch<ExistingProduct[]>(`
        *[_type == "product"] {
          _id,
          asin,
          name
        }
      `)
    })

    const existingAsins = existingProducts.map((p) => p.asin)
    const existingNames = existingProducts.map((p) => p.name)

    // Step 3: Brave Search for editorial content
    const braveData = await step.run('brave-search', async () => {
      return await searchEditorialContent(targetSubcategory.searchFocus, targetSubcategory.name)
    })

    // Step 4: Amazon Search
    const amazonResults = await step.run('amazon-search', async () => {
      try {
        const results = await searchAmazonProducts(targetSubcategory.searchFocus, {
          sortBy: 'average_review',
        })
        logger.info({query: targetSubcategory.searchFocus, count: results.products?.length || 0}, 'Amazon search complete')
        return results.products || []
      } catch (error) {
        logger.error({error}, 'Amazon search failed')
        return []
      }
    })

    // Step 5: Build candidates with all signals
    const candidateResult = await step.run('build-candidates', async () => {
      const result = buildProductCandidates(amazonResults, braveData.results, existingAsins)
      logger.info(
        {
          amazonCount: amazonResults.length,
          braveCount: braveData.results.length,
          candidateCount: result.candidates.length,
          filterStats: result.stats,
        },
        'Built product candidates',
      )
      return result
    })

    const candidates = candidateResult.candidates

    // Step 6: AI multi-signal ranking
    const rankedProducts = await step.run('ai-rank-products', async () => {
      if (candidates.length === 0) {
        logger.warn({}, 'No candidates to rank')
        return []
      }

      // Create image map to preserve image URLs through AI ranking
      const imageMap = new Map<string, string>()
      candidates.forEach((c) => {
        if (c.image) imageMap.set(c.asin, c.image)
      })

      // Build candidate list for AI
      const candidateList = candidates
        .map(
          (c, i) =>
            `${i + 1}. [${c.asin}] ${c.name}
   Brand: ${c.brand || 'Unknown'}
   Rating: ${c.amazonRating || 'N/A'} (${c.amazonReviewCount || 0} reviews)
   Editorial mentions: ${c.editorialMentionCount}
   ${c.editorialSnippets.length > 0 ? `Snippets:\n   - ${c.editorialSnippets.join('\n   - ')}` : ''}`,
        )
        .join('\n\n')

      const prompt = `TARGET: ${targetSubcategory.parentCategory.name} > ${targetSubcategory.name}
SEARCH FOCUS: ${targetSubcategory.searchFocus}
NICHE: ${NICHE}

EXISTING PRODUCTS TO AVOID (by name):
${existingNames.slice(0, 20).join(', ') || 'None'}

PRODUCT CANDIDATES:
${candidateList}

Analyze these candidates using all signals (Amazon ratings, editorial confidence, sentiment, price-value) and select the ${MAX_PRODUCTS_PER_RUN} BEST products. Calculate scores for each signal and provide the weighted overall score.`

      try {
        const response = await generateWithDeepSeek(prompt, {
          systemPrompt: MULTI_SIGNAL_RANKING_PROMPT,
          maxTokens: 1500,
          temperature: 0.3,
        })

        const parsed = parseJsonResponse<ProductRankingResponse>(response)

        logger.info(
          {
            selectedCount: parsed.rankedProducts?.length || 0,
            analysisNotes: parsed.analysisNotes,
          },
          'AI ranking complete',
        )

        // Add images back to ranked products
        return (parsed.rankedProducts || []).slice(0, MAX_PRODUCTS_PER_RUN).map((product) => ({
          ...product,
          image: imageMap.get(product.asin) || null,
        }))
      } catch (error) {
        logger.error({error}, 'AI ranking failed')
        return []
      }
    })

    // Step 7: Save products with subcategory reference
    const saved = await step.run('save-products', async () => {
      if (rankedProducts.length === 0) {
        return {savedCount: 0, products: []}
      }

      const savedProducts: Array<{asin: string; name: string; score: number}> = []

      for (const product of rankedProducts) {
        try {
          await sanityWrite.createOrReplace({
            _id: `product-${product.asin}`,
            _type: 'product',
            name: product.name,
            asin: product.asin,
            brand: product.brand || null,
            approvalStatus: 'pending',
            discoveryImage: product.image || null,
            category: {
              _type: 'reference',
              _ref: targetSubcategory._id,
            },
          })

          savedProducts.push({
            asin: product.asin,
            name: product.name,
            score: product.overallScore,
          })

          logger.debug(
            {
              asin: product.asin,
              name: product.name,
              score: product.overallScore,
              confidence: product.confidence,
            },
            'Saved product',
          )
        } catch (error) {
          logger.error({asin: product.asin, error}, 'Failed to save product')
        }
      }

      return {savedCount: savedProducts.length, products: savedProducts}
    })

    // Step 8: Trigger image refresh for newly saved products
    if (saved.savedCount > 0) {
      await step.sendEvent('trigger-image-refresh', {
        name: 'job/refresh-product-images',
        data: {
          productIds: saved.products.map((p) => `product-${p.asin}`),
        },
      })
      logger.info({productIds: saved.products.map((p) => `product-${p.asin}`)}, 'Triggered image refresh for new products')
    }

    // Step 9: Update lastDiscoveryAt and decrement priority on subcategory
    await step.run('update-subcategory', async () => {
      // Fetch current priority to calculate new value (ensuring it doesn't go below 0)
      const currentCategory = await sanityWrite.fetch<{discoveryPriority: number | null}>(
        `*[_id == $id][0]{discoveryPriority}`,
        {id: targetSubcategory._id},
      )
      const currentPriority = currentCategory?.discoveryPriority ?? 0
      const newPriority = Math.max(0, currentPriority - saved.savedCount)

      await sanityWrite
        .patch(targetSubcategory._id)
        .set({
          lastDiscoveryAt: new Date().toISOString(),
          discoveryPriority: newPriority,
        })
        .commit()

      logger.info(
        {
          subcategoryId: targetSubcategory._id,
          previousPriority: currentPriority,
          newPriority,
          savedCount: saved.savedCount,
        },
        'Updated subcategory priority',
      )
    })

    // Step 9: Notify admin via Telegram
    await step.run('notify-telegram', async () => {
      if (saved.savedCount === 0) {
        logger.debug({}, 'No products saved, skipping notification')
        return
      }

      try {
        await sendProductDiscoveryNotification({
          savedCount: saved.savedCount,
          targetCategory: `${targetSubcategory.parentCategory.name} > ${targetSubcategory.name}`,
          topProduct: saved.products[0]
            ? {
                name: saved.products[0].name,
                score: saved.products[0].score,
              }
            : undefined,
        })
      } catch (error) {
        logger.warn({error}, 'Failed to send Telegram notification')
      }
    })

    // Step 10: Trigger category re-analysis to update priorities
    if (saved.savedCount > 0) {
      await step.sendEvent('trigger-category-analysis', {
        name: 'discovery.completed',
        data: {
          subcategoryId: targetSubcategory._id,
          savedCount: saved.savedCount,
        },
      })
      logger.info({subcategoryId: targetSubcategory._id}, 'Triggered category re-analysis')
    }

    // Final summary
    const summary = {
      success: true,
      metadata: {
        subcategory: {
          id: targetSubcategory._id,
          name: targetSubcategory.name,
          parentCategory: targetSubcategory.parentCategory.name,
          searchFocus: targetSubcategory.searchFocus,
          priority: targetSubcategory.discoveryPriority,
        },
        savedCount: saved.savedCount,
        savedProducts: saved.products,
        braveDiagnostics: braveData.diagnostics,
        amazonResultCount: amazonResults.length,
        candidateCount: candidates.length,
        candidateFilterStats: candidateResult.stats,
      },
    }

    logger.info(summary, 'Product discovery complete')

    return summary
  },
)
