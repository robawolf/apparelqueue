'use client'

import Link from 'next/link'
import {useSearchParams} from 'next/navigation'
import {Suspense, useEffect, useRef, useState} from 'react'

type Subcategory = {
  _id: string
  name: string
  slug: string
  postCount: number
}

function SubcategoryPillsInner({
  subcategories,
  parentSlug,
}: {
  subcategories: Subcategory[]
  parentSlug: string
}) {
  const searchParams = useSearchParams()
  const activeSubcategory = searchParams.get('sub')

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const pillsFlexRef = useRef<HTMLDivElement>(null)
  const [showPrevButton, setShowPrevButton] = useState(false)
  const [showNextButton, setShowNextButton] = useState(false)
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false)
  const [isStuck, setIsStuck] = useState(false)
  const [containerHeight, setContainerHeight] = useState<number | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)

  if (subcategories.length === 0) return null

  // Detect when pills become stuck at top using IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        // When sentinel is NOT visible, pills are stuck
        setIsStuck(!entry.isIntersecting)
      },
      {
        threshold: 0,
        // Account for header height (negative top margin)
        rootMargin: `-${isHeaderScrolled ? '64' : '96'}px 0px 0px 0px`
      }
    )

    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [isHeaderScrolled])

  // Detect if we can scroll and show/hide navigation buttons (only when stuck)
  useEffect(() => {
    const container = scrollContainerRef.current

    if (!container || !isStuck) {
      // When not stuck, hide buttons
      setShowPrevButton(false)
      setShowNextButton(false)
      return
    }

    const handleScrollPosition = () => {
      const {scrollLeft, scrollWidth, clientWidth} = container
      setShowPrevButton(scrollLeft > 0)
      setShowNextButton(scrollLeft < scrollWidth - clientWidth - 1)
    }

    // Check on mount and when subcategories change
    handleScrollPosition()

    // Check on resize
    const resizeObserver = new ResizeObserver(handleScrollPosition)
    resizeObserver.observe(container)

    container.addEventListener('scroll', handleScrollPosition, {passive: true})

    return () => {
      container.removeEventListener('scroll', handleScrollPosition)
      resizeObserver.disconnect()
    }
  }, [subcategories, isStuck])

  // Detect header scroll state to adjust sticky position
  useEffect(() => {
    const handleWindowScroll = () => {
      setIsHeaderScrolled(window.scrollY > 20)
    }

    handleWindowScroll()
    window.addEventListener('scroll', handleWindowScroll, {passive: true})
    return () => window.removeEventListener('scroll', handleWindowScroll)
  }, [])

  // Track pills container height for smooth transitions
  useEffect(() => {
    const container = pillsFlexRef.current
    if (!container) return

    // Capture current height before transition
    const currentHeight = container.offsetHeight
    setContainerHeight(currentHeight)
    setIsTransitioning(true)

    // After transition completes (300ms), remove explicit height
    const timeoutId = setTimeout(() => {
      setIsTransitioning(false)
      setContainerHeight(null)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [isStuck])

  const scrollPrev = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: -200,
        behavior: 'smooth'
      })
    }
  }

  const scrollNext = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: 200,
        behavior: 'smooth'
      })
    }
  }

  return (
    <>
      {/* Invisible sentinel element for intersection detection */}
      <div ref={sentinelRef} className="h-px" aria-hidden="true" />

      {/* Pills container with conditional positioning */}
      <div
        className={`z-40 bg-white border-b border-gray-200 transition-all duration-300 ${
          isStuck
            ? `sticky ${isHeaderScrolled ? 'top-16' : 'top-24'}`
            : 'relative'
        }`}
      >
        <div className="relative">
          {/* Previous button - only show when stuck AND scrollable */}
          {isStuck && showPrevButton && (
            <button
              onClick={scrollPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-50 w-10 h-10 rounded-full backdrop-blur-md shadow-lg transition-all duration-300 hover:scale-110 flex items-center justify-center"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-primary) 15%, white 85%)',
                color: 'var(--color-primary)',
              }}
              aria-label="Previous categories"
            >
              <span className="text-xl">←</span>
            </button>
          )}

          {/* Scroll container with conditional overflow */}
          <div
            ref={scrollContainerRef}
            className={`transition-all duration-300 ${
              isStuck
                ? 'overflow-x-auto scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'
                : 'overflow-visible'
            }`}
          >
            {/* Pills with conditional layout */}
            <div
              ref={pillsFlexRef}
              style={isTransitioning && containerHeight !== null ? { height: `${containerHeight}px` } : undefined}
              className={`gap-2 py-6 transition-all duration-300 items-center ${
                isStuck
                  ? 'flex flex-nowrap px-12 md:px-16'
                  : 'flex flex-wrap container'
              }`}
            >
              {/* All button */}
              <Link
                href={`/category/${parentSlug}`}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                  isStuck ? 'whitespace-nowrap flex-shrink-0' : ''
                }`}
                style={{
                  backgroundColor: !activeSubcategory ? 'var(--color-primary)' : 'var(--color-muted, #f3f4f6)',
                  color: !activeSubcategory ? 'white' : 'var(--color-neutral)',
                  borderRadius: 'var(--border-radius)',
                }}
              >
                All
              </Link>

              {/* Subcategory pills */}
              {subcategories.map((sub) => (
                <Link
                  key={sub._id}
                  href={`/category/${parentSlug}?sub=${sub.slug}`}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-colors hover:opacity-80 ${
                    isStuck ? 'whitespace-nowrap flex-shrink-0' : ''
                  }`}
                  style={{
                    backgroundColor: activeSubcategory === sub.slug ? 'var(--color-primary)' : 'var(--color-muted, #f3f4f6)',
                    color: activeSubcategory === sub.slug ? 'white' : 'var(--color-neutral)',
                    borderRadius: 'var(--border-radius)',
                  }}
                >
                  {sub.name} ({sub.postCount})
                </Link>
              ))}
            </div>
          </div>

          {/* Next button - only show when stuck AND scrollable */}
          {isStuck && showNextButton && (
            <button
              onClick={scrollNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-50 w-10 h-10 rounded-full backdrop-blur-md shadow-lg transition-all duration-300 hover:scale-110 flex items-center justify-center"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-primary) 15%, white 85%)',
                color: 'var(--color-primary)',
              }}
              aria-label="Next categories"
            >
              <span className="text-xl">→</span>
            </button>
          )}
        </div>
      </div>
    </>
  )
}

export default function SubcategoryPills({
  subcategories,
  parentSlug,
}: {
  subcategories: Subcategory[]
  parentSlug: string
}) {
  return (
    <Suspense fallback={<div className="h-10" />}>
      <SubcategoryPillsInner subcategories={subcategories} parentSlug={parentSlug} />
    </Suspense>
  )
}
