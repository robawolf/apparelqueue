import {NextRequest, NextResponse} from 'next/server'
import {getProductPrintfiles} from '@/lib/printful'

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
    const printfiles = await getProductPrintfiles(catalogId)
    return NextResponse.json(printfiles)
  } catch (error) {
    console.error('Printful printfiles error:', error)
    return NextResponse.json(
      {error: 'Failed to fetch Printful printfiles'},
      {status: 500},
    )
  }
}
