import {generateIdeas} from './generate-ideas'
import {createDesign} from './create-design'
import {refineIdea} from './refine-idea'
import {configureProduct} from './configure-product'
import {configureListing} from './configure-listing'
import {createPrintfulProduct} from './create-printful-product'
import {publishToShopify} from './publish-to-shopify'
import {analyzeCategories} from './analyze-categories'

export const functions = [
  generateIdeas,
  createDesign,
  refineIdea,
  configureProduct,
  configureListing,
  createPrintfulProduct,
  publishToShopify,
  analyzeCategories,
]
