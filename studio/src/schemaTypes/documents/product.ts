import {PackageIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * Product schema - lightweight procurement queue
 *
 * Products represent items we want to write about. They're minimal reference documents
 * used for:
 * - Approval workflow (queue products for scraping)
 * - ASIN identifier for grouping scrapes
 * - Frontend PA API lookups
 *
 * Detailed product data (price, features, images) lives in scrape documents.
 * Editorial content lives in post documents.
 */

export const product = defineType({
  name: 'product',
  title: 'Product',
  icon: PackageIcon,
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Product Name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'asin',
      title: 'Amazon ASIN',
      type: 'string',
      description: 'Amazon Standard Identification Number',
      validation: (rule) => rule.required().length(10),
    }),
    defineField({
      name: 'approvalStatus',
      title: 'Approval Status',
      type: 'string',
      description: 'Approval status for automated scraping workflows',
      options: {
        list: [
          {title: 'Pending Review', value: 'pending'},
          {title: 'Approved for Scraping', value: 'approved'},
          {title: 'Rejected', value: 'rejected'},
          {title: 'Paused', value: 'paused'},
        ],
        layout: 'radio',
      },
      initialValue: 'pending',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'brand',
      title: 'Brand',
      type: 'string',
    }),
    defineField({
      name: 'discoveryImage',
      title: 'Discovery Image',
      type: 'string',
      description: 'Image URL from product discovery (admin use only, not for public display)',
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{type: 'category'}],
    }),
    defineField({
      name: 'affiliateUrl',
      title: 'Affiliate URL',
      type: 'url',
      description: 'Amazon product URL with affiliate tracking. Typically https://amazon.com/dp/{ASIN}?tag=your-tag',
      validation: (rule) => rule.uri({
        scheme: ['http', 'https'],
      }),
    }),
    defineField({
      name: 'paApiPrimaryImageUrl',
      title: 'PA API Primary Image URL',
      type: 'string',
      description: 'Cached Amazon PA API primary image URL (auto-refreshed every 12-20 hours)',
      readOnly: true,
    }),
    defineField({
      name: 'paApiVariantImageUrls',
      title: 'PA API Variant Image URLs',
      type: 'array',
      of: [{type: 'string'}],
      description: 'Cached Amazon PA API variant image URLs (auto-refreshed every 12-20 hours)',
      readOnly: true,
    }),
    defineField({
      name: 'paApiImageUpdatedAt',
      title: 'PA API Image Updated At',
      type: 'datetime',
      description: 'When the PA API image URLs were last refreshed',
      readOnly: true,
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'brand',
      asin: 'asin',
      status: 'approvalStatus',
    },
    prepare({title, subtitle, asin, status}: {title: string; subtitle?: string; asin: string; status: string}) {
      const statusEmoji: Record<string, string> = {
        pending: '⏳',
        approved: '✅',
        rejected: '❌',
        paused: '⏸️',
      }
      const emoji = statusEmoji[status] || '❓'

      return {
        title,
        subtitle: subtitle ? `${subtitle} • ${asin} ${emoji}` : `${asin} ${emoji}`,
      }
    },
  },
})

