'use client'

import {useState, useEffect} from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {toast} from 'sonner'

type PAAPIProductData = {
  asin: string
  title: string
  detailPageUrl: string
  images: {
    primary: {
      large: {url: string; height: number; width: number}
      medium: {url: string; height: number; width: number}
    }
    variants?: Array<{
      large: {url: string; height: number; width: number}
      medium: {url: string; height: number; width: number}
    }>
  }
  price?: {
    displayAmount: string
    amount: number
    currency: string
  }
}

type Product = {
  _id: string
  name: string
  asin: string
  brand?: string | null
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'paused'
  _createdAt: string
  discoveryImage?: string | null
  images?: Array<{
    imageUrl?: string
    fallbackImage?: {
      asset?: {
        _ref: string
        _type: 'reference'
      }
    }
    alt?: string
  }>
  affiliateUrl?: string | null
  category?: {
    name: string
    slug: {
      current: string
    }
  } | null
  reviewPost?: {
    _id: string
    title: string
    slug: string
  } | null
  comparisonPosts?: Array<{
    _id: string
    title: string
    slug: string
  }> | null
}

interface ProductsSectionProps {
  products: Product[]
  currentFilter: string
}

export default function ProductsSection({products, currentFilter}: ProductsSectionProps) {
  const [loading, setLoading] = useState<string | null>(null)

  // PA API data state
  const [paApiData, setPaApiData] = useState<Record<string, PAAPIProductData>>({})
  const [paApiLoading, setPaApiLoading] = useState(true)

  // Fetch PA API data for all products
  useEffect(() => {
    const fetchPAAPIData = async () => {
      if (products.length === 0) {
        setPaApiLoading(false)
        return
      }

      try {
        // Batch fetch up to 10 ASINs at a time (PA API limit)
        const asins = products.map((p) => p.asin)
        const batches: string[][] = []
        for (let i = 0; i < asins.length; i += 10) {
          batches.push(asins.slice(i, i + 10))
        }

        const allData: Record<string, PAAPIProductData> = {}

        for (const batch of batches) {
          const response = await fetch('/api/amazon-images', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({asins: batch}),
          })

          if (response.ok) {
            const data = await response.json()
            if (data.products) {
              data.products.forEach((product: PAAPIProductData) => {
                allData[product.asin] = product
              })
            }
          }
        }

        setPaApiData(allData)
      } catch (error) {
        console.error('Error fetching PA API data:', error)
      } finally {
        setPaApiLoading(false)
      }
    }

    fetchPAAPIData()
  }, [products])

  const handleApprovalChange = async (productId: string, newStatus: string) => {
    setLoading(productId)
    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({approvalStatus: newStatus}),
      })

      if (!response.ok) {
        throw new Error('Failed to update product')
      }

      // Refresh the page to show updated data
      window.location.reload()
    } catch (error) {
      console.error('Error updating product:', error)
      toast.error('Failed to update product approval status')
    } finally {
      setLoading(null)
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'paused':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Filter options
  const filters = [
    {value: 'all', label: 'All'},
    {value: 'pending', label: 'Pending'},
    {value: 'approved', label: 'Approved'},
    {value: 'rejected', label: 'Rejected'},
    {value: 'paused', label: 'Paused'},
    {value: 'reviewed', label: 'Reviewed'},
    {value: 'compared', label: 'Compared'},
  ]

  return (
    <div>
      {/* Filter Buttons - Now using Link for navigation */}
      <div className="mb-6 flex flex-wrap gap-2">
        {filters.map((filterOption) => {
          const isActive = currentFilter === filterOption.value

          return (
            <Link
              key={filterOption.value}
              href={`/admin/products?filter=${filterOption.value}`}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isActive
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filterOption.label}
            </Link>
          )
        })}
      </div>

      {/* Products List */}
      <div className="space-y-4">
        {products.map((product) => {
          const paData = paApiData[product.asin]
          // Use PA API first, then fall back to discovery image for all products
          const imageUrl = paData?.images?.primary?.medium?.url || product.discoveryImage
          const amazonUrl = paData?.detailPageUrl || product.affiliateUrl || `https://www.amazon.com/dp/${product.asin}`

          return (
            <div
              key={product._id}
              className="bg-white rounded-lg shadow-md p-3 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-6 items-start"
            >
              {/* Product Image */}
              {!imageUrl && paApiLoading ? (
                <div className="relative w-full sm:w-32 h-32 flex-shrink-0 bg-gray-200 rounded animate-pulse flex items-center justify-center">
                  <span className="text-sm text-gray-500">Loading...</span>
                </div>
              ) : imageUrl ? (
                <div className="relative w-full sm:w-32 h-32 flex-shrink-0 bg-gray-100 rounded">
                  <Image
                    src={imageUrl}
                    alt={product.name}
                    fill
                    className="object-contain rounded"
                  />
                </div>
              ) : (
                <div className="relative w-full sm:w-32 h-32 flex-shrink-0 bg-gray-100 rounded flex items-center justify-center">
                  <span className="text-sm text-gray-400">No image</span>
                </div>
              )}

              {/* Product Info */}
              <div className="flex-grow w-full sm:w-auto">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 gap-2">
                  <div className="flex-grow">
                    <h3 className="text-lg sm:text-xl font-bold">{product.name}</h3>
                    {product.brand && (
                      <p className="text-sm text-gray-600">{product.brand}</p>
                    )}
                    <p className="text-xs sm:text-sm text-gray-500">ASIN: {product.asin}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium self-start ${getStatusBadgeColor(product.approvalStatus)}`}
                  >
                    {product.approvalStatus}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <a
                    href={amazonUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 sm:px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                  >
                    <span className="hidden sm:inline">View on </span>Amazon
                  </a>

                  {/* If product has a review post, show different actions */}
                  {product.reviewPost ? (
                    <>
                      <Link
                        href={`/posts/${product.reviewPost.slug}`}
                        className="px-3 sm:px-4 py-2 bg-purple-500 text-white text-sm rounded hover:bg-purple-600 transition-colors"
                      >
                        View Review
                      </Link>
                      <button
                        onClick={() => {
                          toast.info('Create Comparison feature coming soon!')
                        }}
                        className="px-3 sm:px-4 py-2 bg-indigo-500 text-white text-sm rounded hover:bg-indigo-600 transition-colors"
                      >
                        Create Comparison
                      </button>
                    </>
                  ) : (
                    <>
                      {/* State-specific buttons */}
                      {product.approvalStatus === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprovalChange(product._id, 'approved')}
                            disabled={loading === product._id}
                            className="px-3 sm:px-4 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600 disabled:opacity-50"
                          >
                            {loading === product._id ? 'Loading...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleApprovalChange(product._id, 'rejected')}
                            disabled={loading === product._id}
                            className="px-3 sm:px-4 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {product.approvalStatus === 'paused' && (
                        <button
                          onClick={() => handleApprovalChange(product._id, 'pending')}
                          disabled={loading === product._id}
                          className="px-3 sm:px-4 py-2 bg-amber-500 text-white text-sm rounded hover:bg-amber-600 disabled:opacity-50"
                        >
                          {loading === product._id ? 'Loading...' : 'Unpause'}
                        </button>
                      )}

                      {product.approvalStatus === 'rejected' && (
                        <button
                          onClick={() => handleApprovalChange(product._id, 'pending')}
                          disabled={loading === product._id}
                          className="px-3 sm:px-4 py-2 bg-orange-500 text-white text-sm rounded hover:bg-orange-600 disabled:opacity-50"
                        >
                          {loading === product._id ? 'Loading...' : 'Unreject'}
                        </button>
                      )}

                      {product.approvalStatus === 'approved' && (
                        <button
                          onClick={() => handleApprovalChange(product._id, 'pending')}
                          disabled={loading === product._id}
                          className="px-3 sm:px-4 py-2 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 disabled:opacity-50"
                        >
                          {loading === product._id ? 'Loading...' : 'Unapprove'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {products.length === 0 && (
        <p className="text-center text-gray-500 py-8">
          No products found for this filter
        </p>
      )}
    </div>
  )
}
