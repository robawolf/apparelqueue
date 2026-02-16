import {inngest} from '../client'
import {prisma} from '@/lib/db'
import {getSyncProduct} from '@/lib/printful'
import {updateProductMetadata, addProductToCollection} from '@/lib/shopify'
import {sendPublishedNotification} from '@/lib/telegram'
import {logger} from '@/lib/logger'

export const publishToShopify = inngest.createFunction(
  {
    id: 'publish-to-shopify',
    concurrency: [{limit: 1}],
    retries: 3,
  },
  {event: 'printful.created'},
  async ({event, step}) => {
    const {ideaId} = event.data

    // Wait for Printful → Shopify sync
    const shopifyProductId = await step.run('wait-for-sync', async () => {
      const idea = await prisma.idea.findUniqueOrThrow({where: {id: ideaId}})
      if (!idea.printfulProductId) throw new Error('No Printful product ID')

      // Poll for sync completion
      for (let i = 0; i < 60; i++) {
        await new Promise((resolve) => setTimeout(resolve, 5000))
        const syncProduct = await getSyncProduct(idea.printfulProductId)
        if (syncProduct.synced > 0) {
          return syncProduct.externalId
        }
      }

      throw new Error('Printful → Shopify sync timed out after 5 minutes')
    })

    // Update Shopify metadata
    await step.run('update-metadata', async () => {
      const idea = await prisma.idea.findUniqueOrThrow({where: {id: ideaId}})

      const tags = idea.productTags ? JSON.parse(idea.productTags) as string[] : []

      await updateProductMetadata(shopifyProductId, {
        tags,
        bodyHtml: idea.productDescription || undefined,
        title: idea.productTitle || undefined,
      })

      // Add to collection if specified
      if (idea.shopifyCollectionId) {
        await addProductToCollection(shopifyProductId, idea.shopifyCollectionId)
      }

      // Get the Shopify store domain for product URL
      const storeDomain = process.env.SHOPIFY_STORE_DOMAIN
      const productUrl = storeDomain
        ? `https://${storeDomain}/products/${shopifyProductId}`
        : null

      await prisma.idea.update({
        where: {id: ideaId},
        data: {
          shopifyProductId,
          shopifyProductUrl: productUrl,
          stage: 'publish',
          status: 'approved',
          publishedAt: new Date(),
        },
      })

      logger.info({ideaId, shopifyProductId}, 'Published to Shopify')
    })

    // Notify
    await step.run('notify', async () => {
      const idea = await prisma.idea.findUniqueOrThrow({where: {id: ideaId}})
      await sendPublishedNotification(idea)
    })

    return {published: true, shopifyProductId}
  },
)
