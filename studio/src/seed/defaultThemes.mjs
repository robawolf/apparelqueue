/**
 * Default theme configurations for seeding Sanity
 * These themes provide good starting points for different use cases
 */

export const defaultThemes = [
    {
      _type: "theme",
      _id: "theme-minimal",
      title: "Minimal Theme",
      slug: { current: "minimal", _type: "slug" },
      description: "Clean, minimal design with subtle colors and sharp edges.",
      
      // Brand Colors - Muted palette
      primaryColor: { hex: "#1F2937", _type: "color" }, // Gray-800
      secondaryColor: { hex: "#9CA3AF", _type: "color" }, // Gray-400
      accentColor: { hex: "#047857", _type: "color" }, // Emerald-700
      neutralColor: { hex: "#6B7280", _type: "color" }, // Gray-500
      
      // Typography
      headingFont: "Inter",
      bodyFont: "Inter",
      fontSize: {
        base: "16px",
        scale: 1.2
      },
      
      // Layout & Spacing
      borderRadius: "none", // Sharp corners
      spacing: {
        containerWidth: "1024px", // Narrower
        sectionSpacing: "2.5rem" // Comfortable
      },
      
      // Components
      buttonStyle: "square",
      cardStyle: "border",
      navbarStyle: "transparent",
      
    },
  
    {
      _type: "theme",
      _id: "theme-warm",
      title: "Warm & Cozy Theme",
      slug: { current: "warm", _type: "slug" },
      description: "Warm colors with serif typography for a welcoming, editorial feel.",
      
      // Brand Colors - Warm palette
      primaryColor: { hex: "#92400E", _type: "color" }, // Amber-800
      secondaryColor: { hex: "#C2410C", _type: "color" }, // Orange-700
      accentColor: { hex: "#BE123C", _type: "color" }, // Rose-700
      neutralColor: { hex: "#78350F", _type: "color" }, // Amber-900
      
      // Typography
      headingFont: "Lora",
      bodyFont: "Lora",
      fontSize: {
        base: "18px", // Larger base
        scale: 1.3
      },
      
      // Layout & Spacing
      borderRadius: "lg",
      spacing: {
        containerWidth: "1200px",
        sectionSpacing: "3rem" // More spacious
      },
      
      // Components
      buttonStyle: "rounded",
      cardStyle: "elevated",
      navbarStyle: "blur",
      
    },
  
    {
      _type: "theme",
      _id: "theme-tech",
      title: "Tech Startup Theme",
      slug: { current: "tech", _type: "slug" },
      description: "Modern tech aesthetic with bold colors and pill-shaped elements.",
      
      // Brand Colors - Tech palette
      primaryColor: { hex: "#7C3AED", _type: "color" }, // Violet-600
      secondaryColor: { hex: "#0891B2", _type: "color" }, // Cyan-600
      accentColor: { hex: "#EC4899", _type: "color" }, // Pink-500
      neutralColor: { hex: "#1E293B", _type: "color" }, // Slate-800
      
      // Typography
      headingFont: "Montserrat",
      bodyFont: "Inter",
      fontSize: {
        base: "16px",
        scale: 1.25
      },
      
      // Layout & Spacing
      borderRadius: "xl",
      spacing: {
        containerWidth: "1400px", // Wider
        sectionSpacing: "4rem" // Extra spacious
      },
      
      // Components
      buttonStyle: "pill",
      cardStyle: "elevated",
      navbarStyle: "blur",
      
    },
  
    {
      _type: "theme",
      _id: "theme-elegant",
      title: "Elegant Magazine Theme",
      slug: { current: "elegant", _type: "slug" },
      description: "Sophisticated design inspired by high-end magazines and editorial layouts.",
      
      // Brand Colors - Elegant palette
      primaryColor: { hex: "#0F172A", _type: "color" }, // Slate-900
      secondaryColor: { hex: "#64748B", _type: "color" }, // Slate-500
      accentColor: { hex: "#B91C1C", _type: "color" }, // Red-700
      neutralColor: { hex: "#334155", _type: "color" }, // Slate-700
      
      // Typography
      headingFont: "Playfair Display",
      bodyFont: "Source Sans Pro",
      fontSize: {
        base: "17px",
        scale: 1.35 // Dramatic scale
      },
      
      // Layout & Spacing
      borderRadius: "sm",
      spacing: {
        containerWidth: "1200px",
        sectionSpacing: "3rem"
      },
      
      // Components
      buttonStyle: "rounded",
      cardStyle: "flat",
      navbarStyle: "solid"
    },
  
    {
      _type: "theme",
      _id: "theme-nature",
      title: "Nature & Outdoors Theme",
      slug: { current: "nature", _type: "slug" },
      description: "Earth-inspired colors perfect for outdoor, travel, or environmental content.",
      
      // Brand Colors - Nature palette
      primaryColor: { hex: "#047857", _type: "color" }, // Emerald-700
      secondaryColor: { hex: "#0E7490", _type: "color" }, // Cyan-700
      accentColor: { hex: "#B45309", _type: "color" }, // Amber-700
      neutralColor: { hex: "#166534", _type: "color" }, // Green-800
      
      // Typography
      headingFont: "Merriweather",
      bodyFont: "Open Sans",
      fontSize: {
        base: "16px",
        scale: 1.25
      },
      
      // Layout & Spacing
      borderRadius: "lg",
      spacing: {
        containerWidth: "1200px",
        sectionSpacing: "2.5rem"
      },
      
      // Components
      buttonStyle: "rounded",
      cardStyle: "shadow",
      navbarStyle: "solid",
      
    }
  ];
  
  // Individual theme exports for selective seeding
  export const defaultTheme = defaultThemes[0];
  export const minimalTheme = defaultThemes[1];
  export const warmTheme = defaultThemes[2];
  export const techTheme = defaultThemes[3];
  export const elegantTheme = defaultThemes[4];
  export const natureTheme = defaultThemes[5];