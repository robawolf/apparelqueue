'use client'

import {useEffect, useState} from 'react'

interface CatalogVariant {
  id: number
  product_id: number
  name: string
  size: string
  color: string
  color_code: string
  price: string
  in_stock: boolean
}

export interface SelectedVariant {
  printfulVariantId: number
  size: string
  color: string
  colorHex: string
  retailPrice: string
}

interface VariantPickerProps {
  catalogId: number
  selectedVariants: SelectedVariant[]
  onChange: (variants: SelectedVariant[]) => void
  defaultMarkup?: number
}

interface ColorGroup {
  color: string
  colorHex: string
  variants: CatalogVariant[]
}

export default function VariantPicker({catalogId, selectedVariants, onChange, defaultMarkup = 2}: VariantPickerProps) {
  const [allVariants, setAllVariants] = useState<CatalogVariant[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!catalogId) return
    setLoading(true)
    setError(null)
    fetch(`/api/admin/printful/variants?catalogId=${catalogId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to fetch variants')
        return r.json()
      })
      .then((data: CatalogVariant[]) => setAllVariants(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [catalogId])

  // Group variants by color
  const colorGroups: ColorGroup[] = []
  const colorMap = new Map<string, ColorGroup>()
  for (const v of allVariants) {
    if (!v.in_stock) continue
    let group = colorMap.get(v.color_code)
    if (!group) {
      group = {color: v.color, colorHex: v.color_code, variants: []}
      colorMap.set(v.color_code, group)
      colorGroups.push(group)
    }
    group.variants.push(v)
  }

  const selectedIds = new Set(selectedVariants.map((v) => v.printfulVariantId))

  const isColorSelected = (group: ColorGroup) =>
    group.variants.some((v) => selectedIds.has(v.id))

  const toggleVariant = (variant: CatalogVariant) => {
    if (selectedIds.has(variant.id)) {
      onChange(selectedVariants.filter((v) => v.printfulVariantId !== variant.id))
    } else {
      const retailPrice = (parseFloat(variant.price) * defaultMarkup).toFixed(2)
      onChange([
        ...selectedVariants,
        {
          printfulVariantId: variant.id,
          size: variant.size,
          color: variant.color,
          colorHex: variant.color_code,
          retailPrice,
        },
      ])
    }
  }

  const toggleAllSizesForColor = (group: ColorGroup) => {
    const allSelected = group.variants.every((v) => selectedIds.has(v.id))
    if (allSelected) {
      const groupIds = new Set(group.variants.map((v) => v.id))
      onChange(selectedVariants.filter((v) => !groupIds.has(v.printfulVariantId)))
    } else {
      const newVariants = [...selectedVariants]
      for (const v of group.variants) {
        if (!selectedIds.has(v.id)) {
          newVariants.push({
            printfulVariantId: v.id,
            size: v.size,
            color: v.color,
            colorHex: v.color_code,
            retailPrice: (parseFloat(v.price) * defaultMarkup).toFixed(2),
          })
        }
      }
      onChange(newVariants)
    }
  }

  const updatePrice = (variantId: number, price: string) => {
    onChange(
      selectedVariants.map((v) =>
        v.printfulVariantId === variantId ? {...v, retailPrice: price} : v,
      ),
    )
  }

  if (loading) {
    return <div className="text-sm text-gray-500 py-2">Loading variants...</div>
  }
  if (error) {
    return <div className="text-sm text-red-600 py-2">{error}</div>
  }
  if (allVariants.length === 0) {
    return <div className="text-sm text-gray-500 py-2">No variants available. Set a Printful catalog ID first.</div>
  }

  return (
    <div className="space-y-3">
      {/* Color swatches */}
      <div>
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Colors</h4>
        <div className="flex flex-wrap gap-2">
          {colorGroups.map((group) => (
            <button
              key={group.colorHex}
              onClick={() => toggleAllSizesForColor(group)}
              title={group.color}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                isColorSelected(group)
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              style={{backgroundColor: group.colorHex}}
            />
          ))}
        </div>
      </div>

      {/* Size checkboxes per selected color */}
      {colorGroups
        .filter((g) => isColorSelected(g))
        .map((group) => (
          <div key={group.colorHex} className="border border-gray-100 rounded p-3">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-4 h-4 rounded-full border border-gray-300 inline-block"
                style={{backgroundColor: group.colorHex}}
              />
              <span className="text-sm font-medium">{group.color}</span>
            </div>
            <div className="space-y-1.5">
              {group.variants.map((v) => {
                const selected = selectedVariants.find((sv) => sv.printfulVariantId === v.id)
                return (
                  <div key={v.id} className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm min-w-[80px]">
                      <input
                        type="checkbox"
                        checked={!!selected}
                        onChange={() => toggleVariant(v)}
                        className="rounded border-gray-300"
                      />
                      {v.size}
                    </label>
                    {selected && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400">Cost: ${v.price}</span>
                        <span className="text-gray-400">|</span>
                        <label className="flex items-center gap-1">
                          Retail: $
                          <input
                            type="number"
                            step="0.01"
                            value={selected.retailPrice}
                            onChange={(e) => updatePrice(v.id, e.target.value)}
                            className="w-20 px-1.5 py-0.5 border border-gray-300 rounded text-sm"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

      {/* Summary */}
      {selectedVariants.length > 0 && (
        <div className="text-xs text-gray-500">
          {selectedVariants.length} variant{selectedVariants.length !== 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  )
}
