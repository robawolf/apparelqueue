import {aiModel} from './documents/aiModel'
import {person} from './documents/person'
import {page} from './documents/page'
import {post} from './documents/post'
import {product} from './documents/product'
import {category} from './documents/category'
import {scrape} from './documents/scrape'
import {callToAction} from './objects/callToAction'
import {infoSection} from './objects/infoSection'
import {productImage} from './objects/productImage'
import {settings} from './singletons/settings'
import {link} from './objects/link'
import {blockContent} from './objects/blockContent'
import theme from './objects/theme'
import color from './objects/color'

// Export an array of all the schema types.  This is used in the Sanity Studio configuration. https://www.sanity.io/docs/schema-types

export const schemaTypes = [
  // Singletons
  settings,
  // Documents
  aiModel,
  page,
  post,
  person,
  product,
  category,
  scrape,
  theme,
  // Objects
  blockContent,
  infoSection,
  callToAction,
  link,
  color,
  productImage,
]
