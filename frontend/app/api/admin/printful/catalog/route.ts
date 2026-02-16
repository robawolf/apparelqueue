import {NextResponse} from 'next/server'
import {getCatalogProducts} from '@/lib/printful'

export async function GET() {
  try {
    const products = await getCatalogProducts()
    return NextResponse.json(products)
  } catch (error) {
    console.error('Printful catalog error:', error)
    return NextResponse.json(
      {error: 'Failed to fetch Printful catalog'},
      {status: 500},
    )
  }
}
