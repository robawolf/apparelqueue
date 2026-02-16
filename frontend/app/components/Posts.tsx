import Link from 'next/link'
import {Image} from 'next-sanity/image'
import {urlForImage} from '@/lib/sanity/utils'
import {stegaClean} from '@sanity/client/stega'

import {sanityFetch} from '@/lib/sanity/live'
import {morePostsQuery, allPostsQuery} from '@/lib/sanity/queries'
import {Post as PostType, AllPostsQueryResult} from '@/sanity.types'
import DateComponent from '@/app/components/Date'
import OnBoarding from '@/app/components/Onboarding'
import Avatar from '@/app/components/Avatar'
import ProductReviewCard from '@/app/components/ProductReviewCard'
import ComparisonCard from '@/app/components/ComparisonCard'
import {createDataAttribute} from 'next-sanity'

// Extended post type with new fields
type ExtendedPost = AllPostsQueryResult[number] & {
  postType?: 'general' | 'productReview' | 'comparison' | null
  product?: any
  products?: any
  status?: 'draft' | 'published'
}

const Post = ({post}: {post: ExtendedPost}) => {
  const {_id, title, slug, excerpt, date, author, postType, status} = post
  // Access product and products directly from post to avoid type narrowing issues
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
    return <ProductReviewCard post={post as any} />
  }

  // Comparison Card
  if (postType === 'comparison' && products && products.length >= 2) {
    return <ComparisonCard post={post as any} />
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

const Posts = ({
  children,
  heading,
  subHeading,
}: {
  children: React.ReactNode
  heading?: string
  subHeading?: string
}) => (
  <div>
    {heading && (
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl" style={{fontFamily: 'var(--font-heading)', color: 'var(--color-primary)'}}>
        {heading}
      </h2>
    )}
    {subHeading && (
      <p className="mt-2 text-lg leading-8" style={{fontFamily: 'var(--font-body)', color: 'var(--color-neutral)'}}>
        {subHeading}
      </p>
    )}
    <div className="pt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{children}</div>
  </div>
)

export const MorePosts = async ({skip, limit}: {skip: string; limit: number}) => {
  const {data} = await sanityFetch({
    query: morePostsQuery,
    params: {skip, limit},
  })

  if (!data || data.length === 0) {
    return null
  }

  return (
    <Posts heading={`Recent Posts (${data?.length})`}>
      {data?.map((post: any) => (
        <Post key={post._id} post={post as ExtendedPost} />
      ))}
    </Posts>
  )
}

export const AllPosts = async () => {
  const {data} = await sanityFetch({query: allPostsQuery})

  if (!data || data.length === 0) {
    return <div></div>
    // return <OnBoarding />
  }

  return (
    <Posts
      heading="Recent Posts"
      subHeading={`${data.length === 1 ? 'This blog post is' : `These ${data.length} blog posts are`} populated from your Sanity Studio.`}
    >
      {data.map((post: any) => (
        <Post key={post._id} post={post as ExtendedPost} />
      ))}
    </Posts>
  )
}
