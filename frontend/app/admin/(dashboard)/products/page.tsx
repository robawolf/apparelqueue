import {sanityFetch} from '@/lib/sanity/live'
import {productsAdminQuery} from '@/lib/sanity/queries'
import ProductsSection from '@/app/components/admin/ProductsSection'

type SearchParams = {
  filter?: string
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  // Await searchParams (Next.js 15 async searchParams)
  const params = await searchParams
  const filter = params.filter || 'pending' // Default to 'pending'

  // Fetch filtered products from Sanity
  const {data: products} = await sanityFetch({
    query: productsAdminQuery(filter),
    stega: false,
  })

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">Products</h1>
      <ProductsSection products={products || []} currentFilter={filter} />
    </div>
  )
}
