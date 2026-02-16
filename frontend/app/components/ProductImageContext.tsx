'use client'

import {createContext, useContext, useEffect, useState, ReactNode} from 'react'

type ProductImage = {
  url: string
  width?: number
  height?: number
}

type ProductImageData = {
  asin: string
  title?: string
  detailPageUrl?: string
  images: {
    primary?: {
      small?: ProductImage
      medium?: ProductImage
      large?: ProductImage
    }
    variants?: Array<{
      small?: ProductImage
      medium?: ProductImage
      large?: ProductImage
    }>
  }
}

type ProductImageContextType = {
  productData: Record<string, ProductImageData>
  loading: boolean
  error: string | null
}

const ProductImageContext = createContext<ProductImageContextType>({
  productData: {},
  loading: true,
  error: null,
})

export function useProductImages() {
  return useContext(ProductImageContext)
}

interface ProductImageProviderProps {
  asins: string[]
  children: ReactNode
}

export function ProductImageProvider({asins, children}: ProductImageProviderProps) {
  const [productData, setProductData] = useState<Record<string, ProductImageData>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create a stable key from sorted unique ASINs
  const asinKey = [...new Set(asins.filter((asin) => asin && asin.length === 10))].sort().join(',')

  useEffect(() => {
    // Filter out invalid ASINs
    const validAsins = asins.filter((asin) => asin && asin.length === 10)
    const uniqueAsins = [...new Set(validAsins)]

    if (uniqueAsins.length === 0) {
      setLoading(false)
      return
    }

    const fetchProductData = async () => {
      try {
        // Batch in groups of 10 (PA API limit)
        const batches: string[][] = []
        for (let i = 0; i < uniqueAsins.length; i += 10) {
          batches.push(uniqueAsins.slice(i, i + 10))
        }

        const allData: Record<string, ProductImageData> = {}

        for (const batch of batches) {
          const response = await fetch('/api/amazon-images', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({asins: batch}),
          })

          if (response.ok) {
            const result = await response.json()
            if (result.data) {
              Object.assign(allData, result.data)
            }
          }
        }

        setProductData(allData)
      } catch (err) {
        setError('Failed to load product images')
        console.error('Error fetching product images:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProductData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asinKey])

  return (
    <ProductImageContext.Provider value={{productData, loading, error}}>
      {children}
    </ProductImageContext.Provider>
  )
}
