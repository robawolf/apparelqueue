import {CogIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

import * as demo from '../../lib/initialValues'

export const settings = defineType({
  name: "settings",
  type: "document",
  title: "Settings",
  icon: CogIcon,
  fieldsets: [
    {
      title: "SEO & metadata",
      name: "metadata",
      options: {
        collapsible: true,
        collapsed: false
      }
    },
    {
      title: "SEO Keywords",
      name: "keywords"
    },
    {
      title: "Social Media",
      name: "social"
    },
    {
      title: "Website Logo",
      name: "logos",
      options: {
        collapsible: true,
        collapsed: false
      }
    },
    {
      title: "Theme Configuration",
      name: "theme",
      options: {
        collapsible: true,
        collapsed: false
      }
    },
    {
      title: "Affiliate Settings",
      name: "affiliate",
      options: {
        collapsible: true,
        collapsed: false
      }
    }
  ],
  fields: [
    defineField({
      name: "title",
      type: "string",
      title: "Site title"
    }),
    defineField({
      title: "URL",
      name: "url",
      type: "url",
      description: "The main site url. Used to create canonical url"
    }),
    defineField({
      name: "copyright",
      type: "string",
      title: "Copyright Name",
      description: "Enter company name to appear in footer after ©"
    }),
    defineField({
      title: "Main logo",
      description: "Upload your main logo here. SVG preferred. ",
      name: "logo",
      type: "image",
      fieldset: "logos",
      fields: [
        {
          name: "alt",
          type: "string",
          title: "Alternative text",
          description: "Important for SEO and accessiblity."
        }
      ]
    }),

    defineField({
      title: "Alternate logo (optional)",
      description:
        "Upload alternate logo here. it can be light / dark variation ",
      name: "logoalt",
      type: "image",
      fieldset: "logos",
      fields: [
        {
          name: "alt",
          type: "string",
          title: "Alternative text",
          description: "Important for SEO and accessiblity."
        }
      ]
    }),

    defineField({
      name: "email",
      type: "string",
      title: "Support Email",
      validation: Rule =>
        Rule.regex(
          /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/,
          {
            name: "email", // Error message is "Does not match email-pattern"
            invert: false // Boolean to allow any value that does NOT match pattern
          }
        )
    }),

    defineField({
      name: "phone",
      type: "string",
      title: "Support Phone"
    }),

    defineField({
      name: "w3ckey",
      type: "string",
      title: "Web3Forms Access Key",
      description:
        "Enter Access key obtained from web3forms.com. It is required to make the form work."
    }),

    defineField({
      name: "social",
      type: "array",
      title: "Social Links",
      description: "Enter your Social Media URLs",
      validation: Rule => Rule.unique(),
      of: [
        {
          type: "object",
          fields: [
            {
              type: "string",
              name: "media",
              title: "Choose Social Media",
              options: {
                list: [
                  { title: "Twitter", value: "twitter" },
                  { title: "Facebook", value: "facebook" },
                  { title: "Instagram", value: "instagram" },
                  { title: "Linkedin", value: "linkedin" },
                  { title: "Youtube", value: "youtube" }
                ]
              }
            },
            {
              type: "url",
              name: "url",
              title: "Full Profile URL"
            }
          ],
          preview: {
            select: {
              title: "media",
              subtitle: "url"
            }
          }
        }
      ]
    }),

    defineField({
      title: "Meta Description",
      name: "description",
      fieldset: "metadata",
      type: "text",
      rows: 5,
      validation: Rule => Rule.min(20).max(200),
      description: "Enter SEO Meta Description"
    }),

    defineField({
      name: "ogImage",
      type: "image",
      title: "Open Graph Image",
      description:
        "Image for sharing previews on Facebook, Twitter etc.",
      fieldset: "metadata",
      fields: [
        {
          name: "metadataBase",
          type: "url",
          title: "Metadata Base URL",
          description: "Base URL for resolving relative URLs in metadata"
        }
      ]
    }),

    defineField({
      name: "twitterHandle",
      type: "string",
      title: "Twitter/X Handle",
      description: "Your Twitter/X handle without @ (e.g., 'yoursite')",
      fieldset: "metadata",
      validation: Rule => Rule.custom((value) => {
        if (value && value.startsWith('@')) {
          return 'Enter handle without @ symbol'
        }
        return true
      })
    }),

    defineField({
      name: "googleVerification",
      type: "string",
      title: "Google Search Console Verification",
      description: "Meta tag content value for Google Search Console verification",
      fieldset: "metadata"
    }),

    defineField({
      name: "siteKeywords",
      type: "array",
      title: "Default Site Keywords",
      description: "Default keywords used when page-specific keywords are not set",
      fieldset: "keywords",
      of: [{type: "string"}],
      options: {
        layout: "tags"
      }
    }),

    defineField({
      name: "activeTheme",
      type: "reference",
      title: "Active Theme",
      description: "Select the theme configuration to use for this site",
      fieldset: "theme",
      to: [{ type: "theme" }],
      options: {
        filter: 'defined(title)'
      }
    }),
    defineField({
      name: "affiliateDisclosure",
      type: "text",
      title: "Default Affiliate Disclosure",
      description: "Default disclosure text shown on affiliate links (Amazon Associates TOS compliant)",
      fieldset: "affiliate",
      rows: 3,
      initialValue: "As an Amazon Associate I earn from qualifying purchases."
    }),
    defineField({
      name: "amazonAssociateTag",
      type: "string",
      title: "Amazon Associate Tag",
      description: "Default Amazon Associate tracking tag (e.g., 'yourstore-20')",
      fieldset: "affiliate"
    }),
    defineField({
      name: "ctaButtonText",
      type: "string",
      title: "Default CTA Button Text",
      description: "Default text for affiliate link buttons",
      fieldset: "affiliate",
      initialValue: "Check Price on Amazon"
    }),
    defineField({
      name: "showPriceRange",
      type: "boolean",
      title: "Show Price Range",
      description: "Display price ranges on product cards (use with caution - prices change frequently)",
      fieldset: "affiliate",
      initialValue: false
    }),
    defineField({
      name: "trustBadges",
      type: "array",
      title: "Trust Badges",
      description: "Trust elements to display (e.g., security badges, guarantees)",
      fieldset: "affiliate",
      of: [
        {
          type: "object",
          fields: [
            {
              name: "label",
              type: "string",
              title: "Badge Label",
              validation: Rule => Rule.required()
            },
            {
              name: "icon",
              type: "image",
              title: "Badge Icon",
              options: {
                hotspot: true
              }
            },
            {
              name: "description",
              type: "text",
              title: "Description",
              rows: 2
            }
          ],
          preview: {
            select: {
              title: "label",
              subtitle: "description",
              media: "icon"
            }
          }
        }
      ]
    })
  ]
});







