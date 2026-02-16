'use client'

import { useTheme } from '@/app/context/ThemeContext'
import { generateThemeClasses } from '@/app/lib/theme-utils'

export default function ThemeDemo() {
  const { theme, isLoading } = useTheme()

  if (isLoading) {
    return <div className="p-4">Loading theme...</div>
  }

  const classes = generateThemeClasses(theme)

  return (
    <div className={`p-8 space-y-6 ${classes.container} mx-auto`}>
      <div className="space-y-4">
        <h1 className={`text-4xl font-bold ${classes.heading}`} style={{ color: 'var(--color-primary)' }}>
          Theme Demo
        </h1>
        <p className={`text-lg ${classes.body}`} style={{ color: 'var(--color-neutral)' }}>
          This component demonstrates the theme integration system. The colors, fonts, and styling are all controlled by the Sanity theme configuration.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Colors Demo */}
        <div className={`p-6 ${classes.card} rounded-lg`}>
          <h2 className={`text-2xl font-semibold mb-4 ${classes.heading}`}>Colors</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded"
                style={{ backgroundColor: 'var(--color-primary)' }}
              />
              <span className={classes.body}>Primary Color</span>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded"
                style={{ backgroundColor: 'var(--color-secondary)' }}
              />
              <span className={classes.body}>Secondary Color</span>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded"
                style={{ backgroundColor: 'var(--color-accent)' }}
              />
              <span className={classes.body}>Accent Color</span>
            </div>
          </div>
        </div>

        {/* Typography Demo */}
        <div className={`p-6 ${classes.card} rounded-lg`}>
          <h2 className={`text-2xl font-semibold mb-4 ${classes.heading}`}>Typography</h2>
          <div className="space-y-2">
            <p className={`text-xs ${classes.body}`}>Extra Small Text</p>
            <p className={`text-sm ${classes.body}`}>Small Text</p>
            <p className={`text-base ${classes.body}`}>Base Text</p>
            <p className={`text-lg ${classes.body}`}>Large Text</p>
            <p className={`text-xl ${classes.body}`}>Extra Large Text</p>
          </div>
        </div>
      </div>

      {/* Buttons Demo */}
      <div className="space-y-4">
        <h2 className={`text-2xl font-semibold ${classes.heading}`}>Buttons</h2>
        <div className="flex flex-wrap gap-4">
          <button
            className={`px-6 py-2 text-white ${classes.button}`}
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            Primary Button
          </button>
          <button
            className={`px-6 py-2 text-white ${classes.button}`}
            style={{ backgroundColor: 'var(--color-secondary)' }}
          >
            Secondary Button
          </button>
          <button
            className={`px-6 py-2 text-white ${classes.button}`}
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            Accent Button
          </button>
        </div>
      </div>

      {/* Theme Info */}
      {theme && (
        <div className={`p-6 ${classes.card} rounded-lg`}>
          <h2 className={`text-2xl font-semibold mb-4 ${classes.heading}`}>Current Theme</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Name:</strong> {theme.title}
            </div>
            <div>
              <strong>Heading Font:</strong> {theme.headingFont || 'Inter'}
            </div>
            <div>
              <strong>Body Font:</strong> {theme.bodyFont || 'Inter'}
            </div>
            <div>
              <strong>Button Style:</strong> {theme.buttonStyle || 'rounded'}
            </div>
            <div>
              <strong>Card Style:</strong> {theme.cardStyle || 'shadow'}
            </div>
            <div>
              <strong>Border Radius:</strong> {theme.borderRadius || 'md'}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}