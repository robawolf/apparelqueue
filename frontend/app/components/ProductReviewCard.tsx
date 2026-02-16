import Link from 'next/link'
import {urlForImage} from '@/lib/sanity/utils'
import {stegaClean} from '@sanity/client/stega'
import DateComponent from '@/app/components/Date'
import {createDataAttribute} from 'next-sanity'
import NextImage from 'next/image'

type ProductReviewCardProps = {
  post: {
    _id: string
    title: string
    slug: string
    excerpt?: string
    date: string
    coverImage?: any
    status?: 'draft' | 'published'
    product?: {
      _id: string
      name: string
      asin: string
      brand?: string | null
      paApiPrimaryImageUrl?: string | null
      discoveryImage?: string | null
    }
  }
}

export default function ProductReviewCard({post}: ProductReviewCardProps) {
  const {_id, title, slug, excerpt, date, coverImage, product, status} = post

  const attr = createDataAttribute({
    id: _id,
    type: 'post',
    path: 'title',
  })

  // Use coverImage if available, otherwise fall back to cached PA API image URL, then discovery image
  const imageUrl = coverImage
    ? urlForImage(coverImage)?.width(600).height(400).url()
    : product?.paApiPrimaryImageUrl || product?.discoveryImage

  const borderClass = status === 'draft'
    ? 'border-2 border-dashed border-amber-400'
    : 'border border-gray-200'

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

      {/* Image Section */}
      {imageUrl ? (
        <div className="relative w-full aspect-video bg-gray-100">
          <NextImage
            src={imageUrl}
            alt={stegaClean(coverImage?.alt) || product?.name || title}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      ) : null}

      <div className="p-6">
        {product?.brand && (
          <div
            className="text-xs font-medium uppercase tracking-wide mb-1"
            style={{color: 'var(--color-neutral)'}}
          >
            {product.brand}
          </div>
        )}
        <h3
          className="text-xl font-bold mb-2 leading-tight"
          style={{fontFamily: 'var(--font-heading)', color: 'var(--color-primary)'}}
        >
          {title}
        </h3>
        {excerpt && <p className="line-clamp-2 text-sm leading-6 text-gray-600 mb-4">{excerpt}</p>}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 font-medium">
            Review
          </span>
          <time className="text-gray-500 text-xs font-mono" dateTime={date}>
            <DateComponent dateString={date} />
          </time>
        </div>
      </div>
    </article>
  )
}
