import {inngest} from '../client'
import {sanityWrite} from '@/lib/sanity-write'
import {generateWithDeepSeek, parseJsonResponse} from '@/lib/ai'
import {createJobLogger} from '@/lib/logger'

const logger = createJobLogger('analyze-categories')

// Configuration
const MAX_BROAD_CATEGORIES = 15
const MAX_NEW_SUBCATEGORIES_PER_RUN = 5
const NICHE = process.env.NICHE || 'travel gear'

// System prompt for subcategory suggestions
const SUBCATEGORY_SUGGESTION_PROMPT = `You are a product researcher for a ${NICHE} blog. Your task is to suggest NEW subcategories that would fill gaps in the current category structure.

CATEGORY HIERARCHY:
- BROAD CATEGORIES: Top-level navigation categories (max ${MAX_BROAD_CATEGORIES}). Examples: "Bags", "Electronics", "Apparel"
- SUBCATEGORIES: Specific product types within a broad category. Examples under "Bags": "Packable Daypacks", "Travel Duffels", "Packing Cubes"

REQUIREMENTS:
1. Only suggest subcategories for EXISTING broad categories
2. Each subcategory must have a specific "searchFocus" that works well for Amazon/Google searches
3. Focus on high-demand product types with good affiliate potential
4. Avoid duplicating existing subcategories
5. Consider seasonal relevance and market trends

RESPONSE FORMAT (JSON only, no markdown):
{
  "suggestions": [
    {
      "broadCategoryName": "Bags",
      "subcategoryName": "Compression Packing Cubes",
      "searchFocus": "compression packing cubes travel",
      "reasoning": "High demand for organization products, underrepresented"
    }
  ],
  "analysisNotes": "Brief summary of the analysis"
}`

// Interfaces
interface BroadCategory {
  _id: string
  name: string
  slug: string
  productCount: number
}

interface Subcategory {
  _id: string
  name: string
  slug: string
  searchFocus: string | null
  targetProductCount: number | null
  discoveryStatus: string | null
  currentProductCount: number
  parentCategory: {_id: string; name: string}
}

interface SubcategorySuggestion {
  broadCategoryName: string
  subcategoryName: string
  searchFocus: string
  reasoning: string
}

interface AISuggestionResponse {
  suggestions: SubcategorySuggestion[]
  analysisNotes: string
}

/**
 * Analyze category structure, calculate discovery priorities, and suggest new subcategories
 * Runs daily to keep discovery targets updated
 */
export const analyzeCategories = inngest.createFunction(
  {
    id: 'analyze-categories',
    name: 'Analyze Categories',
    concurrency: {limit: 1},
  },
  [
    {cron: '0 2 * * *'}, // Daily at 2 AM
    {event: 'job/analyze-categories'},
    {event: 'discovery.completed'}, // After product discovery
  ],
  async ({step}) => {
    logger.info({niche: NICHE}, 'Starting category analysis')

    // Step 1: Fetch broad categories
    const broadCategories = await step.run('fetch-broad-categories', async () => {
      return await sanityWrite.fetch<BroadCategory[]>(`
        *[_type == "category" && !defined(parentCategory)] {
          _id,
          name,
          "slug": slug.current,
          "productCount": count(*[_type == "product" && category._ref in *[_type == "category" && parentCategory._ref == ^._id]._id])
        } | order(name asc)
      `)
    })

    logger.info({broadCategoryCount: broadCategories.length}, 'Fetched broad categories')

    // Step 2: Fetch all subcategories with product counts
    const subcategories = await step.run('fetch-subcategories', async () => {
      return await sanityWrite.fetch<Subcategory[]>(`
        *[_type == "category" && defined(parentCategory)] {
          _id,
          name,
          "slug": slug.current,
          searchFocus,
          targetProductCount,
          discoveryStatus,
          "currentProductCount": count(*[_type == "product" && category._ref == ^._id]),
          "parentCategory": parentCategory->{_id, name}
        } | order(name asc)
      `)
    })

    logger.info({subcategoryCount: subcategories.length}, 'Fetched subcategories')

    // Step 3: Calculate priorities for active subcategories
    const priorityUpdates = await step.run('calculate-priorities', async () => {
      const updates = subcategories
        .filter((sub) => sub.discoveryStatus === 'active' && sub.targetProductCount && sub.searchFocus)
        .map((sub) => {
          const target = sub.targetProductCount || 10
          const current = sub.currentProductCount
          const priority = Math.max(0, target - current)
          return {
            _id: sub._id,
            name: sub.name,
            priority,
            current,
            target,
          }
        })
        .sort((a, b) => b.priority - a.priority)

      logger.info(
        {
          activeCount: updates.length,
          topPriority: updates[0]?.name,
          topPriorityScore: updates[0]?.priority,
        },
        'Calculated priorities',
      )

      return updates
    })

    // Step 4: Batch update priorities on subcategory documents
    const updateResult = await step.run('update-priorities', async () => {
      if (priorityUpdates.length === 0) {
        return {updatedCount: 0}
      }

      const transaction = sanityWrite.transaction()

      for (const update of priorityUpdates) {
        transaction.patch(update._id, {
          set: {discoveryPriority: update.priority},
        })
      }

      // Also reset priority to 0 for paused/completed subcategories
      const inactiveSubcategories = subcategories.filter(
        (sub) => sub.discoveryStatus !== 'active' || !sub.searchFocus,
      )
      for (const sub of inactiveSubcategories) {
        transaction.patch(sub._id, {
          set: {discoveryPriority: 0},
        })
      }

      await transaction.commit()

      logger.info({updatedCount: priorityUpdates.length + inactiveSubcategories.length}, 'Updated priorities')

      return {updatedCount: priorityUpdates.length}
    })

    // Step 5: AI suggests new subcategories
    const suggestions = await step.run('ai-suggest-subcategories', async () => {
      // Build category summary for AI
      const categorySummary = broadCategories
        .map((broad) => {
          const subs = subcategories.filter((s) => s.parentCategory._id === broad._id)
          const subList =
            subs.length > 0
              ? subs.map((s) => `    - ${s.name}: ${s.currentProductCount} products`).join('\n')
              : '    (no subcategories yet)'
          return `- ${broad.name}:\n${subList}`
        })
        .join('\n')

      const prompt = `CURRENT CATEGORY STRUCTURE (${broadCategories.length} broad categories, ${subcategories.length} subcategories):

${categorySummary || 'No categories yet'}

NICHE: ${NICHE}
BROAD CATEGORY LIMIT: ${MAX_BROAD_CATEGORIES}

Suggest up to ${MAX_NEW_SUBCATEGORIES_PER_RUN} NEW subcategories that would fill gaps. Focus on high-demand ${NICHE} product types that are missing.`

      try {
        const response = await generateWithDeepSeek(prompt, {
          systemPrompt: SUBCATEGORY_SUGGESTION_PROMPT,
          maxTokens: 1500,
          temperature: 0.5,
        })

        const parsed = parseJsonResponse<AISuggestionResponse>(response)

        logger.info(
          {
            suggestionCount: parsed.suggestions?.length || 0,
            analysisNotes: parsed.analysisNotes,
          },
          'AI suggestions complete',
        )

        return parsed
      } catch (error) {
        logger.error({error}, 'AI suggestion failed')
        return {suggestions: [], analysisNotes: 'AI suggestion failed'}
      }
    })

    // Step 6: Create new subcategories from AI suggestions
    const created = await step.run('create-subcategories', async () => {
      const createdSubcategories: Array<{name: string; parentCategory: string}> = []

      for (const suggestion of suggestions.suggestions.slice(0, MAX_NEW_SUBCATEGORIES_PER_RUN)) {
        // Find the parent broad category
        const parentCategory = broadCategories.find(
          (b) => b.name.toLowerCase() === suggestion.broadCategoryName.toLowerCase(),
        )

        if (!parentCategory) {
          logger.warn({broadCategory: suggestion.broadCategoryName}, 'Parent category not found, skipping')
          continue
        }

        // Check if subcategory already exists
        const existingSubcategory = subcategories.find(
          (s) =>
            s.name.toLowerCase() === suggestion.subcategoryName.toLowerCase() &&
            s.parentCategory._id === parentCategory._id,
        )

        if (existingSubcategory) {
          logger.debug({subcategory: suggestion.subcategoryName}, 'Subcategory already exists, skipping')
          continue
        }

        // Create the subcategory
        const slug = suggestion.subcategoryName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')

        try {
          await sanityWrite.createIfNotExists({
            _id: `category-${slug}`,
            _type: 'category',
            name: suggestion.subcategoryName,
            slug: {_type: 'slug', current: slug},
            description: suggestion.reasoning,
            parentCategory: {
              _type: 'reference',
              _ref: parentCategory._id,
            },
            searchFocus: suggestion.searchFocus,
            targetProductCount: 10,
            discoveryStatus: 'active',
            discoveryPriority: 10, // High priority for new subcategories
          })

          createdSubcategories.push({
            name: suggestion.subcategoryName,
            parentCategory: parentCategory.name,
          })

          logger.info(
            {
              subcategory: suggestion.subcategoryName,
              parentCategory: parentCategory.name,
              searchFocus: suggestion.searchFocus,
            },
            'Created new subcategory',
          )
        } catch (error) {
          logger.error({subcategory: suggestion.subcategoryName, error}, 'Failed to create subcategory')
        }
      }

      return createdSubcategories
    })

    // Final summary
    const summary = {
      success: true,
      metadata: {
        broadCategories: broadCategories.length,
        subcategories: subcategories.length,
        prioritiesUpdated: updateResult.updatedCount,
        subcategoriesCreated: created.length,
        createdSubcategories: created,
        topPrioritySubcategories: priorityUpdates.slice(0, 5).map((u) => ({
          name: u.name,
          priority: u.priority,
          current: u.current,
          target: u.target,
        })),
        analysisNotes: suggestions.analysisNotes,
      },
    }

    logger.info(summary, 'Category analysis complete')

    return summary
  },
)
