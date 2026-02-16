import type {NextConfig} from 'next'

const nextConfig: NextConfig = {
  env: {
    // Matches the behavior of `sanity dev` which sets styled-components to use the fastest way of inserting CSS rules in both dev and production. It's default behavior is to disable it in dev mode.
    SC_DISABLE_SPEEDY: 'false',
  },
  // Treat paapi5-nodejs-sdk as external to avoid bundling issues (works with both webpack and Turbopack)
  serverExternalPackages: ['paapi5-nodejs-sdk'],
  images: {
    remotePatterns: [
      // Sanity CDN for CMS images
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        pathname: '/**',
      },
      // Amazon Product Images CDN - Required for PA API compliance
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: 'images-na.ssl-images-amazon.com',
        pathname: '/images/**',
      },
      // Additional Amazon image domains (varies by region)
      {
        protocol: 'https',
        hostname: 'images-eu.ssl-images-amazon.com',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: 'images-fe.ssl-images-amazon.com',
        pathname: '/images/**',
      },
    ],
  },
}

export default nextConfig
