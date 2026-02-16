'use client'

import {useState} from 'react'

interface RevisionEntry {
  stage: string
  type: 'forward' | 'revision'
  notes: string
  timestamp: string
}

export default function RevisionHistory({entries}: {entries: RevisionEntry[]}) {
  const [expanded, setExpanded] = useState(false)

  if (entries.length === 0) return null

  return (
    <div className="mt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
      >
        <span>{expanded ? '▾' : '▸'}</span>
        Revision history ({entries.length})
      </button>
      {expanded && (
        <div className="mt-2 space-y-2 border-l-2 border-gray-200 pl-3">
          {entries.map((entry, i) => (
            <div key={i} className="text-sm">
              <div className="flex items-center gap-2">
                <span className="capitalize text-xs font-medium text-gray-500">{entry.stage}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-xs ${
                    entry.type === 'forward'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-purple-50 text-purple-700'
                  }`}
                >
                  {entry.type}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(entry.timestamp).toLocaleDateString()}
                </span>
              </div>
              <p className="text-gray-600 mt-0.5">{entry.notes}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
