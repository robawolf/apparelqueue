import {inngest} from '../client'
import {prisma} from '@/lib/db'
import {generateWithOpenRouter, generateListingPrompt, parseJsonResponse} from '@/lib/ai'
import {logger} from '@/lib/logger'

interface RevisionEntry {
  stage: string
  type: string
  notes: string
  timestamp: string
}

export const configureListing = inngest.createFunction(
  {
    id: 'configure-listing',
    concurrency: [{limit: 1}],
    retries: 2,
  },
  {event: 'job/configure-listing'},
  async ({event, step}) => {
    const {ideaId} = event.data

    await step.run('configure', async () => {
      const idea = await prisma.idea.findUniqueOrThrow({where: {id: ideaId}})
      const brandConfig = await prisma.brandConfig.findFirst({where: {id: 'default'}})
      if (!brandConfig) throw new Error('BrandConfig not found')

      // Get listing bucket
      const bucket = idea.listingBucketId
        ? await prisma.bucket.findUnique({where: {id: idea.listingBucketId}})
        : null
      if (!bucket) throw new Error('Listing bucket not assigned')

      // Read forward guidance
      let forwardGuidance: string | undefined
      if (idea.revisionHistory) {
        const history: RevisionEntry[] = JSON.parse(idea.revisionHistory)
        const latestForward = history.find(
          (h) => h.type === 'forward' && h.stage === 'product',
        )
        if (latestForward) forwardGuidance = latestForward.notes
      }

      await prisma.idea.update({
        where: {id: ideaId},
        data: {stage: 'listing', status: 'processing'},
      })

      // AI generates listing copy options
      const {systemPrompt, userPrompt} = generateListingPrompt(
        idea,
        brandConfig,
        bucket,
        forwardGuidance,
      )

      const response = await generateWithOpenRouter(
        `Generate 3-4 listing copy variations.\n\n${userPrompt}`,
        {systemPrompt, model: brandConfig.aiModelPreference || undefined},
      )

      const options = parseJsonResponse<{
        options: Array<{title: string; description: string; tags: string[]; angle: string}>
      }>(response)

      // Store first option as default
      const primary = options.options[0]
      await prisma.idea.update({
        where: {id: ideaId},
        data: {
          productTitle: primary?.title || null,
          productDescription: primary?.description || null,
          productTags: primary?.tags ? JSON.stringify(primary.tags) : null,
          // Store all options in variants for admin comparison
          variants: JSON.stringify(options.options),
          status: 'pending',
        },
      })

      logger.info({ideaId, optionCount: options.options.length}, 'Listing configured')
    })

    await step.sendEvent('listing-configured', {
      name: 'listing.configured',
      data: {ideaId},
    })

    return {configured: true}
  },
)
