import {inngest} from '../client'
import {prisma} from '@/lib/db'
import {suggestGraphicPrompt} from '@/lib/ai'
import {generateDesignConcepts} from '@/lib/fal'
import {sendStageNotification} from '@/lib/telegram'
import {logger} from '@/lib/logger'

interface RevisionEntry {
  stage: string
  type: string
  notes: string
  timestamp: string
}

export const createDesign = inngest.createFunction(
  {
    id: 'create-design',
    concurrency: [{limit: 1}],
    retries: 2,
  },
  {event: 'job/create-design'},
  async ({event, step}) => {
    const {ideaId} = event.data

    const designResult = await step.run('generate-concepts', async () => {
      const idea = await prisma.idea.findUniqueOrThrow({where: {id: ideaId}})
      const brandConfig = await prisma.brandConfig.findFirst({where: {id: 'default'}})
      if (!brandConfig) throw new Error('BrandConfig not found')

      // Get the design bucket
      const bucket = idea.designBucketId
        ? await prisma.bucket.findUnique({where: {id: idea.designBucketId}})
        : null
      if (!bucket) throw new Error('Design bucket not assigned')

      // Read forward guidance from revision history
      let forwardGuidance: string | undefined
      if (idea.revisionHistory) {
        const history: RevisionEntry[] = JSON.parse(idea.revisionHistory)
        const latestForward = history.find(
          (h) => h.type === 'forward' && h.stage === 'phrase',
        )
        if (latestForward) forwardGuidance = latestForward.notes
      }

      // Update status to processing
      await prisma.idea.update({
        where: {id: ideaId},
        data: {stage: 'design', status: 'processing'},
      })

      // Build image generation prompt
      const prompt = suggestGraphicPrompt(idea, brandConfig, bucket, forwardGuidance)

      // Generate concept variations with fal.ai
      const concepts = await generateDesignConcepts(prompt, {
        count: 4,
        style: idea.graphicStyle || undefined,
      })

      // Store variations and set primary mockup
      await prisma.idea.update({
        where: {id: ideaId},
        data: {
          mockupImageUrl: concepts[0]?.imageUrl || null,
          // Store all variations in revisionHistory-adjacent field (variants JSON)
          variants: JSON.stringify(
            concepts.map((c) => ({type: 'design-concept', imageUrl: c.imageUrl, seed: c.seed})),
          ),
          status: 'pending',
        },
      })

      logger.info({ideaId, conceptCount: concepts.length}, 'Design concepts generated')
      return {conceptCount: concepts.length}
    })

    // Notify
    await step.run('notify', async () => {
      const idea = await prisma.idea.findUniqueOrThrow({where: {id: ideaId}})
      await sendStageNotification(idea)
    })

    await step.sendEvent('design-created', {
      name: 'design.created',
      data: {ideaId},
    })

    return designResult
  },
)
