import { defineField, defineType } from "sanity";

export default defineType({
  name: "color",
  type: "object",
  title: "Color",
  fields: [
    defineField({
      name: "hex",
      type: "string",
      title: "Hex Value",
      description: "Color in hexadecimal format (e.g., #FF5733)",
      validation: Rule =>
        Rule.required()
          .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
            name: "hex",
            invert: false
          })
          .error("Please enter a valid hex color (e.g., #FF5733 or #F73)")
    }),
    defineField({
      name: "alpha",
      type: "number",
      title: "Alpha (Opacity)",
      description: "Optional opacity value between 0 and 1",
      validation: Rule => Rule.min(0).max(1),
      initialValue: 1
    })
  ],
  preview: {
    select: {
      hex: "hex",
      alpha: "alpha"
    },
    prepare({ hex, alpha }) {
      return {
        title: hex || "No color",
        subtitle: alpha !== undefined && alpha !== 1 ? `Opacity: ${alpha}` : undefined
      };
    }
  }
});