'use client'

import { createContext, useContext, ReactNode } from 'react'
import type { SettingsQueryResult } from '@/sanity.types'

// Extract the theme type from the Sanity-generated types
export type ThemeConfig = NonNullable<SettingsQueryResult>['activeTheme']

export interface ThemeContextValue {
  theme: ThemeConfig | null
  isLoading: boolean
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: null,
  isLoading: true,
})

export interface ThemeProviderProps {
  children: ReactNode
  theme: ThemeConfig | null
}

export function ThemeProvider({ children, theme }: ThemeProviderProps) {
  const value: ThemeContextValue = {
    theme,
    isLoading: !theme,
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}