import {inngest} from '../client'
import {prisma} from '@/lib/db'
import {generateWithOpenRouter, generatePhrasePrompt, parseJsonResponse} from '@/lib/ai'
import {sendStageNotification} from '@/lib/telegram'
import {logger} from '@/lib/logger'

interface GeneratedPhrase {
  phrase: string
  explanation: string
  graphicDescription: string
  graphicStyle: string
  apparelType: string
}

export const generateIdeas = inngest.createFunction(
  {
    id: 'generate-ideas',
    concurrency: [{limit: 1}],
    retries: 3,
  },
  {event: 'job/generate-ideas'},
  async ({event, step}) => {
    const {bucketId, categoryId} = event.data

    const result = await step.run('generate-phrases', async () => {
      // Fetch brand config
      const brandConfig = await prisma.brandConfig.findFirst({where: {id: 'default'}})
      if (!brandConfig) throw new Error('BrandConfig not found')

      // Fetch the required phrase bucket
      const bucket = await prisma.bucket.findUnique({where: {id: bucketId}})
      if (!bucket) throw new Error(`Bucket ${bucketId} not found`)
      if (bucket.stage !== 'phrase') throw new Error(`Bucket ${bucketId} is not a phrase bucket`)

      // Find category — specified or highest need
      let category
      if (categoryId) {
        category = await prisma.category.findUnique({where: {id: categoryId}})
      } else {
        const categories = await prisma.category.findMany({
          where: {isActive: true},
          include: {
            _count: {select: {ideas: {where: {stage: 'publish', status: 'approved'}}}},
          },
        })
        // Pick category with most need (targetCount - published count)
        category = categories.sort(
          (a, b) => b.targetCount - b._count.ideas - (a.targetCount - a._count.ideas),
        )[0]
      }
      if (!category) throw new Error('No active categories found')

      // Fetch existing phrases to avoid duplicates
      const existingIdeas = await prisma.idea.findMany({
        where: {categoryId: category.id},
        select: {phrase: true},
      })
      const existingPhrases = existingIdeas.map((i) => i.phrase)

      // Build prompt
      const {systemPrompt, userPrompt} = generatePhrasePrompt(
        brandConfig,
        category,
        bucket,
        existingPhrases,
      )

      // Generate batch
      const batchSize = brandConfig.ideaBatchSize || 5
      const fullPrompt = `Generate exactly ${batchSize} phrase options.\n\n${userPrompt}`
      const model = brandConfig.aiModelPreference || undefined

      const response = await generateWithOpenRouter(fullPrompt, {systemPrompt, model})
      const phrases = parseJsonResponse<GeneratedPhrase[]>(response)

      // Save each as a separate Idea
      const createdIds: string[] = []
      for (const phrase of phrases) {
        const idea = await prisma.idea.create({
          data: {
            stage: 'phrase',
            status: 'pending',
            phrase: phrase.phrase,
            phraseExplanation: phrase.explanation,
            graphicDescription: phrase.graphicDescription,
            graphicStyle: phrase.graphicStyle,
            apparelType: phrase.apparelType,
            aiModel: model || 'deepseek/deepseek-chat',
            aiPrompt: fullPrompt,
            categoryId: category.id,
            phraseBucketId: bucket.id,
          },
        })
        createdIds.push(idea.id)
      }

      logger.info(
        {count: createdIds.length, categoryId: category.id, bucketId: bucket.id},
        'Ideas generated',
      )

      return {createdIds, categoryId: category.id, bucketName: bucket.name}
    })

    // Send notification
    await step.run('notify', async () => {
      const firstIdea = await prisma.idea.findFirst({
        where: {id: result.createdIds[0]},
      })
      if (firstIdea) {
        await sendStageNotification(firstIdea, result.createdIds.length)
      }
    })

    // Emit events
    for (const ideaId of result.createdIds) {
      await step.sendEvent('idea-created', {
        name: 'idea.created',
        data: {ideaId, categoryId: result.categoryId},
      })
    }

    return {generated: result.createdIds.length}
  },
)
