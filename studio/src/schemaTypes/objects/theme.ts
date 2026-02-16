import { ColorWheelIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

export default defineType({
  name: "theme",
  type: "document",
  title: "Theme Configuration",
  icon: ColorWheelIcon,
  fieldsets: [
    {
      title: "Brand Colors",
      name: "colors",
      options: {
        collapsible: true,
        collapsed: false
      }
    },
    {
      title: "Typography",
      name: "typography",
      options: {
        collapsible: true,
        collapsed: false
      }
    },
    {
      title: "Layout & Spacing",
      name: "layout",
      options: {
        collapsible: true,
        collapsed: false
      }
    },
    {
      title: "Components",
      name: "components",
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
      title: "Theme Name",
      description: "A descriptive name for this theme configuration",
      validation: Rule => Rule.required()
    }),

    defineField({
      name: "slug",
      type: "slug",
      title: "Theme Slug",
      description: "URL-friendly identifier for this theme",
      options: {
        source: "title",
        maxLength: 96
      },
      validation: Rule => Rule.required()
    }),

    // Brand Colors
    defineField({
      name: "primaryColor",
      type: "color",
      title: "Primary Brand Color",
      description: "Main brand color used for buttons, links, and key UI elements",
      fieldset: "colors",
      options: {
        disableAlpha: true
      },
      validation: Rule => Rule.required()
    }),

    defineField({
      name: "secondaryColor",
      type: "color", 
      title: "Secondary Color",
      description: "Supporting color for accents and secondary actions",
      fieldset: "colors",
      options: {
        disableAlpha: true
      }
    }),

    defineField({
      name: "accentColor",
      type: "color",
      title: "Accent Color", 
      description: "Highlight color for special elements and call-to-actions",
      fieldset: "colors",
      options: {
        disableAlpha: true
      }
    }),

    defineField({
      name: "neutralColor",
      type: "color",
      title: "Neutral Base Color",
      description: "Base neutral color for text and backgrounds",
      fieldset: "colors",
      options: {
        disableAlpha: true
      }
    }),

    // Typography
    defineField({
      name: "headingFont",
      type: "string",
      title: "Heading Font Family",
      description: "Font used for headings and titles",
      fieldset: "typography",
      options: {
        list: [
          { title: "Inter (Sans-serif)", value: "Inter" },
          { title: "Lora (Serif)", value: "Lora" },
          { title: "Roboto (Sans-serif)", value: "Roboto" },
          { title: "Playfair Display (Serif)", value: "Playfair Display" },
          { title: "Montserrat (Sans-serif)", value: "Montserrat" },
          { title: "Merriweather (Serif)", value: "Merriweather" }
        ],
        layout: "radio"
      },
      initialValue: "Inter"
    }),

    defineField({
      name: "bodyFont",
      type: "string", 
      title: "Body Font Family",
      description: "Font used for body text and general content",
      fieldset: "typography",
      options: {
        list: [
          { title: "Inter (Sans-serif)", value: "Inter" },
          { title: "Lora (Serif)", value: "Lora" },
          { title: "Roboto (Sans-serif)", value: "Roboto" },
          { title: "Source Sans Pro", value: "Source Sans Pro" },
          { title: "Open Sans", value: "Open Sans" },
          { title: "Nunito Sans", value: "Nunito Sans" }
        ],
        layout: "radio"
      },
      initialValue: "Inter"
    }),

    defineField({
      name: "fontSize",
      type: "object",
      title: "Font Size Configuration",
      fieldset: "typography",
      fields: [
        {
          name: "base",
          type: "string",
          title: "Base Font Size",
          options: {
            list: [
              { title: "14px (Small)", value: "14px" },
              { title: "16px (Default)", value: "16px" },
              { title: "18px (Large)", value: "18px" }
            ]
          },
          initialValue: "16px"
        },
        {
          name: "scale",
          type: "number",
          title: "Type Scale Ratio",
          description: "Ratio for scaling font sizes (1.125 = minor third, 1.25 = major third)",
          validation: Rule => Rule.min(1.1).max(1.5),
          initialValue: 1.25
        }
      ]
    }),

    // Layout & Spacing
    defineField({
      name: "borderRadius",
      type: "string",
      title: "Border Radius Style",
      description: "Roundness of corners for buttons, cards, and other elements",
      fieldset: "layout",
      options: {
        list: [
          { title: "None (Sharp corners)", value: "none" },
          { title: "Small (2px)", value: "sm" },
          { title: "Medium (6px)", value: "md" },
          { title: "Large (12px)", value: "lg" },
          { title: "Extra Large (24px)", value: "xl" },
          { title: "Full (Pill shape)", value: "full" }
        ],
        layout: "radio"
      },
      initialValue: "md"
    }),

    defineField({
      name: "spacing",
      type: "object",
      title: "Spacing Configuration",
      fieldset: "layout",
      fields: [
        {
          name: "containerWidth",
          type: "string",
          title: "Container Max Width",
          options: {
            list: [
              { title: "1024px (Compact)", value: "1024px" },
              { title: "1200px (Standard)", value: "1200px" },
              { title: "1400px (Wide)", value: "1400px" },
              { title: "1600px (Extra Wide)", value: "1600px" }
            ]
          },
          initialValue: "1200px"
        },
        {
          name: "sectionSpacing",
          type: "string", 
          title: "Section Spacing",
          options: {
            list: [
              { title: "Compact (1.5rem)", value: "1.5rem" },
              { title: "Standard (2rem)", value: "2rem" },
              { title: "Spacious (3rem)", value: "3rem" },
              { title: "Extra Spacious (4rem)", value: "4rem" }
            ]
          },
          initialValue: "2rem"
        }
      ]
    }),

    // Components
    defineField({
      name: "buttonStyle",
      type: "string",
      title: "Button Style",
      description: "Default styling for buttons throughout the site",
      fieldset: "components",
      options: {
        list: [
          { title: "Rounded (Standard corners)", value: "rounded" },
          { title: "Square (Sharp corners)", value: "square" },
          { title: "Pill (Fully rounded)", value: "pill" }
        ],
        layout: "radio"
      },
      initialValue: "rounded"
    }),

    defineField({
      name: "cardStyle",
      type: "string",
      title: "Card Style",
      description: "Default styling for cards and content blocks",
      fieldset: "components", 
      options: {
        list: [
          { title: "Flat (No shadow)", value: "flat" },
          { title: "Shadow (Drop shadow)", value: "shadow" },
          { title: "Border (Border outline)", value: "border" },
          { title: "Elevated (Strong shadow)", value: "elevated" }
        ],
        layout: "radio"
      },
      initialValue: "shadow"
    }),

    defineField({
      name: "navbarStyle",
      type: "string",
      title: "Navigation Style",
      description: "Style configuration for the main navigation",
      fieldset: "components",
      options: {
        list: [
          { title: "Transparent", value: "transparent" },
          { title: "Solid Background", value: "solid" },
          { title: "Blur Background", value: "blur" }
        ],
        layout: "radio"
      },
      initialValue: "solid"
    }),

    // Metadata
    defineField({
      name: "description",
      type: "text",
      title: "Theme Description",
      description: "Internal description of this theme configuration",
      rows: 3
    })
  ],

  preview: {
    select: {
      title: "title",
      primaryColor: "primaryColor.hex",
      headingFont: "headingFont",
      buttonStyle: "buttonStyle"
    },
    prepare({ title, primaryColor, headingFont, buttonStyle }) {
      return {
        title: title,
        subtitle: `${primaryColor || "No primary color"} • ${headingFont} • ${buttonStyle}`,
        media: ColorWheelIcon
      };
    }
  }
});