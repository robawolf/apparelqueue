export default function BucketBadge({name}: {name: string}) {
  return (
    <span className="px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-800">
      {name}
    </span>
  )
}
