import type {NextConfig} from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // fal.ai generated images
      {
        protocol: 'https',
        hostname: 'fal.media',
      },
      {
        protocol: 'https',
        hostname: 'v3.fal.media',
      },
      // Canva CDN for mockup images
      {
        protocol: 'https',
        hostname: '*.canva.com',
      },
      // Printful mockups
      {
        protocol: 'https',
        hostname: 'files.cdn.printful.com',
      },
    ],
  },
}

export default nextConfig
