'use client'

import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {useEffect} from 'react'

interface AdminNavProps {
  isOpen: boolean
  onClose: () => void
}

export default function AdminNav({isOpen, onClose}: AdminNavProps) {
  const pathname = usePathname()

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  const stageQueues = [
    {name: 'Phrases', href: '/admin/phrases'},
    {name: 'Designs', href: '/admin/designs'},
    {name: 'Products', href: '/admin/products'},
    {name: 'Listings', href: '/admin/listings'},
    {name: 'Publish', href: '/admin/publish'},
  ]

  const management = [
    {name: 'Buckets', href: '/admin/buckets'},
    {name: 'Categories', href: '/admin/categories'},
    {name: 'Jobs', href: '/admin/jobs'},
    {name: 'Settings', href: '/admin/settings'},
  ]

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col
          fixed inset-y-0 left-0 z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:static md:z-auto
        `}
        aria-label="Main navigation"
      >
        <div className="p-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Queue</h1>
            <p className="text-xs text-gray-500 mt-1">Product Idea Pipeline</p>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close navigation menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="px-3 flex-1">
          <p className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Stage Queues
          </p>
          {stageQueues.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 mb-1 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>{item.name}</span>
              </Link>
            )
          })}

          <p className="px-3 mb-2 mt-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Management
          </p>
          {management.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 mb-1 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto p-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">Admin Dashboard</p>
        </div>
      </aside>
    </>
  )
}
