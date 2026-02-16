import {inngest} from '../client'
import {prisma} from '@/lib/db'
import {uploadDesignFile, getFileStatus, createSyncProduct} from '@/lib/printful'
import {exportDesign} from '@/lib/canva'
import {logger} from '@/lib/logger'

export const createPrintfulProduct = inngest.createFunction(
  {
    id: 'create-printful-product',
    concurrency: [{limit: 1}],
    retries: 2,
  },
  {event: 'job/create-printful-product'},
  async ({event, step}) => {
    const {ideaId} = event.data

    const result = await step.run('create-product', async () => {
      const idea = await prisma.idea.findUniqueOrThrow({where: {id: ideaId}})

      // Validate all required fields
      if (!idea.printfulCatalogId) throw new Error('printfulCatalogId is required')
      if (!idea.variants) throw new Error('variants are required')
      if (!idea.productTitle) throw new Error('productTitle is required')

      await prisma.idea.update({
        where: {id: ideaId},
        data: {status: 'processing'},
      })

      // Export final design from Canva if needed
      let designUrl = idea.designFileUrl
      if (!designUrl && idea.canvaDesignId) {
        designUrl = await exportDesign(idea.canvaDesignId, 'png')
        await prisma.idea.update({
          where: {id: ideaId},
          data: {designFileUrl: designUrl},
        })
      }

      if (!designUrl) throw new Error('No design file available')

      // Upload to Printful
      const uploadedFile = await uploadDesignFile(designUrl)

      // Poll for file processing
      let fileReady = false
      for (let i = 0; i < 30; i++) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        const status = await getFileStatus(uploadedFile.id)
        if (status.status === 'ok') {
          fileReady = true
          break
        }
      }
      if (!fileReady) throw new Error('Printful file processing timed out')

      // Parse variants and placements
      const variants = JSON.parse(idea.variants) as Array<{
        printfulVariantId: number
        retailPrice: string
      }>
      const placements = idea.printPlacements
        ? (JSON.parse(idea.printPlacements) as Array<{placement: string}>)
        : [{placement: 'front'}]

      // Create sync product
      const product = await createSyncProduct({
        externalId: idea.id,
        title: idea.productTitle,
        description: idea.productDescription || '',
        catalogProductId: idea.printfulCatalogId,
        variants: variants.map((v) => ({
          variantId: v.printfulVariantId,
          retailPrice: v.retailPrice,
          files: placements.map((p) => ({
            placement: p.placement,
            url: uploadedFile.url,
          })),
        })),
      })

      await prisma.idea.update({
        where: {id: ideaId},
        data: {
          printfulProductId: String(product.id),
          printfulExternalId: product.externalId,
        },
      })

      logger.info({ideaId, printfulProductId: product.id}, 'Printful product created')
      return {printfulProductId: String(product.id)}
    })

    await step.sendEvent('printful-created', {
      name: 'printful.created',
      data: {ideaId, printfulProductId: result.printfulProductId},
    })

    return result
  },
)
