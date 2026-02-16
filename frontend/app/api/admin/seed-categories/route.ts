import {NextRequest, NextResponse} from 'next/server'
import {createClient} from '@sanity/client'
import {apiVersion, dataset, projectId} from '@/lib/sanity/api'

/**
 * API endpoint for seeding default categories and subcategories
 * Creates a standard category hierarchy for the site
 *
 * Usage:
 * POST /api/admin/seed-categories
 * Headers:
 *   - Authorization: Bearer {ADMIN_SECRET}
 */

const writeClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN,
})

interface Subcategory {
  name: string
  slug: string
  description: string
  searchFocus: string
  targetProductCount: number
}

interface ParentCategory {
  name: string
  slug: string
  description: string
  subcategories: Subcategory[]
}

// Default category hierarchy for a travel gear site
const DEFAULT_CATEGORIES: ParentCategory[] = [
  {
    name: 'Bags',
    slug: 'bags',
    description: 'Backpacks, daypacks, duffels, and packing solutions',
    subcategories: [
      {
        name: 'Backpacks',
        slug: 'backpacks',
        description: 'Travel backpacks and carry-on packs',
        searchFocus: 'travel backpack carry-on',
        targetProductCount: 10,
      },
      {
        name: 'Daypacks',
        slug: 'daypacks',
        description: 'Lightweight packable daypacks',
        searchFocus: 'packable daypack lightweight',
        targetProductCount: 10,
      },
      {
        name: 'Duffels',
        slug: 'duffels',
        description: 'Travel duffel bags and weekenders',
        searchFocus: 'travel duffel bag weekender',
        targetProductCount: 10,
      },
      {
        name: 'Packing Cubes',
        slug: 'packing-cubes',
        description: 'Compression cubes and organizers',
        searchFocus: 'packing cubes compression travel',
        targetProductCount: 10,
      },
    ],
  },
  {
    name: 'Tech',
    slug: 'tech',
    description: 'Chargers, adapters, power banks, and travel electronics',
    subcategories: [
      {
        name: 'Power Banks',
        slug: 'power-banks',
        description: 'Portable chargers and battery packs',
        searchFocus: 'portable charger power bank travel',
        targetProductCount: 10,
      },
      {
        name: 'Adapters',
        slug: 'adapters',
        description: 'Universal travel adapters and converters',
        searchFocus: 'universal travel adapter international',
        targetProductCount: 10,
      },
      {
        name: 'Cable Organizers',
        slug: 'cable-organizers',
        description: 'Cable management and tech pouches',
        searchFocus: 'cable organizer travel tech pouch',
        targetProductCount: 10,
      },
      {
        name: 'Trackers',
        slug: 'trackers',
        description: 'Luggage trackers and smart tags',
        searchFocus: 'luggage tracker airtag tile',
        targetProductCount: 10,
      },
    ],
  },
  {
    name: 'Apparel',
    slug: 'apparel',
    description: 'Travel clothing, footwear, and wearable accessories',
    subcategories: [
      {
        name: 'Jackets',
        slug: 'jackets',
        description: 'Packable and travel-friendly jackets',
        searchFocus: 'packable travel jacket lightweight',
        targetProductCount: 10,
      },
      {
        name: 'Pants',
        slug: 'pants',
        description: 'Stretch travel pants and convertibles',
        searchFocus: 'travel pants stretch quick-dry',
        targetProductCount: 10,
      },
      {
        name: 'Shoes',
        slug: 'shoes',
        description: 'Comfortable walking and travel shoes',
        searchFocus: 'travel shoes comfortable walking',
        targetProductCount: 10,
      },
      {
        name: 'Base Layers',
        slug: 'base-layers',
        description: 'Merino wool and performance fabrics',
        searchFocus: 'merino wool travel shirt base layer',
        targetProductCount: 10,
      },
    ],
  },
  {
    name: 'Comfort',
    slug: 'comfort',
    description: 'Travel pillows, blankets, eye masks, and sleep essentials',
    subcategories: [
      {
        name: 'Travel Pillows',
        slug: 'travel-pillows',
        description: 'Neck pillows and inflatable options',
        searchFocus: 'travel pillow neck support memory foam',
        targetProductCount: 10,
      },
      {
        name: 'Eye Masks',
        slug: 'eye-masks',
        description: 'Sleep masks for planes and hotels',
        searchFocus: 'sleep mask eye mask travel blackout',
        targetProductCount: 10,
      },
      {
        name: 'Blankets',
        slug: 'blankets',
        description: 'Compact travel blankets and wraps',
        searchFocus: 'travel blanket compact packable',
        targetProductCount: 10,
      },
      {
        name: 'Earplugs',
        slug: 'earplugs',
        description: 'Noise reduction for sleep and flights',
        searchFocus: 'earplugs sleep travel noise canceling',
        targetProductCount: 10,
      },
    ],
  },
  {
    name: 'Accessories',
    slug: 'accessories',
    description: 'Organizers, security items, and travel essentials',
    subcategories: [
      {
        name: 'Toiletry Bags',
        slug: 'toiletry-bags',
        description: 'Hanging and compact toiletry kits',
        searchFocus: 'toiletry bag travel hanging organizer',
        targetProductCount: 10,
      },
      {
        name: 'Locks',
        slug: 'locks',
        description: 'TSA-approved and cable locks',
        searchFocus: 'tsa luggage lock travel security',
        targetProductCount: 10,
      },
      {
        name: 'Wallets',
        slug: 'wallets',
        description: 'RFID-blocking travel wallets',
        searchFocus: 'travel wallet rfid blocking passport',
        targetProductCount: 10,
      },
      {
        name: 'Water Bottles',
        slug: 'water-bottles',
        description: 'Collapsible and filtered bottles',
        searchFocus: 'collapsible water bottle travel filter',
        targetProductCount: 10,
      },
    ],
  },
]

export async function POST(request: NextRequest) {
  try {
    // Check authorization
    const authHeader = request.headers.get('authorization')
    const adminSecret = process.env.ADMIN_SECRET || 'change-this-secret'

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({error: 'Missing authorization header'}, {status: 401})
    }

    const token = authHeader.substring(7)
    if (token !== adminSecret) {
      return NextResponse.json({error: 'Invalid authorization token'}, {status: 401})
    }

    // Check if we have write token
    if (!process.env.SANITY_API_WRITE_TOKEN && !process.env.SANITY_API_TOKEN) {
      return NextResponse.json(
        {error: 'SANITY_API_WRITE_TOKEN or SANITY_API_TOKEN not configured'},
        {status: 500}
      )
    }

    const createdParents: string[] = []
    const createdSubs: string[] = []
    const skipped: string[] = []
    const errors: string[] = []

    // First pass: create all parent categories
    const parentIds: Record<string, string> = {}

    for (const parent of DEFAULT_CATEGORIES) {
      try {
        // Check if parent category already exists
        const existing = await writeClient.fetch(
          `*[_type == "category" && slug.current == $slug][0]._id`,
          {slug: parent.slug}
        )

        if (existing) {
          parentIds[parent.slug] = existing
          skipped.push(parent.name)
        } else {
          // Create the parent category
          const created = await writeClient.create({
            _type: 'category',
            name: parent.name,
            slug: {
              _type: 'slug',
              current: parent.slug,
            },
            description: parent.description,
          })
          parentIds[parent.slug] = created._id
          createdParents.push(parent.name)
        }
      } catch (error: any) {
        errors.push(`${parent.name}: ${error.message}`)
      }
    }

    // Second pass: create all subcategories
    for (const parent of DEFAULT_CATEGORIES) {
      const parentId = parentIds[parent.slug]
      if (!parentId) continue

      for (const sub of parent.subcategories) {
        try {
          // Check if subcategory already exists
          const existing = await writeClient.fetch(
            `*[_type == "category" && slug.current == $slug][0]._id`,
            {slug: sub.slug}
          )

          if (existing) {
            skipped.push(`${parent.name} > ${sub.name}`)
            continue
          }

          // Create the subcategory
          await writeClient.create({
            _type: 'category',
            name: sub.name,
            slug: {
              _type: 'slug',
              current: sub.slug,
            },
            description: sub.description,
            parentCategory: {
              _type: 'reference',
              _ref: parentId,
            },
            searchFocus: sub.searchFocus,
            targetProductCount: sub.targetProductCount,
            discoveryStatus: 'active',
          })

          createdSubs.push(`${parent.name} > ${sub.name}`)
        } catch (error: any) {
          errors.push(`${parent.name} > ${sub.name}: ${error.message}`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      created: [...createdParents, ...createdSubs],
      createdParents,
      createdSubs,
      skipped,
      errors,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Seed categories error:', error)
    return NextResponse.json(
      {error: 'Internal server error', message: error.message || 'Unknown error'},
      {status: 500}
    )
  }
}

export async function GET() {
  const summary = DEFAULT_CATEGORIES.map((p) => ({
    name: p.name,
    subcategories: p.subcategories.map((s) => s.name),
  }))

  return NextResponse.json({
    status: 'ready',
    categories: summary,
    totalParents: DEFAULT_CATEGORIES.length,
    totalSubs: DEFAULT_CATEGORIES.reduce((sum, p) => sum + p.subcategories.length, 0),
    methods: ['GET', 'POST'],
  })
}
