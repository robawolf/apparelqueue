import Link from 'next/link'
import {urlForImage} from '@/lib/sanity/utils'
import {stegaClean} from '@sanity/client/stega'
import DateComponent from '@/app/components/Date'
import {createDataAttribute} from 'next-sanity'
import NextImage from 'next/image'

type ComparisonCardProps = {
  post: {
    _id: string
    title: string
    slug: string
    excerpt?: string
    date: string
    coverImage?: any
    status?: 'draft' | 'published'
    products?: Array<{
      _id: string
      name: string
      asin: string
      paApiPrimaryImageUrl?: string | null
      discoveryImage?: string | null
    } | null> | null
  }
}

export default function ComparisonCard({post}: ComparisonCardProps) {
  const {_id, title, slug, excerpt, date, coverImage, products, status} = post

  const attr = createDataAttribute({
    id: _id,
    type: 'post',
    path: 'title',
  })

  // Use coverImage if available, otherwise fall back to first product's cached PA API image URL, then discovery image
  const imageUrl = coverImage
    ? urlForImage(coverImage)?.width(600).height(400).url()
    : products?.[0]?.paApiPrimaryImageUrl || products?.[0]?.discoveryImage

  const productsArray = products || []

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

      {/* Image Section (optional) */}
      {imageUrl ? (
        <div className="relative w-full aspect-video bg-gray-100">
          <NextImage
            src={imageUrl}
            alt={stegaClean(coverImage?.alt) || title}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      ) : null}

      <div className="p-6">
        <h3
          className="text-xl font-bold mb-2 leading-tight"
          style={{fontFamily: 'var(--font-heading)', color: 'var(--color-primary)'}}
        >
          {title}
        </h3>
        {excerpt && <p className="line-clamp-2 text-sm leading-6 text-gray-600 mb-4">{excerpt}</p>}
        <div className="flex items-center gap-2 mb-4">
          {productsArray.slice(0, 2).map((p, i) => (
            <div key={p?._id || i} className="flex-1 text-center p-2 bg-gray-50 rounded">
              <div className="text-xs font-medium truncate">{p?.name}</div>
            </div>
          ))}
          {productsArray.length >= 2 && (
            <span className="text-gray-400 font-bold">vs</span>
          )}
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800 font-medium">
            Comparison
          </span>
          <time className="text-gray-500 text-xs font-mono" dateTime={date}>
            <DateComponent dateString={date} />
          </time>
        </div>
      </div>
    </article>
  )
}
