import {inngest} from '../client'
import {prisma} from '@/lib/db'
import {generateWithOpenRouter, refineIdeaPrompt, parseJsonResponse} from '@/lib/ai'
import {generateDesignConcepts} from '@/lib/fal'
import {suggestGraphicPrompt} from '@/lib/ai'
import {logger} from '@/lib/logger'

interface RevisionEntry {
  stage: string
  type: 'forward' | 'revision'
  notes: string
  timestamp: string
}

export const refineIdea = inngest.createFunction(
  {
    id: 'refine-idea',
    concurrency: [{limit: 1}],
    retries: 2,
  },
  {event: 'job/refine-idea'},
  async ({event, step}) => {
    const {ideaId, notes, stage} = event.data

    await step.run('refine', async () => {
      const idea = await prisma.idea.findUniqueOrThrow({where: {id: ideaId}})
      const brandConfig = await prisma.brandConfig.findFirst({where: {id: 'default'}})
      if (!brandConfig) throw new Error('BrandConfig not found')

      // Prepend new revision entry
      const history: RevisionEntry[] = idea.revisionHistory
        ? JSON.parse(idea.revisionHistory)
        : []
      history.unshift({
        stage,
        type: 'revision',
        notes,
        timestamp: new Date().toISOString(),
      })

      await prisma.idea.update({
        where: {id: ideaId},
        data: {
          status: 'processing',
          revisionHistory: JSON.stringify(history),
        },
      })

      // Get the appropriate bucket for the current stage
      const bucketId =
        stage === 'phrase'
          ? idea.phraseBucketId
          : stage === 'design'
            ? idea.designBucketId
            : stage === 'product'
              ? idea.productBucketId
              : idea.listingBucketId

      const bucket = bucketId
        ? await prisma.bucket.findUnique({where: {id: bucketId}})
        : null
      if (!bucket) throw new Error(`No bucket assigned for stage ${stage}`)

      // Regenerate based on current stage
      if (stage === 'design') {
        // Re-run fal.ai for new design concepts
        const prompt = suggestGraphicPrompt(idea, brandConfig, bucket, notes)
        const concepts = await generateDesignConcepts(prompt, {
          count: 4,
          style: idea.graphicStyle || undefined,
        })

        await prisma.idea.update({
          where: {id: ideaId},
          data: {
            mockupImageUrl: concepts[0]?.imageUrl || idea.mockupImageUrl,
            variants: JSON.stringify(
              concepts.map((c) => ({type: 'design-concept', imageUrl: c.imageUrl, seed: c.seed})),
            ),
            status: 'pending',
          },
        })
      } else {
        // Text-based stages: use OpenRouter
        const {systemPrompt, userPrompt} = refineIdeaPrompt(
          {...idea, revisionHistory: JSON.stringify(history)},
          brandConfig,
          bucket,
          notes,
        )

        const response = await generateWithOpenRouter(userPrompt, {
          systemPrompt,
          model: brandConfig.aiModelPreference || undefined,
        })

        // Update based on stage
        if (stage === 'phrase') {
          const refined = parseJsonResponse<{
            phrase: string
            explanation: string
            graphicDescription: string
            graphicStyle: string
          }>(response)
          await prisma.idea.update({
            where: {id: ideaId},
            data: {
              phrase: refined.phrase,
              phraseExplanation: refined.explanation,
              graphicDescription: refined.graphicDescription,
              graphicStyle: refined.graphicStyle,
              status: 'pending',
            },
          })
        } else if (stage === 'product') {
          const refined = parseJsonResponse<{
            apparelType: string
            variants: unknown[]
          }>(response)
          await prisma.idea.update({
            where: {id: ideaId},
            data: {
              apparelType: refined.apparelType,
              variants: JSON.stringify(refined.variants),
              status: 'pending',
            },
          })
        } else if (stage === 'listing') {
          const refined = parseJsonResponse<{
            title: string
            description: string
            tags: string[]
          }>(response)
          await prisma.idea.update({
            where: {id: ideaId},
            data: {
              productTitle: refined.title,
              productDescription: refined.description,
              productTags: JSON.stringify(refined.tags),
              status: 'pending',
            },
          })
        }
      }

      logger.info({ideaId, stage}, 'Idea refined')
    })

    return {refined: true}
  },
)
