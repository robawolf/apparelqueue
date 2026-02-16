import './globals.css'

import {SpeedInsights} from '@vercel/speed-insights/next'
import type {Metadata} from 'next'
import {Inter} from 'next/font/google'
import {draftMode} from 'next/headers'
import {toPlainText} from 'next-sanity'
import {Toaster} from 'sonner'

import DraftModeToast from '@/app/components/DraftModeToast'
import Footer from '@/app/components/Footer'
import Header from '@/app/components/Header'
import {OrganizationSchema, WebSiteSchema} from '@/app/components/StructuredData'
import {ThemeProvider} from '@/app/context/ThemeContext'
import {themeToCustomProperties, customPropertiesToStyleString, generateFontsUrl} from '@/app/lib/theme-utils'
import {getCurrentTheme, validateThemeName} from '@/lib/themes'
import * as demo from '@/lib/sanity/demo'
import {sanityFetch, SanityLive} from '@/lib/sanity/live'
import {settingsQuery, broadCategoriesQuery} from '@/lib/sanity/queries'
import {resolveOpenGraphImage} from '@/lib/sanity/utils'
import {handleError} from './client-utils'
import { Analytics } from "@vercel/analytics/next"

/**
 * Generate metadata for the page.
 * Learn more: https://nextjs.org/docs/app/api-reference/functions/generate-metadata#generatemetadata-function
 */
export async function generateMetadata(): Promise<Metadata> {
  const {data: settings} = await sanityFetch({
    query: settingsQuery,
    // Metadata should never contain stega
    stega: false,
  })
  const title = settings?.title || demo.title
  const description = settings?.description || demo.description

  const ogImage = resolveOpenGraphImage(settings?.ogImage)
  let metadataBase: URL | undefined = undefined
  try {
    metadataBase = settings?.ogImage?.metadataBase
      ? new URL(settings.ogImage.metadataBase)
      : undefined
  } catch {
    // ignore
  }
  const twitterHandle = settings?.twitterHandle
  const googleVerification = settings?.googleVerification

  return {
    metadataBase,
    title: {
      template: `%s | ${title}`,
      default: title,
    },
    description: typeof description === 'string' ? description : toPlainText(description),
    openGraph: {
      images: ogImage ? [ogImage] : [],
    },
    twitter: {
      card: 'summary_large_image',
      site: twitterHandle ? `@${twitterHandle}` : undefined,
      images: ogImage ? [ogImage] : [],
    },
    verification: googleVerification
      ? {
          google: googleVerification,
        }
      : undefined,
  }
}

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

// Configure revalidation for the layout (3600 seconds = 1 hour)
// Note: In development, Next.js doesn't cache anyway, so this only affects production
export const revalidate = 3600

export default async function RootLayout({children}: {children: React.ReactNode}) {
  const {isEnabled: isDraftMode} = await draftMode()

  // Fetch settings and categories for header
  const [{data: settings}, {data: categories}] = await Promise.all([
    sanityFetch({
      query: settingsQuery,
      stega: false,
    }),
    sanityFetch({
      query: broadCategoriesQuery,
      stega: false,
    }),
  ])

  // Load theme from environment variable (build-time selection)
  // This enables multi-tenant deployments where each deployment uses a different theme
  const theme = getCurrentTheme()
  const customProperties = themeToCustomProperties(theme)
  const customStyleString = customPropertiesToStyleString(customProperties)
  const fontsUrl = generateFontsUrl(theme)

  // Build site URL for structured data
  const siteUrl = settings?.url || ''
  const siteName = settings?.title || demo.title
  const siteDescriptionRaw = settings?.description
    ? typeof settings.description === 'string'
      ? settings.description
      : toPlainText(settings.description)
    : demo.description
  const siteDescription = typeof siteDescriptionRaw === 'string' ? siteDescriptionRaw : ''

  // Extract social URLs from settings.social array
  const socialUrls = (settings?.social || [])
    .filter((s) => s?.url)
    .map((s) => s.url as string)

  return (
    <html lang="en" className={`${inter.variable} bg-white text-black`}>
      <head>
        {fontsUrl && (
          <link
            href={fontsUrl}
            rel="stylesheet"
          />
        )}
        {customStyleString && (
          <style
            dangerouslySetInnerHTML={{
              __html: `:root { ${customStyleString} }`
            }}
          />
        )}
        {siteUrl && (
          <>
            <OrganizationSchema
              name={siteName}
              url={siteUrl}
              description={siteDescription}
              sameAs={socialUrls}
            />
            <WebSiteSchema
              name={siteName}
              url={siteUrl}
              description={siteDescription}
            />
          </>
        )}
      </head>
      <body>
        <ThemeProvider theme={theme || null}>
          <section className="min-h-screen pt-24">
            {/* The <Toaster> component is responsible for rendering toast notifications used in /app/client-utils.ts and /app/components/DraftModeToast.tsx */}
            <Toaster />
            {isDraftMode && <DraftModeToast />}
            {/* The <SanityLive> component is responsible for making all sanityFetch calls in your application live, so should always be rendered. */}
            <SanityLive onError={handleError} />
            <Header settings={settings} categories={categories} />
            <main className="">{children}</main>
            <Footer />
          </section>
          <SpeedInsights />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
