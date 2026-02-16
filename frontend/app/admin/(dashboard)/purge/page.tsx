import PurgeDataForm from '@/app/components/admin/PurgeDataForm'

export default function PurgePage() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-8 text-red-600">Purge Data</h1>
      <p className="text-gray-600 mb-6">
        This utility allows you to delete data from your Sanity dataset. Use with caution.
      </p>
      <PurgeDataForm asModal={false} />
    </div>
  )
}
