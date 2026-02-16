import type {Metadata, ResolvingMetadata} from 'next'
import {notFound} from 'next/navigation'
import Link from 'next/link'

import {sanityFetch} from '@/lib/sanity/live'
import {categoryBySlugQuery, categorySlugsQuery, subcategoriesByParentQuery, postsByParentCategoryQuery, settingsQuery} from '@/lib/sanity/queries'
import {AllPostsQueryResult} from '@/sanity.types'
import DateComponent from '@/app/components/Date'
import Avatar from '@/app/components/Avatar'
import SubcategoryPills from '@/app/components/SubcategoryPills'
import {BreadcrumbSchema, ItemListSchema} from '@/app/components/StructuredData'
import {createDataAttribute} from 'next-sanity'
import {Image} from 'next-sanity/image'
import {urlForImage, resolveOpenGraphImage} from '@/lib/sanity/utils'
import {stegaClean} from '@sanity/client/stega'

type Props = {
  params: Promise<{slug: string}>
  searchParams: Promise<{sub?: string}>
}

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

// Product array item type for comparisons
type ProductItem = {
  _id: string
  name: string
  category?: {
    name: string
    slug: string
  } | null
}

// Extended post type with new fields
type ExtendedPost = AllPostsQueryResult[number] & {
  postType?: 'general' | 'productReview' | 'comparison' | null
  product?: ProductData | null
  products?: Array<ProductItem | null> | null
  status?: 'draft' | 'published'
}

// Category type
type Category = {
  _id: string
  name: string
  slug: string
  description?: string | null
  metaDescription?: string | null
  featuredImage?: {
    asset?: {_ref: string}
    alt?: string
  } | null
  icon?: {
    asset?: {_ref: string}
    alt?: string
  } | null
  parentCategory?: {
    name: string
    slug: string
  } | null
  isBroadCategory?: boolean
  posts?: ExtendedPost[] | null
}

// Subcategory type for pills
type Subcategory = {
  _id: string
  name: string
  slug: string
  postCount: number
}

/**
 * Generate the static params for the category pages.
 * Learn more: https://nextjs.org/docs/app/api-reference/functions/generate-static-params
 */
export async function generateStaticParams() {
  const {data} = await sanityFetch({
    query: categorySlugsQuery,
    perspective: 'published',
    stega: false,
  })
  return data
}

/**
 * Generate metadata for the category page
 */
export async function generateMetadata(props: Props, parent: ResolvingMetadata): Promise<Metadata> {
  const params = await props.params
  const [{data: category}, {data: settings}] = await Promise.all([
    sanityFetch({
      query: categoryBySlugQuery,
      params,
      stega: false,
    }),
    sanityFetch({query: settingsQuery, stega: false}),
  ])

  if (!category) {
    return {
      title: 'Category Not Found',
    }
  }

  const categoryData = category as Category
  const previousImages = (await parent).openGraph?.images || []

  // Use metaDescription first, fall back to description
  const description = categoryData.metaDescription || categoryData.description || `Browse posts in the ${categoryData.name} category`

  // Get featured image for OG
  const ogImage = resolveOpenGraphImage(categoryData.featuredImage)
  const twitterHandle = settings?.twitterHandle

  return {
    title: categoryData.name,
    description,
    openGraph: {
      title: categoryData.name,
      description,
      images: ogImage ? [ogImage, ...previousImages] : previousImages,
    },
    twitter: {
      card: 'summary_large_image',
      title: categoryData.name,
      description,
      site: twitterHandle ? `@${twitterHandle}` : undefined,
      images: ogImage ? [ogImage] : [],
    },
  } satisfies Metadata
}

const Post = ({post}: {post: ExtendedPost}) => {
  const {_id, title, slug, excerpt, date, author, postType, status} = post
  const product = post.product
  const products = post.products

  const borderClass = status === 'draft'
    ? 'border-2 border-dashed border-amber-400'
    : 'border border-gray-200'

  const attr = createDataAttribute({
    id: _id,
    type: 'post',
    path: 'title',
  })

  // Product Review Card
  if (postType === 'productReview' && product) {
    const productData: ProductData = product as unknown as ProductData
    return (
      <article
        data-sanity={attr()}
        key={_id}
        className={`${borderClass} rounded-lg overflow-hidden bg-white transition-all hover:shadow-lg relative`}
        style={{borderRadius: 'var(--border-radius)'}}
      >
        <Link href={`/posts/${slug}`}>
          <span className="absolute inset-0 z-10" />
        </Link>
        {productData.images?.[0] && (
          <div className="relative w-full aspect-video bg-gray-100">
            <Image
              src={urlForImage(productData.images[0])?.width(600).height(400).url() || ''}
              alt={stegaClean(productData.images[0].alt) || productData.name || title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            {productData.bestSellerBadge && (
              <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">
                Best Seller
              </div>
            )}
          </div>
        )}
        <div className="p-6">
          {productData.brand && (
            <div className="text-xs font-medium uppercase tracking-wide mb-1" style={{color: 'var(--color-neutral)'}}>
              {productData.brand}
            </div>
          )}
          <h3 className="text-xl font-bold mb-2 leading-tight" style={{fontFamily: 'var(--font-heading)', color: 'var(--color-primary)'}}>
            {title}
          </h3>
          {productData.averageRating && (
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm font-semibold">{productData.averageRating.toFixed(1)}</span>
              <svg className="w-4 h-4 fill-yellow-400" viewBox="0 0 20 20">
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
              </svg>
              {productData.reviewCount && (
                <span className="text-xs text-gray-500">({productData.reviewCount.toLocaleString()})</span>
              )}
            </div>
          )}
          {excerpt && (
            <p className="line-clamp-2 text-sm leading-6 text-gray-600 mb-4">{excerpt}</p>
          )}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 font-medium">Review</span>
            <time className="text-gray-500 text-xs font-mono" dateTime={date}>
              <DateComponent dateString={date} />
            </time>
          </div>
        </div>
      </article>
    )
  }

  // Comparison Card
  if (postType === 'comparison' && products) {
    const productsArray = products as Array<ProductItem | null>
    if (productsArray.length >= 2) {
      return (
        <article
          data-sanity={attr()}
          key={_id}
          className={`${borderClass} rounded-lg overflow-hidden bg-white transition-all hover:shadow-lg relative`}
          style={{borderRadius: 'var(--border-radius)'}}
        >
          <Link href={`/posts/${slug}`}>
            <span className="absolute inset-0 z-10" />
          </Link>
          <div className="p-6">
            <h3 className="text-xl font-bold mb-2 leading-tight" style={{fontFamily: 'var(--font-heading)', color: 'var(--color-primary)'}}>
              {title}
            </h3>
            {excerpt && (
              <p className="line-clamp-2 text-sm leading-6 text-gray-600 mb-4">{excerpt}</p>
            )}
            <div className="flex items-center gap-2 mb-4">
              {productsArray.slice(0, 2).map((p, i) => (
                <div key={p?._id || i} className="flex-1 text-center p-2 bg-gray-50 rounded">
                  <div className="text-xs font-medium truncate">{p?.name}</div>
                </div>
              ))}
              <span className="text-gray-400 font-bold">vs</span>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800 font-medium">Comparison</span>
              <time className="text-gray-500 text-xs font-mono" dateTime={date}>
                <DateComponent dateString={date} />
              </time>
            </div>
          </div>
        </article>
      )
    }
  }

  // General Post Card (default)
  return (
    <article
      data-sanity={attr()}
      key={_id}
      className={`${borderClass} rounded-sm p-6 bg-gray-50 flex flex-col justify-between transition-colors hover:bg-white relative`}
      style={{borderRadius: 'var(--border-radius)'}}
    >
      <Link className="hover:text-brand underline transition-colors" href={`/posts/${slug}`}>
        <span className="absolute inset-0 z-10" />
      </Link>
      <div>
        <h3 className="text-2xl font-bold mb-4 leading-tight" style={{fontFamily: 'var(--font-heading)'}}>
          {title}
        </h3>
        {excerpt && (
          <p className="line-clamp-3 text-sm leading-6 text-gray-600 max-w-[70ch]">{excerpt}</p>
        )}
      </div>
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
        {author && author.firstName && author.lastName && (
          <div className="flex items-center">
            <Avatar person={author} small={true} />
          </div>
        )}
        <time className="text-gray-500 text-xs font-mono" dateTime={date}>
          <DateComponent dateString={date} />
        </time>
      </div>
    </article>
  )
}

export default async function CategoryPage(props: Props) {
  const [params, searchParams] = await Promise.all([
    props.params,
    props.searchParams,
  ])

  const subFilter = searchParams.sub

  const [{data}, {data: settings}] = await Promise.all([
    sanityFetch({
      query: categoryBySlugQuery,
      params,
    }),
    sanityFetch({query: settingsQuery, stega: false}),
  ])

  const category = data as Category | null

  if (!category?._id) {
    return notFound()
  }

  const categoryData = category
  const isBroadCategory = categoryData.isBroadCategory
  const siteUrl = settings?.url || ''

  // Fetch subcategories and posts based on category type
  let subcategories: Subcategory[] = []
  let posts: ExtendedPost[] = []
  let parentSlugForPills = categoryData.slug

  if (isBroadCategory) {
    // This is a broad category - fetch its subcategories and all posts from them
    const [{data: subcatsData}, {data: subcatPosts}] = await Promise.all([
      sanityFetch({
        query: subcategoriesByParentQuery,
        params: {parentSlug: categoryData.slug},
      }),
      sanityFetch({
        query: postsByParentCategoryQuery,
        params: {parentSlug: categoryData.slug},
      }),
    ])
    subcategories = (subcatsData || []) as Subcategory[]
    posts = (subcatPosts || []) as ExtendedPost[]

    // Filter by subcategory if ?sub= param exists (check product categories)
    if (subFilter) {
      posts = posts.filter((post) => {
        // Check single product's category (productReview posts)
        if (post.product?.category?.slug === subFilter) return true
        // Check array products' categories (comparison posts)
        if (post.products?.some(p => p?.category?.slug === subFilter)) return true
        return false
      })
    }
  } else {
    // This is a subcategory - fetch its sibling subcategories
    if (categoryData.parentCategory) {
      const {data: siblingsData} = await sanityFetch({
        query: subcategoriesByParentQuery,
        params: {parentSlug: categoryData.parentCategory.slug},
      })
      subcategories = (siblingsData || []) as Subcategory[]
      parentSlugForPills = categoryData.parentCategory.slug
    }
    posts = (categoryData.posts || []) as ExtendedPost[]
  }

  // Get the active subcategory name for display
  const activeSubcategory = subFilter
    ? subcategories.find(s => s.slug === subFilter)
    : null

  // Build category URL for structured data
  const categoryUrl = siteUrl ? `${siteUrl}/category/${categoryData.slug}` : ''

  return (
    <>
      {/* Structured Data */}
      {siteUrl && categoryUrl && (
        <>
          <BreadcrumbSchema
            items={[
              {name: 'Home', url: siteUrl},
              ...(categoryData.parentCategory
                ? [{name: categoryData.parentCategory.name, url: `${siteUrl}/category/${categoryData.parentCategory.slug}`}]
                : []),
              {name: categoryData.name, url: categoryUrl},
            ]}
          />
          {posts.length > 0 && (
            <ItemListSchema
              name={categoryData.name}
              description={categoryData.metaDescription || categoryData.description || undefined}
              url={categoryUrl}
              items={posts.map((post) => ({
                name: post.title || 'Post',
                url: `${siteUrl}/posts/${post.slug}`,
                description: post.excerpt || undefined,
              }))}
            />
          )}
        </>
      )}

      {/* Category Header */}
      <section className="bg-gradient-to-b from-gray-50 to-white border-b border-gray-200">
        <div className="container py-12 lg:py-20">
          <div className="max-w-3xl mx-auto text-center">
            {categoryData.parentCategory && (
              <div className="mb-4">
                <Link
                  href={`/category/${categoryData.parentCategory.slug}`}
                  className="text-sm font-medium hover:underline"
                  style={{color: 'var(--color-neutral)'}}
                >
                  ← {categoryData.parentCategory.name}
                </Link>
              </div>
            )}
            <h1
              className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl mb-4"
              style={{fontFamily: 'var(--font-heading)', color: 'var(--color-primary)'}}
            >
              {activeSubcategory ? activeSubcategory.name : categoryData.name}
            </h1>
            {categoryData.description && !activeSubcategory && (
              <p
                className="text-xl"
                style={{fontFamily: 'var(--font-body)', color: 'var(--color-neutral)'}}
              >
                {categoryData.description}
              </p>
            )}
            <div className="mt-6 text-sm text-gray-600">
              {posts.length} {posts.length === 1 ? 'post' : 'posts'}{activeSubcategory ? ` in ${activeSubcategory.name}` : isBroadCategory ? '' : ' in this category'}
            </div>
          </div>
        </div>
      </section>

      {/* Subcategory Pills - Below category header, becomes sticky on scroll */}
      {subcategories.length > 0 && (
        <SubcategoryPills subcategories={subcategories} parentSlug={parentSlugForPills} />
      )}

      {/* Posts Grid */}
      <section className="bg-white">
        <div className="container py-12 lg:py-24">
          {posts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <Post key={post._id} post={post as ExtendedPost} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600" style={{fontFamily: 'var(--font-body)'}}>
                No posts found in this category yet.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
