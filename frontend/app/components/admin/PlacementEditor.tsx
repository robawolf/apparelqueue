'use client'

import {useEffect, useState} from 'react'

interface PrintfileSpec {
  placement: string
  width: number
  height: number
  dpi: number
}

export interface Placement {
  placement: string
  designFileUrl: string
  width: number
  height: number
  top: number
  left: number
}

interface PlacementEditorProps {
  catalogId: number
  designFileUrl?: string
  placements: Placement[]
  onChange: (placements: Placement[]) => void
}

export default function PlacementEditor({catalogId, designFileUrl, placements, onChange}: PlacementEditorProps) {
  const [specs, setSpecs] = useState<PrintfileSpec[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!catalogId) return
    setLoading(true)
    setError(null)
    fetch(`/api/admin/printful/printfiles?catalogId=${catalogId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to fetch printfiles')
        return r.json()
      })
      .then((data: PrintfileSpec[]) => setSpecs(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [catalogId])

  const activePlacements = new Set(placements.map((p) => p.placement))

  const togglePlacement = (spec: PrintfileSpec) => {
    if (activePlacements.has(spec.placement)) {
      onChange(placements.filter((p) => p.placement !== spec.placement))
    } else {
      onChange([
        ...placements,
        {
          placement: spec.placement,
          designFileUrl: designFileUrl || '',
          width: spec.width,
          height: spec.height,
          top: 0,
          left: 0,
        },
      ])
    }
  }

  const updatePlacement = (placement: string, field: keyof Placement, value: string | number) => {
    onChange(
      placements.map((p) =>
        p.placement === placement ? {...p, [field]: value} : p,
      ),
    )
  }

  if (loading) {
    return <div className="text-sm text-gray-500 py-2">Loading placements...</div>
  }
  if (error) {
    return <div className="text-sm text-red-600 py-2">{error}</div>
  }
  if (specs.length === 0) {
    return <div className="text-sm text-gray-500 py-2">No placements available. Set a Printful catalog ID first.</div>
  }

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Print Placements</h4>

      {specs.map((spec) => {
        const active = placements.find((p) => p.placement === spec.placement)
        return (
          <div key={spec.placement} className="border border-gray-100 rounded p-3">
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={!!active}
                onChange={() => togglePlacement(spec)}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium capitalize">{spec.placement}</span>
              <span className="text-xs text-gray-400">
                (max {spec.width}x{spec.height} @ {spec.dpi}dpi)
              </span>
            </label>

            {active && (
              <div className="ml-6 space-y-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Design file URL</label>
                  <input
                    type="text"
                    value={active.designFileUrl}
                    onChange={(e) => updatePlacement(spec.placement, 'designFileUrl', e.target.value)}
                    placeholder="https://..."
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>

                {active.designFileUrl && (
                  <div className="w-24 h-24 rounded border border-gray-200 overflow-hidden">
                    <img
                      src={active.designFileUrl}
                      alt={spec.placement}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                <div className="grid grid-cols-4 gap-2">
                  {(['width', 'height', 'top', 'left'] as const).map((field) => (
                    <div key={field}>
                      <label className="block text-xs text-gray-500 mb-0.5 capitalize">{field}</label>
                      <input
                        type="number"
                        value={active[field]}
                        onChange={(e) => updatePlacement(spec.placement, field, parseInt(e.target.value) || 0)}
                        max={field === 'width' ? spec.width : field === 'height' ? spec.height : undefined}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
