import type {Metadata, ResolvingMetadata} from 'next'
import {draftMode} from 'next/headers'
import Image from 'next/image'
import {notFound} from 'next/navigation'
import {type PortableTextBlock} from 'next-sanity'
import {Suspense} from 'react'

import Avatar from '@/app/components/Avatar'
import CoverImage from '@/app/components/CoverImage'
import {MorePosts} from '@/app/components/Posts'
import PortableText from '@/app/components/PortableText'
import ComparisonTable from '@/app/components/ComparisonTable'
import PostAdminControls from '@/app/components/PostAdminControls'
import {ArticleSchema, ReviewSchema, BreadcrumbSchema} from '@/app/components/StructuredData'
import TrustBadges, {AffiliateDisclosure} from '@/app/components/TrustBadges'
import {client} from '@/lib/sanity/client'
import {sanityFetch} from '@/lib/sanity/live'
import {postPagesSlugs, postQuery, settingsQuery} from '@/lib/sanity/queries'
import {token} from '@/lib/sanity/token'
import {resolveOpenGraphImage} from '@/lib/sanity/utils'
import {PostQueryResult} from '@/sanity.types'

type Props = {
  params: Promise<{slug: string}>
}

// Simplified product type - minimal reference for PA API lookups
// Detailed product data (images, prices, features) should come from PA API calls, not stored data
type ExtendedProductData = {
  _id: string
  name: string
  asin?: string | null
  brand?: string | null
  paApiPrimaryImageUrl?: string | null
  paApiVariantImageUrls?: string[] | null
  paApiImageUpdatedAt?: string | null
  discoveryImage?: string | null
  latestScrapeImages?: string[] | null
  category?: {
    _id: string
    name: string
    slug: string
  } | null
}

/**
 * Check if PA API images are fresh (updated within 24 hours)
 * Amazon requires product data to be refreshed every 24 hours
 */
function isPaApiImageFresh(updatedAt: string | null | undefined): boolean {
  if (!updatedAt) return false
  const updatedTime = new Date(updatedAt).getTime()
  const now = Date.now()
  const twentyFourHours = 24 * 60 * 60 * 1000
  return (now - updatedTime) < twentyFourHours
}

// Extended post query result type
type ExtendedPostQueryResult = NonNullable<PostQueryResult> & {
  postType?: 'general' | 'productReview' | 'comparison' | null
  product?: ExtendedProductData | null
  products?: Array<ExtendedProductData | null> | null
  callToAction?: {
    text?: string | null
  } | null
  content?: Array<PortableTextBlock> | null
  affiliateDisclosure?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
  focusKeyword?: string | null
  relatedKeywords?: string[] | null
  noIndex?: boolean | null
  _updatedAt?: string | null
}

/**
 * Generate the static params for the page.
 * Learn more: https://nextjs.org/docs/app/api-reference/functions/generate-static-params
 */
export async function generateStaticParams() {
  const {data} = await sanityFetch({
    query: postPagesSlugs,
    // Use the published perspective in generateStaticParams
    perspective: 'published',
    stega: false,
  })
  return data
}

/**
 * Generate metadata for the page.
 * Learn more: https://nextjs.org/docs/app/api-reference/functions/generate-metadata#generatemetadata-function
 */
export async function generateMetadata(props: Props, parent: ResolvingMetadata): Promise<Metadata> {
  const params = await props.params
  const [{data: post}, {data: settings}] = await Promise.all([
    sanityFetch({
      query: postQuery,
      params,
      // Metadata should never contain stega
      stega: false,
    }),
    sanityFetch({query: settingsQuery, stega: false}),
  ])

  const previousImages = (await parent).openGraph?.images || []
  const ogImage = resolveOpenGraphImage(post?.coverImage)
  const extendedPost = post as unknown as ExtendedPostQueryResult | null

  // Use SEO fields with fallbacks
  const title = extendedPost?.metaTitle || extendedPost?.title
  const description = extendedPost?.metaDescription || extendedPost?.excerpt || undefined
  const twitterHandle = settings?.twitterHandle

  return {
    authors:
      post?.author?.firstName && post?.author?.lastName
        ? [{name: `${post.author.firstName} ${post.author.lastName}`}]
        : [],
    title,
    description,
    openGraph: {
      type: 'article',
      title,
      description,
      images: ogImage ? [ogImage, ...previousImages] : previousImages,
      publishedTime: post?.date || undefined,
      modifiedTime: extendedPost?._updatedAt || undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      site: twitterHandle ? `@${twitterHandle}` : undefined,
      images: ogImage ? [ogImage] : [],
    },
    // Add noindex if the post is marked as hidden from search engines
    robots: extendedPost?.noIndex
      ? {
          index: false,
          follow: false,
        }
      : undefined,
  } satisfies Metadata
}

export default async function PostPage(props: Props) {
  const params = await props.params
  const {isEnabled: isDraftMode} = await draftMode()

  // When in draft mode, use raw perspective to see drafts with their actual IDs
  let post: PostQueryResult | null = null
  if (isDraftMode) {
    const rawClient = client.withConfig({
      perspective: 'raw',
      useCdn: false,
      token,
    })
    post = await rawClient.fetch(postQuery, params)
  } else {
    const result = await sanityFetch({query: postQuery, params})
    post = result.data
  }

  const [{data: settings}] = await Promise.all([sanityFetch({query: settingsQuery, stega: false})])

  if (!post?._id) {
    return notFound()
  }

  // Type assertion to fix intersection type issues
  const postData = post as unknown as ExtendedPostQueryResult

  const isProductReview = postData.postType === 'productReview'
  const isComparison = postData.postType === 'comparison'
  const productData = postData.product as ExtendedProductData | null | undefined

  // Determine if post is a draft based on _id prefix
  const postStatus: 'draft' | 'published' = postData._id.startsWith('drafts.') ? 'draft' : 'published'

  // TODO: Add PA API integration here to fetch real-time product data (images, prices, ratings)
  // Use productData.asin to make PA API calls for displaying current Amazon data

  // Build structured data props
  const siteUrl = settings?.url || ''
  const postUrl = siteUrl ? `${siteUrl}/posts/${postData.slug}` : ''
  const siteName = settings?.title || 'Blog'
  const authorName =
    postData.author?.firstName && postData.author?.lastName
      ? `${postData.author.firstName} ${postData.author.lastName}`
      : 'Anonymous'
  const ogImage = resolveOpenGraphImage(postData.coverImage)
  const categoryName = productData?.category?.name || ''
  const categorySlug = productData?.category?.slug || ''

  // Hero product image component for when there's no cover image
  // Uses compliance logic: draft mode allows all images (PA API + scrapes), published mode requires fresh PA API images
  const HeroProductImage = ({product, isDraft}: {product: ExtendedProductData; isDraft: boolean}) => {
    const paApiFresh = isPaApiImageFresh(product.paApiImageUpdatedAt)

    // Build combined image pool: PA API images + scrape images
    const allImages = [
      product.paApiPrimaryImageUrl,
      ...(product.paApiVariantImageUrls || []),
      ...(product.latestScrapeImages || []),
    ].filter((url): url is string => !!url)

    // Determine which image to show based on draft/published mode
    let imageUrl: string | null = null

    if (isDraft) {
      // Draft mode: use combined pool with all available images
      imageUrl = allImages[0] || product.discoveryImage || null
    } else {
      // Published mode: only show fresh PA API images
      if (paApiFresh && product.paApiPrimaryImageUrl) {
        imageUrl = product.paApiPrimaryImageUrl
      }
    }

    // Placeholder when no valid image is available
    if (!imageUrl) {
      return (
        <div
          className="bg-gray-100 flex flex-col items-center justify-center text-gray-400 rounded-lg"
          style={{width: 400, height: 300, aspectRatio: '4/3'}}
        >
          <svg
            className="w-16 h-16 mb-3 opacity-50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-sm">Image loading...</span>
        </div>
      )
    }

    const associateTag = process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG || 'thingsfor0f-20'
    const amazonUrl = product.asin
      ? `https://www.amazon.com/dp/${product.asin}?tag=${associateTag}`
      : null

    const imageElement = (
      <Image
        src={imageUrl}
        alt={product.name || 'Product image'}
        width={400}
        height={400}
        className="object-contain rounded-lg"
        priority
      />
    )

    return amazonUrl ? (
      <a
        href={amazonUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="block hover:opacity-80 transition-opacity"
      >
        {imageElement}
      </a>
    ) : (
      imageElement
    )
  }

  return (
    <>
      {/* Structured Data */}
      {siteUrl && postUrl && (
        <>
          <BreadcrumbSchema
            items={[
              {name: 'Home', url: siteUrl},
              ...(categoryName && categorySlug
                ? [{name: categoryName, url: `${siteUrl}/category/${categorySlug}`}]
                : []),
              {name: postData.title || 'Post', url: postUrl},
            ]}
          />
          <ArticleSchema
            title={postData.title || 'Untitled'}
            description={postData.metaDescription || postData.excerpt || ''}
            url={postUrl}
            image={ogImage?.url}
            datePublished={postData.date || new Date().toISOString()}
            dateModified={postData._updatedAt || undefined}
            author={{name: authorName}}
            publisher={{name: siteName}}
          />
          {isProductReview && productData && (
            <ReviewSchema
              itemReviewed={{
                name: productData.name || 'Product',
                brand: productData.brand || undefined,
                sku: productData.asin || undefined,
              }}
              author={{name: authorName}}
              datePublished={postData.date || new Date().toISOString()}
              reviewBody={postData.excerpt || undefined}
              url={postUrl}
              publisher={{name: siteName}}
            />
          )}
        </>
      )}

      {/* Hero Section - Responsive 2-column layout */}
      <div className="">
        <div className="container my-12 lg:my-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start pb-6 mb-6 border-b border-gray-100">
            {/* Left column: Text content */}
            <div className="flex flex-col gap-6 order-2 lg:order-1">
              {isProductReview && productData?.brand && (
                <div className="text-sm font-medium uppercase tracking-wide" style={{color: 'var(--color-neutral)'}}>
                  {productData.brand}
                </div>
              )}
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                {postData.title}
              </h1>
              {postData.excerpt && (
                <p className="text-xl text-gray-600">
                  {postData.excerpt}
                </p>
              )}
              {postData.author && postData.author.firstName && postData.author.lastName && (
                <div className="flex gap-4 items-center">
                  <Avatar person={postData.author} date={postData.date} />
                </div>
              )}
            </div>

            {/* Right column: Hero image - Cover image → PA API primary → discovery fallback */}
            <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
              {postData.coverImage ? (
                <CoverImage image={postData.coverImage} priority />
              ) : isProductReview && productData ? (
                <HeroProductImage product={productData} isDraft={isDraftMode} />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="">
        <div className="container my-12 lg:my-24 grid gap-12">
          <div>
            {/* Comparison Table for Comparison Posts */}
            {isComparison && postData.products && (postData.products as Array<ExtendedProductData | null>).length >= 2 && (
              <div className="mb-12">
                <h2 className="text-3xl font-bold mb-6" style={{fontFamily: 'var(--font-heading)', color: 'var(--color-primary)'}}>
                  Product Comparison
                </h2>
                <ComparisonTable products={postData.products as unknown as any} />
                <div className="mt-6">
                  <AffiliateDisclosure disclosureText={postData.affiliateDisclosure} />
                </div>
              </div>
            )}

            {/* Article Content - Original Editorial Content Only */}
            <article className="gap-6 grid">
              {postData.content && postData.content.length > 0 && (
                <PortableText className="max-w-3xl" value={postData.content} isDraftMode={isDraftMode} />
              )}
            </article>
          </div>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="border-t border-gray-200 bg-gray-50">
        <div className="container py-12">
          <TrustBadges />
        </div>
      </div>

      {/* More Posts */}
      <div className="border-t border-gray-100 bg-gray-50">
        <div className="container py-12 lg:py-24 grid gap-12">
          <aside>
            <Suspense>{await MorePosts({skip: postData._id, limit: 2})}</Suspense>
          </aside>
        </div>
      </div>

      {/* Admin Controls - Only visible when draft mode is enabled */}
      {isDraftMode && <PostAdminControls postId={postData._id} status={postStatus} />}
    </>
  )
}
