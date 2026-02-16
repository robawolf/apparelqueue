import {TagIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * Category schema for organizing posts and products
 */

export const category = defineType({
  name: 'category',
  title: 'Category',
  icon: TagIcon,
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Category Name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'name',
        maxLength: 96,
        isUnique: (value, context) => context.defaultIsUnique(value, context),
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta Description',
      type: 'text',
      rows: 3,
      description: 'SEO description for category pages (max 155 characters)',
      validation: (rule) => rule.max(155).warning('Meta description should be under 155 characters for optimal display in search results'),
    }),
    defineField({
      name: 'featuredImage',
      title: 'Featured Image',
      type: 'image',
      description: 'Image used for Open Graph sharing and category hero',
      options: {
        hotspot: true,
      },
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alternative text',
          description: 'Important for SEO and accessibility',
        },
      ],
    }),
    defineField({
      name: 'icon',
      title: 'Icon',
      type: 'image',
      description: 'Optional icon for the category',
      options: {
        hotspot: true,
      },
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: 'Alternative text',
        },
      ],
    }),
    defineField({
      name: 'parentCategory',
      title: 'Parent Category',
      type: 'reference',
      to: [{type: 'category'}],
      description: 'Optional parent category for hierarchical organization',
    }),
    // Discovery fields (only shown for subcategories)
    defineField({
      name: 'searchFocus',
      title: 'Search Focus',
      type: 'string',
      description: 'Search query for product discovery (e.g., "packable travel daypack lightweight")',
      hidden: ({document}) => !document?.parentCategory,
    }),
    defineField({
      name: 'targetProductCount',
      title: 'Target Product Count',
      type: 'number',
      description: 'Desired number of products in this subcategory',
      initialValue: 10,
      validation: (rule) => rule.min(0).max(100),
      hidden: ({document}) => !document?.parentCategory,
    }),
    defineField({
      name: 'discoveryStatus',
      title: 'Discovery Status',
      type: 'string',
      description: 'Controls whether this subcategory is actively targeted for product discovery',
      options: {
        list: [
          {title: 'Active', value: 'active'},
          {title: 'Paused', value: 'paused'},
          {title: 'Completed', value: 'completed'},
        ],
        layout: 'radio',
      },
      initialValue: 'active',
      hidden: ({document}) => !document?.parentCategory,
    }),
    defineField({
      name: 'discoveryPriority',
      title: 'Discovery Priority',
      type: 'number',
      description: 'Calculated priority score (higher = more urgent). Updated by analyze-categories job.',
      readOnly: true,
      hidden: ({document}) => !document?.parentCategory,
    }),
    defineField({
      name: 'lastDiscoveryAt',
      title: 'Last Discovery At',
      type: 'datetime',
      description: 'When this subcategory was last targeted for discovery',
      readOnly: true,
      hidden: ({document}) => !document?.parentCategory,
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'description',
      media: 'icon',
      parentCategoryName: 'parentCategory.name',
      discoveryStatus: 'discoveryStatus',
      discoveryPriority: 'discoveryPriority',
    },
    prepare({title, subtitle, media, parentCategoryName, discoveryStatus, discoveryPriority}) {
      const statusEmoji: Record<string, string> = {
        active: '🟢',
        paused: '⏸️',
        completed: '✅',
      }
      const emoji = discoveryStatus ? statusEmoji[discoveryStatus] || '' : ''
      const priorityStr = discoveryPriority ? ` [P${discoveryPriority}]` : ''

      return {
        title: parentCategoryName ? `${emoji} ${title}${priorityStr}` : title,
        subtitle: parentCategoryName ? `${parentCategoryName} • ${subtitle || ''}` : subtitle,
        media,
      }
    },
  },
})

