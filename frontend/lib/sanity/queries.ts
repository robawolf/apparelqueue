import {defineQuery} from 'next-sanity'

export const settingsQuery = defineQuery(`*[_type == "settings"][0]{
  ...,
  activeTheme->{
    _id,
    title,
    slug,
    primaryColor,
    secondaryColor,
    accentColor,
    neutralColor,
    headingFont,
    bodyFont,
    fontSize,
    borderRadius,
    spacing,
    buttonStyle,
    cardStyle,
    navbarStyle,
    description
  },
  affiliateDisclosure,
  amazonAssociateTag,
  ctaButtonText,
  showPriceRange,
  trustBadges,
  twitterHandle,
  googleVerification,
  siteKeywords
}`)

export const themeQuery = defineQuery(`*[_type == "theme" && slug.current == $slug][0]{
  _id,
  title,
  slug,
  primaryColor,
  secondaryColor,
  accentColor,
  neutralColor,
  headingFont,
  bodyFont,
  fontSize,
  borderRadius,
  spacing,
  buttonStyle,
  cardStyle,
  navbarStyle,
  description
}`)

const postFields = /* groq */ `
  _id,
  "status": select(_originalId in path("drafts.**") => "draft", "published"),
  "title": coalesce(title, "Untitled"),
  "slug": slug.current,
  excerpt,
  coverImage,
  "date": coalesce(date, _updatedAt),
  _updatedAt,
  "author": author->{
    firstName,
    lastName,
    picture,
    "preferredAiModel": preferredAiModel->{modelId, name}
  },
  postType,
  featured,
  affiliateDisclosure,
  callToAction,
  metaTitle,
  metaDescription,
  focusKeyword,
  relatedKeywords,
  noIndex,
  "product": product->{
    _id,
    name,
    asin,
    brand,
    paApiPrimaryImageUrl,
    paApiVariantImageUrls,
    paApiImageUpdatedAt,
    discoveryImage,
    "category": category->{name, "slug": slug.current},
    "latestScrapeImages": *[_type == "scrape" && product._ref == ^._id] | order(scrapedAt desc)[0].images
  },
  "products": products[]->{
    _id,
    name,
    asin,
    brand,
    paApiPrimaryImageUrl,
    paApiVariantImageUrls,
    paApiImageUpdatedAt,
    discoveryImage,
    "category": category->{name, "slug": slug.current},
    "latestScrapeImages": *[_type == "scrape" && product._ref == ^._id] | order(scrapedAt desc)[0].images
  },
`

const linkReference = /* groq */ `
  _type == "link" => {
    "page": page->slug.current,
    "post": post->slug.current
  }
`

const linkFields = /* groq */ `
  link {
      ...,
      ${linkReference}
      }
`

export const getPageQuery = defineQuery(`
  *[_type == 'page' && slug.current == $slug][0]{
    _id,
    _type,
    name,
    slug,
    heading,
    subheading,
    "pageBuilder": pageBuilder[]{
      ...,
      _type == "callToAction" => {
        ${linkFields},
      },
      _type == "infoSection" => {
        content[]{
          ...,
          markDefs[]{
            ...,
            ${linkReference}
          }
        }
      },
    },
  }
`)

export const sitemapData = defineQuery(`
  *[_type == "page" || _type == "post" && defined(slug.current) || _type == "category" && defined(slug.current)] | order(_type asc) {
    "slug": slug.current,
    _type,
    _updatedAt,
    featured,
    postType,
  }
`)

export const allPostsQuery = defineQuery(`
  *[_type == "post" && defined(slug.current)] | order(date desc, _updatedAt desc) {
    ${postFields}
  }
`)

export const morePostsQuery = defineQuery(`
  *[_type == "post" && _id != $skip && defined(slug.current)] | order(date desc, _updatedAt desc) [0...$limit] {
    ${postFields}
  }
`)

export const postQuery = defineQuery(`
  *[_type == "post" && slug.current == $slug] [0] {
    content[]{
      ...,
      _type == "productImage" => {
        ...,
        product->{
          _id,
          name,
          asin,
          paApiPrimaryImageUrl,
          paApiVariantImageUrls,
          paApiImageUpdatedAt,
          discoveryImage,
          "latestScrapeImages": *[_type == "scrape" && product._ref == ^._id] | order(scrapedAt desc)[0].images
        }
      },
      markDefs[]{
        ...,
        ${linkReference}
      }
    },
    ${postFields}
  }
`)

export const postPagesSlugs = defineQuery(`
  *[_type == "post" && defined(slug.current)]
  {"slug": slug.current}
`)

export const pagesSlugs = defineQuery(`
  *[_type == "page" && defined(slug.current)]
  {"slug": slug.current}
`)

// Product queries
const productFields = /* groq */ `
  _id,
  name,
  asin,
  brand,
  "category": category->{name, slug},
  approvalStatus,
  affiliateUrl
`

export const productByASINQuery = defineQuery(`
  *[_type == "product" && asin == $asin][0] {
    ${productFields}
  }
`)

export const productsByCategoryQuery = defineQuery(`
  *[_type == "product" && category._ref == $categoryId] | order(_updatedAt desc) {
    ${productFields}
  }
`)

export const relatedProductsQuery = defineQuery(`
  *[_type == "product" && _id != $skip && category._ref == $categoryId] | order(_updatedAt desc) [0...$limit] {
    ${productFields}
  }
`)

// Category queries
export const categoriesQuery = defineQuery(`
  *[_type == "category"] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    description,
    icon,
    "parentCategory": parentCategory->{name, "slug": slug.current}
  }
`)

// Broad categories only (no parent) - for navigation
export const broadCategoriesQuery = defineQuery(`
  *[_type == "category" && !defined(parentCategory)] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    description,
    icon
  }
`)

// Subcategories by parent slug
export const subcategoriesByParentQuery = defineQuery(`
  *[_type == "category" && parentCategory->slug.current == $parentSlug] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    "postCount": count(*[_type == "post" && (
      product->category._ref == ^._id ||
      ^._id in products[]->category._ref
    )])
  }
`)

export const categoryBySlugQuery = defineQuery(`
  *[_type == "category" && slug.current == $slug][0] {
    _id,
    name,
    "slug": slug.current,
    description,
    metaDescription,
    featuredImage,
    icon,
    "parentCategory": parentCategory->{name, "slug": slug.current},
    "isBroadCategory": !defined(parentCategory),
    "posts": *[_type == "post" && category._ref == ^._id && defined(slug.current)] | order(date desc) {
      ${postFields}
    }
  }
`)

// Posts from all subcategories of a parent category (via product.category)
export const postsByParentCategoryQuery = defineQuery(`
  *[_type == "post" && (
    product->category->parentCategory->slug.current == $parentSlug ||
    count(products[@->category->parentCategory->slug.current == $parentSlug]) > 0
  ) && defined(slug.current)] | order(date desc) {
    ${postFields}
  }
`)

export const categorySlugsQuery = defineQuery(`
  *[_type == "category" && defined(slug.current)]
  {"slug": slug.current}
`)

// Specialized post queries
export const productReviewQuery = defineQuery(`
  *[_type == "post" && postType == "productReview" && defined(slug.current)] | order(date desc, _updatedAt desc) {
    ${postFields}
  }
`)

export const comparisonQuery = defineQuery(`
  *[_type == "post" && postType == "comparison" && defined(slug.current)] | order(date desc, _updatedAt desc) {
    ${postFields}
  }
`)

export const featuredPostsQuery = defineQuery(`
  *[_type == "post" && featured == true && defined(slug.current)] | order(date desc, _updatedAt desc) {
    ${postFields}
  }
`)

// Admin queries
export const pendingProductsQuery = defineQuery(`
  *[_type == "product" && approvalStatus == "pending"] | order(_createdAt desc) {
    _id,
    name,
    asin,
    brand,
    approvalStatus,
    _createdAt,
    "category": category->{name, slug}
  }
`)

export function productsAdminQuery(filter?: string) {
  // Build filter condition based on filter type
  let filterCondition = '_type == "product"'

  switch (filter) {
    case 'pending':
      filterCondition = '_type == "product" && approvalStatus == "pending"'
      break
    case 'approved':
      // Approved products that are not yet used in posts
      filterCondition =
        '_type == "product" && approvalStatus == "approved" && !(_id in *[_type == "post"].product._ref) && !(_id in *[_type == "post"].products[]._ref)'
      break
    case 'rejected':
      filterCondition = '_type == "product" && approvalStatus == "rejected"'
      break
    case 'paused':
      filterCondition = '_type == "product" && approvalStatus == "paused"'
      break
    case 'reviewed':
      // Products referenced in productReview posts
      filterCondition =
        '_type == "product" && _id in *[_type == "post" && postType == "productReview"].product._ref'
      break
    case 'compared':
      // Products referenced in comparison posts
      filterCondition =
        '_type == "product" && _id in *[_type == "post" && postType == "comparison"].products[]._ref'
      break
    case 'all':
    default:
      filterCondition = '_type == "product"'
      break
  }

  return defineQuery(`
    *[${filterCondition}] | order(_createdAt desc) {
      _id,
      name,
      asin,
      brand,
      approvalStatus,
      affiliateUrl,
      discoveryImage,
      _createdAt,
      "category": category->{name, slug},
      "reviewPost": *[_type == "post" && postType == "productReview" && product._ref == ^._id][0]{
        _id,
        title,
        "slug": slug.current
      },
      "comparisonPosts": *[_type == "post" && postType == "comparison" && ^._id in products[]._ref]{
        _id,
        title,
        "slug": slug.current
      }
    }
  `)
}

// Keep the old export for backwards compatibility (will be removed after migration)
export const allProductsAdminQuery = productsAdminQuery()

export const draftPostsQuery = defineQuery(`
  *[_type == "post" && _id in path("drafts.**")] | order(_updatedAt desc) {
    _id,
    "title": coalesce(title, "Untitled"),
    "slug": slug.current,
    excerpt,
    content,
    postType,
    _updatedAt,
    "author": author->{firstName, lastName},
    "product": product->{name, asin, discoveryImage},
    "products": products[]->{name, asin, discoveryImage}
  }
`)
