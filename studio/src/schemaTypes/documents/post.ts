import {DocumentTextIcon} from '@sanity/icons'
import {format, parseISO} from 'date-fns'
import {defineField, defineType} from 'sanity'

/**
 * Post schema.  Define and edit the fields for the 'post' content type.
 * Learn more: https://www.sanity.io/docs/schema-types
 */

export const post = defineType({
  name: 'post',
  title: 'Post',
  icon: DocumentTextIcon,
  type: 'document',
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'seo', title: 'SEO'},
    {name: 'product', title: 'Product'},
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      description: 'A slug is required for the post to show up in the preview',
      options: {
        source: 'title',
        maxLength: 96,
        isUnique: (value, context) => context.defaultIsUnique(value, context),
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'blockContent',
      group: 'content',
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      group: 'content',
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover Image',
      type: 'image',
      group: 'content',
      description: 'Optional for product reviews and comparisons - will use product image from Amazon if not provided',
      options: {
        hotspot: true,
        aiAssist: {
          imageDescriptionField: 'alt',
        },
      },
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alternative text',
          description: 'Important for SEO and accessibility.',
          validation: (rule) => {
            // Custom validation to ensure alt text is provided if the image is present. https://www.sanity.io/docs/validation
            return rule.custom((alt, context) => {
              if ((context.document?.coverImage as any)?.asset?._ref && !alt) {
                return 'Required'
              }
              return true
            })
          },
        },
      ],
      validation: (rule) =>
        rule.custom((value, context: any) => {
          // Only required for general posts - product posts can use PA API images
          if (context.parent?.postType === 'general' && !value) {
            return 'Cover image is required for general posts'
          }
          return true
        }),
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'datetime',
      group: 'content',
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      group: 'content',
      to: [{type: 'person'}],
    }),
    defineField({
      name: 'postType',
      title: 'Post Type',
      type: 'string',
      group: 'product',
      description: 'Type of blog post',
      options: {
        list: [
          {title: 'General', value: 'general'},
          {title: 'Product Review', value: 'productReview'},
          {title: 'Comparison', value: 'comparison'},
        ],
        layout: 'radio',
      },
      initialValue: 'general',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'product',
      title: 'Product (for Product Reviews)',
      type: 'reference',
      group: 'product',
      to: [{type: 'product'}],
      hidden: ({parent}) => parent?.postType !== 'productReview',
      description: 'The product being reviewed',
    }),
    defineField({
      name: 'products',
      title: 'Products (for Comparisons)',
      type: 'array',
      group: 'product',
      of: [{type: 'reference', to: [{type: 'product'}]}],
      hidden: ({parent}) => parent?.postType !== 'comparison',
      description: 'Products being compared (typically 2-3 products)',
      validation: (rule) =>
        rule.custom((value, context: any) => {
          if (context.parent?.postType === 'comparison' && (!value || value.length < 2)) {
            return 'Comparison posts require at least 2 products'
          }
          return true
        }),
    }),
    defineField({
      name: 'scrapes',
      title: 'Research Scrapes',
      type: 'array',
      group: 'product',
      of: [{type: 'reference', to: [{type: 'scrape'}]}],
      description: 'Scrapes used as research material when writing or updating this post. Scrapes provide product insights but are not displayed on the frontend.',
      options: {
        sortable: true,
      },
    }),
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      group: 'content',
      description: 'Show this post prominently on the homepage',
      initialValue: false,
    }),
    defineField({
      name: 'affiliateDisclosure',
      title: 'Affiliate Disclosure',
      type: 'text',
      group: 'product',
      rows: 2,
      description: 'Custom disclosure text (optional, falls back to settings default)',
    }),
    defineField({
      name: 'callToAction',
      title: 'Call to Action',
      type: 'object',
      group: 'product',
      fields: [
        {
          name: 'text',
          type: 'string',
          title: 'CTA Button Text',
          description: 'Custom button text (optional, falls back to settings default)',
        },
        {
          name: 'link',
          type: 'url',
          title: 'CTA Link URL',
          description: 'Optional custom link (defaults to product affiliate URL for reviews)',
        },
      ],
    }),
    // SEO Fields
    defineField({
      name: 'metaTitle',
      title: 'Meta Title',
      type: 'string',
      group: 'seo',
      description: 'Override the post title for search engine results (max 60 characters)',
      validation: (rule) => rule.max(60).warning('Meta title should be under 60 characters for optimal display in search results'),
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta Description',
      type: 'text',
      group: 'seo',
      rows: 3,
      description: 'Description shown in search engine results (max 155 characters)',
      validation: (rule) => rule.max(155).warning('Meta description should be under 155 characters for optimal display in search results'),
    }),
    defineField({
      name: 'focusKeyword',
      title: 'Focus Keyword',
      type: 'string',
      group: 'seo',
      description: 'Primary keyword this post should rank for',
    }),
    defineField({
      name: 'relatedKeywords',
      title: 'Related Keywords',
      type: 'array',
      group: 'seo',
      of: [{type: 'string'}],
      description: 'Secondary keywords and phrases (typically AI-generated)',
      options: {
        layout: 'tags',
      },
    }),
    defineField({
      name: 'noIndex',
      title: 'Hide from Search Engines',
      type: 'boolean',
      group: 'seo',
      description: 'Prevent this post from being indexed by search engines',
      initialValue: false,
    }),
  ],
  // List preview configuration. https://www.sanity.io/docs/previews-list-views
  preview: {
    select: {
      title: 'title',
      postType: 'postType',
      authorFirstName: 'author.firstName',
      authorLastName: 'author.lastName',
      date: 'date',
      media: 'coverImage',
    },
    prepare({title, postType, media, authorFirstName, authorLastName, date}) {
      const typeLabel = postType === 'productReview' ? 'Review' : postType === 'comparison' ? 'Comparison' : 'Post'
      const subtitles = [
        typeLabel,
        authorFirstName && authorLastName && `by ${authorFirstName} ${authorLastName}`,
        date && `on ${format(parseISO(date), 'LLL d, yyyy')}`,
      ].filter(Boolean)

      return {title, media, subtitle: subtitles.join(' • ')}
    },
  },
})
