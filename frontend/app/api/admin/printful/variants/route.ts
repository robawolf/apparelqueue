import {NextRequest, NextResponse} from 'next/server'
import {getCatalogVariants} from '@/lib/printful'

export async function GET(request: NextRequest) {
  const {searchParams} = new URL(request.url)
  const catalogId = searchParams.get('catalogId')

  if (!catalogId) {
    return NextResponse.json(
      {error: 'catalogId is required'},
      {status: 400},
    )
  }

  try {
    const variants = await getCatalogVariants(Number(catalogId))
    return NextResponse.json(variants)
  } catch (error) {
    console.error('Printful variants error:', error)
    return NextResponse.json(
      {error: 'Failed to fetch Printful variants'},
      {status: 500},
    )
  }
}
