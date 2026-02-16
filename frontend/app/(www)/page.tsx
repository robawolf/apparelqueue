import {Suspense} from 'react'
import Link from 'next/link'

import {AllPosts} from '@/app/components/Posts'
import ProductCard from '@/app/components/ProductCard'
import TrustBadges from '@/app/components/TrustBadges'
import CoverImage from '@/app/components/CoverImage'
import {settingsQuery, featuredPostsQuery, productReviewQuery} from '@/lib/sanity/queries'
import {sanityFetch} from '@/lib/sanity/live'
import {AllPostsQueryResult} from '@/sanity.types'

// Product type definition (reused from Posts.tsx pattern)
type ProductData = {
  _id: string
  name: string
  brand?: string | null
  images?: Array<{
    asset?: {_ref: string}
    alt?: string
  }> | null
  averageRating?: number | null
  reviewCount?: number | null
  bestSellerBadge?: boolean | null
  category?: {
    name: string
    slug: string
  } | null
}

// Extended featured post type (similar to ExtendedPost in Posts.tsx)
type ExtendedFeaturedPost = AllPostsQueryResult[number] & {
  postType?: 'general' | 'productReview' | 'comparison' | null
  product?: ProductData | null
  status?: 'draft' | 'published'
  coverImage?: {
    asset?: {
      _ref: string
      _type: 'reference'
      _weak?: boolean
    }
    media?: unknown
    hotspot?: unknown
    crop?: unknown
    alt?: string
    _type: 'image'
  } | null
}

export default async function Page() {
  const [{data: settings}, {data: featuredPosts}, {data: productReviews}] = await Promise.all([
    sanityFetch({query: settingsQuery, stega: false}),
    sanityFetch({query: featuredPostsQuery, stega: false}).catch(() => ({data: []})),
    sanityFetch({query: productReviewQuery, stega: false}).catch(() => ({data: []})),
  ])

  // Type assertion to fix intersection type issues
  const featuredPost = featuredPosts?.[0] as ExtendedFeaturedPost | undefined
  const bestProducts = (productReviews as Array<ExtendedFeaturedPost>)?.slice(0, 6) || []

  return (
    <>
      {/* Hero Section with Featured Post/Product */}
      {featuredPost && (() => {
        const productData = featuredPost.postType === 'productReview' && featuredPost.product
          ? featuredPost.product as unknown as ProductData
          : null

        const heroBorderClass = featuredPost.status === 'draft'
          ? 'border-2 border-dashed border-amber-400'
          : 'border-b border-gray-200'

        return (
          <section className={`bg-gradient-to-b from-gray-50 to-white ${heroBorderClass}`}>
            <div className="container py-16 lg:py-24">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  {productData?.images?.[0] ? (
                    <CoverImage image={productData.images[0]} priority />
                  ) : featuredPost.coverImage ? (
                    <CoverImage image={featuredPost.coverImage} priority />
                  ) : null}
                </div>
                <div className="space-y-6">
                  {productData?.category && (
                    <div className="text-sm font-medium uppercase tracking-wide" style={{color: 'var(--color-neutral)'}}>
                      {productData.category.name}
                    </div>
                  )}
                  <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl" style={{fontFamily: 'var(--font-heading)', color: 'var(--color-primary)'}}>
                    {featuredPost.title}
                  </h1>
                  {featuredPost.excerpt && (
                    <p className="text-xl" style={{fontFamily: 'var(--font-body)', color: 'var(--color-neutral)'}}>
                      {featuredPost.excerpt}
                    </p>
                  )}
                  <Link
                    href={`/posts/${featuredPost.slug}`}
                    className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white transition-all duration-200 hover:opacity-90"
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      borderRadius: 'var(--border-radius)',
                    }}
                  >
                    Read More
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )
      })()}

      {/* Best Products Section */}
      {bestProducts.length > 0 && (
        <section className="bg-gray-50 border-b border-gray-200">
          <div className="container py-16 lg:py-24">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4" style={{fontFamily: 'var(--font-heading)', color: 'var(--color-primary)'}}>
                Top Rated Products
              </h2>
              <p className="text-lg" style={{fontFamily: 'var(--font-body)', color: 'var(--color-neutral)'}}>
                Top-rated products reviewed by our team
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bestProducts.map((post: ExtendedFeaturedPost) => {
                if (post.postType === 'productReview' && post.product) {
                  // Cast to any to bypass type checking since ProductCard expects required fields
                  const productData = post.product as unknown as any
                  const cardBorderClass = post.status === 'draft'
                    ? 'border-2 border-dashed border-amber-400 rounded-lg'
                    : ''
                  return (
                    <div key={post._id} className={`transform transition-transform hover:scale-105 ${cardBorderClass}`}>
                      <Link href={`/posts/${post.slug}`}>
                        <ProductCard product={productData} />
                      </Link>
                    </div>
                  )
                }
                return null
              })}
            </div>
          </div>
        </section>
      )}

      {/* Latest Posts */}
      <section className="border-t border-gray-100 bg-white">
        <div className="container py-12 sm:py-20">
          <Suspense>{await AllPosts()}</Suspense>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="border-t border-gray-200 bg-gray-50">
        <div className="container py-12">
          <TrustBadges />
        </div>
      </section>
    </>
  )
}
