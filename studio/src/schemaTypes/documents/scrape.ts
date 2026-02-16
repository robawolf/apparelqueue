import {ClipboardIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * Scrape schema for storing product data from external sources
 * Used to keep product information up to date with the latest scraped data
 */

export const scrape = defineType({
  name: 'scrape',
  title: 'Scrape',
  icon: ClipboardIcon,
  type: 'document',
  fields: [
    defineField({
      name: 'product',
      title: 'Product',
      type: 'reference',
      to: [{type: 'product'}],
      description: 'The product this scrape data is for',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'scrapedAt',
      title: 'Scraped At',
      type: 'datetime',
      description: 'When this data was scraped',
      initialValue: () => new Date().toISOString(),
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'source',
      title: 'Source',
      type: 'string',
      description: 'Where the data was scraped from (e.g., "Amazon", "Product Website")',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Product Title (at time of scrape)',
      type: 'string',
      description: 'Product title from the scrape (for historical reference)',
    }),
    defineField({
      name: 'brand',
      title: 'Brand',
      type: 'string',
      description: 'Brand name from scrape data',
    }),
    defineField({
      name: 'images',
      title: 'Product Images',
      type: 'array',
      of: [{type: 'string'}],
      description: 'Image URLs scraped from the product page',
    }),
    defineField({
      name: 'bestSellerBadge',
      title: 'Best Seller Badge',
      type: 'boolean',
      description: 'Whether product had best seller badge at time of scrape',
    }),
    defineField({
      name: 'price',
      title: 'Price',
      type: 'object',
      fields: [
        {
          name: 'amount',
          type: 'number',
          title: 'Amount',
        },
        {
          name: 'currency',
          type: 'string',
          title: 'Currency',
          initialValue: 'USD',
          options: {
            list: [
              {title: 'USD', value: 'USD'},
              {title: 'EUR', value: 'EUR'},
              {title: 'GBP', value: 'GBP'},
            ],
          },
        },
      ],
    }),
    defineField({
      name: 'availability',
      title: 'Availability',
      type: 'string',
      description: 'Product availability status',
      options: {
        list: [
          {title: 'In Stock', value: 'inStock'},
          {title: 'Out of Stock', value: 'outOfStock'},
          {title: 'Backorder', value: 'backorder'},
          {title: 'Discontinued', value: 'discontinued'},
        ],
      },
    }),
    defineField({
      name: 'delivery',
      title: 'Delivery Information',
      type: 'object',
      fields: [
        {
          name: 'type',
          type: 'string',
          title: 'Delivery Type',
          description: 'e.g., "FREE delivery", "Prime delivery"',
        },
        {
          name: 'date',
          type: 'string',
          title: 'Estimated Delivery Date',
        },
        {
          name: 'cost',
          type: 'number',
          title: 'Delivery Cost',
        },
      ],
    }),
    defineField({
      name: 'seller',
      title: 'Seller Information',
      type: 'object',
      fields: [
        {
          name: 'name',
          type: 'string',
          title: 'Seller Name',
        },
        {
          name: 'isAmazonFulfilled',
          type: 'boolean',
          title: 'Amazon Fulfilled',
          description: 'Whether fulfilled by Amazon (FBA)',
        },
        {
          name: 'sellerId',
          type: 'string',
          title: 'Seller ID',
        },
      ],
    }),
    defineField({
      name: 'deal',
      title: 'Deal Information',
      type: 'object',
      fields: [
        {
          name: 'hasDeal',
          type: 'boolean',
          title: 'Has Active Deal',
        },
        {
          name: 'dealType',
          type: 'string',
          title: 'Deal Type',
          description: 'e.g., "Lightning Deal", "Deal of the Day"',
        },
        {
          name: 'discountPercentage',
          type: 'number',
          title: 'Discount Percentage',
        },
        {
          name: 'dealEndDate',
          type: 'datetime',
          title: 'Deal End Date',
        },
        {
          name: 'couponCode',
          type: 'string',
          title: 'Coupon Code',
        },
      ],
    }),
    defineField({
      name: 'rating',
      title: 'Rating',
      type: 'object',
      fields: [
        {
          name: 'average',
          type: 'number',
          title: 'Average Rating',
          description: 'Average rating out of 5',
          validation: (rule) => rule.min(0).max(5),
        },
        {
          name: 'count',
          type: 'number',
          title: 'Review Count',
          description: 'Number of reviews',
        },
      ],
    }),
    defineField({
      name: 'features',
      title: 'Features',
      type: 'array',
      of: [{type: 'string'}],
      description: 'Key features scraped from the product page',
    }),
    defineField({
      name: 'specifications',
      title: 'Specifications',
      type: 'object',
      fields: [
        {
          name: 'items',
          type: 'array',
          of: [
            {
              type: 'object',
              fields: [
                {name: 'label', type: 'string', title: 'Label'},
                {name: 'value', type: 'string', title: 'Value'},
              ],
            },
          ],
        },
      ],
    }),
    defineField({
      name: 'rawData',
      title: 'Raw Scraped Data',
      type: 'text',
      rows: 10,
      description: 'Raw JSON or text data from the scrape (for debugging/reference)',
    }),
    defineField({
      name: 'notes',
      title: 'Notes',
      type: 'text',
      rows: 3,
      description: 'Any notes about this scrape',
    }),
  ],
  preview: {
    select: {
      productName: 'product.name',
      scrapedAt: 'scrapedAt',
      source: 'source',
      price: 'price.amount',
      currency: 'price.currency',
    },
    prepare({productName, scrapedAt, source, price, currency}) {
      const date = scrapedAt ? new Date(scrapedAt).toLocaleDateString() : 'No date'
      const priceStr = price ? `${currency || 'USD'} ${price}` : 'No price'
      return {
        title: `${productName || 'Unknown Product'} - ${date}`,
        subtitle: `${source || 'Unknown source'} • ${priceStr}`,
      }
    },
  },
})
