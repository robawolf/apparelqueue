const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  refining: 'bg-purple-100 text-purple-800',
  processing: 'bg-blue-100 text-blue-800',
}

export default function StatusBadge({status}: {status: string}) {
  return (
    <span className={`px-2 py-1 rounded-full text-xs ${STATUS_COLORS[status] || 'bg-gray-100'}`}>
      {status}
    </span>
  )
}
