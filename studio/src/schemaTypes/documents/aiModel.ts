import {RobotIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * AI Model schema - configurable AI models for content generation
 *
 * Authors can select their preferred AI model for generating content.
 * Models are referenced by their OpenRouter model ID.
 */
export const aiModel = defineType({
  name: 'aiModel',
  title: 'AI Model',
  icon: RobotIcon,
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Display Name',
      type: 'string',
      description: 'Friendly name for the model (e.g., "Claude 3.5 Sonnet")',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'modelId',
      title: 'Model ID',
      type: 'string',
      description: 'OpenRouter model ID (e.g., "anthropic/claude-3.5-sonnet")',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      description: "Brief description of the model's writing style or capabilities",
    }),
    defineField({
      name: 'isDefault',
      title: 'Default Model',
      type: 'boolean',
      description: 'Use this model when no author preference is set',
      initialValue: false,
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'modelId',
      isDefault: 'isDefault',
    },
    prepare({title, subtitle, isDefault}) {
      return {
        title: isDefault ? `${title} (Default)` : title,
        subtitle,
      }
    },
  },
})
