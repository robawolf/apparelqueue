import {ImageIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * ProductImage schema for embedding product images within post content.
 * Images are fetched from Amazon PA API at render time (not stored) for compliance.
 */
export const productImage = defineType({
  name: 'productImage',
  title: 'Product Image',
  type: 'object',
  icon: ImageIcon,
  fields: [
    defineField({
      name: 'product',
      title: 'Product',
      type: 'reference',
      to: [{type: 'product'}],
      validation: (rule) => rule.required(),
      description: 'Select the product whose image will be displayed from Amazon PA API',
    }),
    defineField({
      name: 'size',
      title: 'Image Size',
      type: 'string',
      options: {
        list: [
          {title: 'Small (160px)', value: 'small'},
          {title: 'Medium (300px)', value: 'medium'},
          {title: 'Large (500px)', value: 'large'},
        ],
        layout: 'radio',
      },
      initialValue: 'medium',
    }),
    defineField({
      name: 'alignment',
      title: 'Alignment',
      type: 'string',
      options: {
        list: [
          {title: 'Left', value: 'left'},
          {title: 'Center', value: 'center'},
          {title: 'Right', value: 'right'},
        ],
        layout: 'radio',
      },
      initialValue: 'center',
    }),
    defineField({
      name: 'showLink',
      title: 'Link to Amazon',
      type: 'boolean',
      description: 'Wrap image in affiliate link to Amazon product page',
      initialValue: true,
    }),
    defineField({
      name: 'variantIndex',
      title: 'Image Variant',
      type: 'number',
      description: '0 = primary image, 1+ = variant images from PA API',
      initialValue: 0,
    }),
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'string',
      description: 'Optional caption below the image',
    }),
    defineField({
      name: 'altText',
      title: 'Alt Text Override',
      type: 'string',
      description: 'Optional - defaults to product name',
    }),
  ],
  preview: {
    select: {
      productName: 'product.name',
      productAsin: 'product.asin',
      size: 'size',
    },
    prepare({productName, productAsin, size}) {
      return {
        title: productName || 'No product selected',
        subtitle: `Product Image (${size || 'medium'}) - ASIN: ${productAsin || 'N/A'}`,
        media: ImageIcon,
      }
    },
  },
})
