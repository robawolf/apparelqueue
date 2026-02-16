import {prisma} from '@/lib/db'
import Link from 'next/link'

export default async function AdminDashboard() {
  const [phrasePending, designPending, productPending, listingPending, publishPending] =
    await Promise.all([
      prisma.idea.count({where: {stage: 'phrase', status: 'pending'}}),
      prisma.idea.count({where: {stage: 'design', status: 'pending'}}),
      prisma.idea.count({where: {stage: 'product', status: 'pending'}}),
      prisma.idea.count({where: {stage: 'listing', status: 'pending'}}),
      prisma.idea.count({where: {stage: 'publish', status: 'pending'}}),
    ])

  const stages = [
    {name: 'Phrases', href: '/admin/phrases', count: phrasePending, color: 'bg-purple-100 text-purple-800'},
    {name: 'Designs', href: '/admin/designs', count: designPending, color: 'bg-pink-100 text-pink-800'},
    {name: 'Products', href: '/admin/products', count: productPending, color: 'bg-orange-100 text-orange-800'},
    {name: 'Listings', href: '/admin/listings', count: listingPending, color: 'bg-green-100 text-green-800'},
    {name: 'Publish', href: '/admin/publish', count: publishPending, color: 'bg-blue-100 text-blue-800'},
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {stages.map((stage) => (
          <Link
            key={stage.href}
            href={stage.href}
            className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
          >
            <p className="text-sm text-gray-500">{stage.name}</p>
            <p className="text-3xl font-bold mt-1">{stage.count}</p>
            <span className={`inline-block mt-2 text-xs px-2 py-1 rounded-full ${stage.color}`}>
              pending review
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
