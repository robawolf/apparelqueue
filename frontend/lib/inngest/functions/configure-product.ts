import {inngest} from '../client'
import {prisma} from '@/lib/db'
import {generateWithOpenRouter, suggestProductPrompt, parseJsonResponse} from '@/lib/ai'
import {logger} from '@/lib/logger'

interface RevisionEntry {
  stage: string
  type: string
  notes: string
  timestamp: string
}

export const configureProduct = inngest.createFunction(
  {
    id: 'configure-product',
    concurrency: [{limit: 1}],
    retries: 2,
  },
  {event: 'job/configure-product'},
  async ({event, step}) => {
    const {ideaId} = event.data

    await step.run('configure', async () => {
      const idea = await prisma.idea.findUniqueOrThrow({where: {id: ideaId}})
      const brandConfig = await prisma.brandConfig.findFirst({where: {id: 'default'}})
      if (!brandConfig) throw new Error('BrandConfig not found')

      // Get product bucket
      const bucket = idea.productBucketId
        ? await prisma.bucket.findUnique({where: {id: idea.productBucketId}})
        : null
      if (!bucket) throw new Error('Product bucket not assigned')

      // Read forward guidance
      let forwardGuidance: string | undefined
      if (idea.revisionHistory) {
        const history: RevisionEntry[] = JSON.parse(idea.revisionHistory)
        const latestForward = history.find(
          (h) => h.type === 'forward' && h.stage === 'design',
        )
        if (latestForward) forwardGuidance = latestForward.notes
      }

      await prisma.idea.update({
        where: {id: ideaId},
        data: {stage: 'product', status: 'processing'},
      })

      // AI generates product config suggestions
      const {systemPrompt, userPrompt} = suggestProductPrompt(
        idea,
        brandConfig,
        bucket,
        forwardGuidance,
      )

      const response = await generateWithOpenRouter(userPrompt, {
        systemPrompt,
        model: brandConfig.aiModelPreference || undefined,
      })

      const suggestions = parseJsonResponse<{
        suggestions: Array<{
          apparelType: string
          colors: string[]
          sizes: string[]
          retailPrice: string
          reasoning: string
        }>
      }>(response)

      // Store first suggestion as default, all as variants JSON
      const primary = suggestions.suggestions[0]
      await prisma.idea.update({
        where: {id: ideaId},
        data: {
          apparelType: primary?.apparelType || idea.apparelType,
          variants: JSON.stringify(suggestions.suggestions),
          status: 'pending',
        },
      })

      logger.info({ideaId, suggestionCount: suggestions.suggestions.length}, 'Product configured')
    })

    await step.sendEvent('product-configured', {
      name: 'product.configured',
      data: {ideaId},
    })

    return {configured: true}
  },
)
