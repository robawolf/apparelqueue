'use client'

import Link from 'next/link'
import {useEffect, useState} from 'react'
import type {SettingsQueryResult, BroadCategoriesQueryResult} from '@/sanity.types'

interface HeaderProps {
  settings: SettingsQueryResult
  categories: BroadCategoriesQueryResult
}

export default function Header({settings, categories}: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const shouldBeScrolled = currentScrollY > 20

      // Only update if state actually needs to change
      setIsScrolled(prev => {
        if (prev !== shouldBeScrolled) return shouldBeScrolled
        return prev
      })
    }

    // Check initial scroll position
    handleScroll()

    window.addEventListener('scroll', handleScroll, {passive: true})
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 flex items-center backdrop-blur-lg transition-all duration-300 ${
        isScrolled ? 'h-16' : 'h-24'
      }`}
      style={{
        backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, white 90%)',
        borderBottom: '2px solid var(--color-primary)'
      }}
    >
      <div className={`container px-2 sm:px-6 container-theme transition-all duration-300 ${
        isScrolled ? 'py-3' : 'py-6'
      }`}>
        <div className={`flex items-center justify-between transition-all duration-300 ${
          isScrolled ? 'gap-4' : 'gap-5'
        }`}>
          <Link className="flex items-center gap-2" href="/">
            <span
              className={`font-bold transition-all duration-300 ${
                isScrolled ? 'pl-1' : 'pl-2'
              }`}
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'var(--text-xl)',
                color: 'var(--color-primary)'
              }}
            >
              {settings?.title || 'thingsfor______.com'}
            </span>
          </Link>

          {/* Category Navigation */}
          {categories && categories.length > 0 && (
            <nav className={`hidden md:flex items-center transition-all duration-300 ${
              isScrolled ? 'gap-0.5' : 'gap-1'
            }`}>
              {categories.map((category) => (
                <Link
                  key={category._id}
                  href={`/category/${category.slug}`}
                  className={`text-sm font-medium transition-all duration-300 hover:opacity-70 ${
                    isScrolled ? 'px-2.5 py-1.5' : 'px-3 py-2'
                  }`}
                  style={{
                    fontFamily: 'var(--font-body)',
                    color: 'var(--color-primary)',
                  }}
                >
                  {category.name}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </div>
    </header>
  )
}
