import {sanityFetch} from '@/lib/sanity/live'
import {settingsQuery} from '@/lib/sanity/queries'
import type {SettingsQueryResult} from '@/sanity.types'
import {urlForImage} from '@/lib/sanity/utils'
import {Image} from 'next-sanity/image'
import {stegaClean} from '@sanity/client/stega'

interface TrustBadgesProps {
  className?: string
}

type TrustBadge = {
  label?: string
  icon?: {
    asset?: {
      _ref: string
      _type: 'reference'
    }
    alt?: string
    _type: 'image'
  }
  description?: string
}

// Extended settings type with proper trustBadges type
type ExtendedSettings = SettingsQueryResult & {
  trustBadges?: Array<TrustBadge> | null
}

/**
 * Displays trust badges configured in Sanity Settings
 * Shows Amazon Associate disclosure and other trust elements
 */
export default async function TrustBadges({className = ''}: TrustBadgesProps) {
  const {data: settings} = await sanityFetch({
    query: settingsQuery,
    stega: false,
  })

  // Type assertion to fix intersection type issues
  const settingsData = settings as ExtendedSettings | null
  const trustBadges = settingsData?.trustBadges as Array<TrustBadge> | null | undefined

  if (!trustBadges || trustBadges.length === 0) {
    return null
  }

  return (
    <div className={`flex flex-wrap gap-4 items-center ${className}`}>
      {trustBadges.map((badge: TrustBadge, index: number) => {
        if (!badge) return null
        
        const imageUrl = badge.icon ? urlForImage(badge.icon)?.width(80).height(80).url() : null
        
        return (
          <div
            key={index}
            className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 bg-white"
            style={{
              borderRadius: 'var(--border-radius)',
            }}
          >
            {imageUrl && badge.icon && (
              <Image
                src={imageUrl}
                alt={badge.icon.alt || badge.label || 'Trust badge'}
                width={40}
                height={40}
                className="object-contain"
              />
            )}
            <div>
              <div className="text-sm font-semibold" style={{color: 'var(--color-neutral)'}}>
                {badge.label}
              </div>
              {badge.description && (
                <div className="text-xs text-gray-500">{badge.description}</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Amazon Associate disclosure component
 */
export async function AffiliateDisclosure({disclosureText}: {disclosureText?: string | null}) {
  const {data: settings} = await sanityFetch({
    query: settingsQuery,
    stega: false,
  })

  const text = disclosureText || settings?.affiliateDisclosure || 'As an Amazon Associate I earn from qualifying purchases.'

  return (
    <p className="text-xs text-gray-600 italic" style={{fontFamily: 'var(--font-body)'}}>
      {text}
    </p>
  )
}

