// Export all Inngest functions
// Functions will be added as they are migrated

import {analyzeCategories} from './analyze-categories'
import {discoverProducts} from './discover-products'
import {scrapeProduct} from './scrape-product'
import {createPostDraft} from './create-post-draft'
import {generatePostContent} from './generate-post-content'
import {enhancePost} from './enhance-post'
import {generateImages} from './generate-images'
import {refreshProductImages} from './refresh-product-images'

export const functions = [
  analyzeCategories,
  discoverProducts,
  scrapeProduct,
  createPostDraft,
  generatePostContent,
  enhancePost,
  generateImages,
  refreshProductImages,
]
