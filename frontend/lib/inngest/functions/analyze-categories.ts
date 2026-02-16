import {inngest} from '../client'
import {prisma} from '@/lib/db'
import {generateWithOpenRouter, parseJsonResponse} from '@/lib/ai'
import {logger} from '@/lib/logger'

export const analyzeCategories = inngest.createFunction(
  {
    id: 'analyze-categories',
    concurrency: [{limit: 1}],
    retries: 3,
  },
  [{event: 'job/analyze-categories'}, {cron: '0 2 * * *'}],
  async ({step}) => {
    const result = await step.run('analyze', async () => {
      const brandConfig = await prisma.brandConfig.findFirst({where: {id: 'default'}})
      if (!brandConfig) throw new Error('BrandConfig not found')

      const categories = await prisma.category.findMany({
        where: {isActive: true},
        include: {
          _count: {
            select: {
              ideas: true,
            },
          },
          ideas: {
            select: {stage: true, status: true},
          },
        },
      })

      // Build analysis per category
      const analysis = categories.map((cat) => {
        const byStage: Record<string, number> = {}
        for (const idea of cat.ideas) {
          const key = `${idea.stage}-${idea.status}`
          byStage[key] = (byStage[key] || 0) + 1
        }

        const published = cat.ideas.filter(
          (i) => i.stage === 'publish' && i.status === 'approved',
        ).length
        const gap = cat.targetCount - published

        return {
          id: cat.id,
          name: cat.name,
          targetCount: cat.targetCount,
          totalIdeas: cat._count.ideas,
          published,
          gap,
          stageBreakdown: byStage,
        }
      })

      // Ask AI for suggestions on which categories need attention
      const prompt = `Analyze these product categories and suggest which need more ideas generated:\n\n${JSON.stringify(analysis, null, 2)}\n\nBrand context: ${brandConfig.verbiagePromptContext || brandConfig.name}\n\nRespond as JSON: { "suggestions": [{ "categoryId": string, "reason": string, "priority": "high" | "medium" | "low" }] }`

      const response = await generateWithOpenRouter(prompt, {
        systemPrompt:
          'You are a product category analyst for a print-on-demand apparel brand.',
        model: brandConfig.aiModelPreference || undefined,
      })

      const suggestions = parseJsonResponse<{
        suggestions: Array<{categoryId: string; reason: string; priority: string}>
      }>(response)

      logger.info(
        {categoryCount: categories.length, suggestionCount: suggestions.suggestions.length},
        'Categories analyzed',
      )

      return {
        categoryIds: categories.map((c) => c.id),
        analysis,
        suggestions: suggestions.suggestions,
      }
    })

    await step.sendEvent('categories-analyzed', {
      name: 'categories.analyzed',
      data: {categoryIds: result.categoryIds},
    })

    return result
  },
)
