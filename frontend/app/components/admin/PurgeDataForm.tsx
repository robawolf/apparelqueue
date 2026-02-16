'use client'

import {useState} from 'react'
import {toast} from 'sonner'

interface PurgeDataFormProps {
  asModal?: boolean
  onClose?: () => void
}

export default function PurgeDataForm({asModal = false, onClose}: PurgeDataFormProps) {
  const [purgeSecret, setPurgeSecret] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [dryRun, setDryRun] = useState(true)
  const [excludeDrafts, setExcludeDrafts] = useState(true)
  const [purgeLoading, setPurgeLoading] = useState(false)
  const [purgeResults, setPurgeResults] = useState<any>(null)

  const AVAILABLE_TYPES = ['post', 'product', 'scrape']

  const toggleSchemaType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  const resetForm = () => {
    setPurgeSecret('')
    setSelectedTypes([])
    setDryRun(true)
    setExcludeDrafts(true)
    setPurgeResults(null)
    setPurgeLoading(false)
    if (onClose) onClose()
  }

  const handlePurgeData = async () => {
    if (!purgeSecret) {
      toast.warning('Please enter the admin secret')
      return
    }

    if (selectedTypes.length === 0) {
      toast.warning('Please select at least one schema type to purge')
      return
    }

    if (!dryRun) {
      const confirmed = confirm(
        `WARNING: You are about to permanently delete all documents of type: ${selectedTypes.join(', ')}.\n\nThis action CANNOT be undone.\n\nAre you sure you want to continue?`
      )
      if (!confirmed) return
    }

    setPurgeLoading(true)
    setPurgeResults(null)

    try {
      const response = await fetch('/api/admin/purge-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${purgeSecret}`
        },
        body: JSON.stringify({
          schemaTypes: selectedTypes,
          dryRun,
          excludeDrafts
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to purge data')
      }

      // Check if any errors occurred
      const hasErrors = Object.values(data.results).some((r: any) => r.error)

      setPurgeResults(data)
      setPurgeLoading(false)

      if (!dryRun) {
        if (hasErrors) {
          toast.error('Some documents failed to delete - see details below')
        } else {
          toast.success(`Successfully purged ${data.totalDeleted} documents`)
        }
      } else {
        toast.success('Dry run completed')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to purge data')
      setPurgeLoading(false)
    }
  }

  const formContent = (
    <>
      <div className="space-y-6">
        {/* Admin Secret */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Admin Secret
          </label>
          <input
            type="password"
            value={purgeSecret}
            onChange={(e) => setPurgeSecret(e.target.value)}
            placeholder="Enter admin secret"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            This is the ADMIN_SECRET environment variable
          </p>
        </div>

        {/* Schema Types */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Schema Types to Purge
          </label>
          <div className="grid grid-cols-2 gap-2">
            {AVAILABLE_TYPES.map((type) => (
              <label
                key={type}
                className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(type)}
                  onChange={() => toggleSchemaType(type)}
                  className="w-4 h-4"
                />
                <span className="font-medium">{type}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="w-4 h-4"
            />
            <div>
              <span className="font-medium">Dry Run</span>
              <p className="text-xs text-gray-600">
                Preview what will be deleted without actually deleting
              </p>
            </div>
          </label>

          <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={excludeDrafts}
              onChange={(e) => setExcludeDrafts(e.target.checked)}
              className="w-4 h-4"
            />
            <div>
              <span className="font-medium">Exclude Drafts</span>
              <p className="text-xs text-gray-600">
                Keep draft documents (recommended)
              </p>
            </div>
          </label>
        </div>

        {/* Results */}
        {purgeResults && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-bold mb-2">
              {purgeResults.dryRun ? 'Dry Run Results' : 'Purge Results'}
            </h3>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Total Found:</span> {purgeResults.totalFound}
              </p>
              <p>
                <span className="font-medium">Total Deleted:</span> {purgeResults.totalDeleted}
              </p>
              {purgeResults.totalUnlinked > 0 && (
                <p>
                  <span className="font-medium">References Unlinked:</span> {purgeResults.totalUnlinked}
                </p>
              )}
              {purgeResults.deletionOrder && purgeResults.deletionOrder.length > 1 && (
                <p>
                  <span className="font-medium">Deletion Order:</span>{' '}
                  <span className="text-gray-600">{purgeResults.deletionOrder.join(' → ')}</span>
                </p>
              )}
              <div className="mt-3">
                <p className="font-medium mb-1">By Type:</p>
                {(purgeResults.deletionOrder || Object.keys(purgeResults.results)).map((type: string) => {
                  const result = purgeResults.results[type]
                  if (!result) return null
                  const hasError = !!result.error || (result.unlinkErrors && result.unlinkErrors.length > 0)
                  return (
                    <div key={type} className={`ml-4 text-xs ${hasError ? 'text-red-700' : ''}`}>
                      <span className="font-medium">{type}:</span> {result.found} found
                      {!purgeResults.dryRun && `, ${result.deleted} deleted`}
                      {!purgeResults.dryRun && result.unlinked > 0 && ` (${result.unlinked} refs unlinked)`}
                      {result.unlinkDetails && result.unlinkDetails.length > 0 && (
                        <div className="mt-1 p-2 bg-gray-100 rounded text-gray-700 break-words text-xs">
                          Unlink: {result.unlinkDetails.join(', ')}
                        </div>
                      )}
                      {result.error && (
                        <div className="mt-1 p-2 bg-red-100 rounded text-red-800 break-words">
                          {result.error}
                        </div>
                      )}
                      {result.unlinkErrors && result.unlinkErrors.length > 0 && (
                        <div className="mt-1 p-2 bg-yellow-100 rounded text-yellow-800 break-words">
                          Unlink warnings: {result.unlinkErrors.join('; ')}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {!purgeResults.dryRun && purgeResults.totalDeleted > 0 && (
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                >
                  Refresh Page
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end mt-6">
        <button
          onClick={resetForm}
          disabled={purgeLoading}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
        >
          {purgeResults && !purgeLoading ? 'Close' : 'Cancel'}
        </button>
        <button
          onClick={handlePurgeData}
          disabled={purgeLoading || selectedTypes.length === 0 || !purgeSecret}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
        >
          {purgeLoading ? 'Processing...' : dryRun ? 'Preview Purge' : 'Purge Data'}
        </button>
      </div>
    </>
  )

  if (asModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-red-600">Purge Data</h2>
            <p className="text-sm text-gray-600 mt-1">
              WARNING: This is a destructive operation that will permanently delete data
            </p>
          </div>

          <div className="p-6">
            {formContent}
          </div>
        </div>
      </div>
    )
  }

  // Page layout (non-modal)
  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl">
      <div className="mb-6">
        <p className="text-sm text-red-600 font-medium">
          WARNING: This is a destructive operation that will permanently delete data
        </p>
      </div>
      {formContent}
    </div>
  )
}
