import type {SeedData} from './types'

export const data: SeedData = {
  brandConfig: {
    name: 'Chisme Wear',
    verbiageTheme: 'Spanglish figures of speech, bilingual wordplay, dichos mexicanos',
    verbiagePromptContext:
      "Generate phrases that blend English and Spanish naturally, the way bilingual Latinos actually talk. Think kitchen wisdom from abuela, workplace code-switching, family dynamics, dating culture. The humor should be culturally specific — someone who grew up in the culture should feel seen. Avoid stereotypes, tokenism, or phrases that only work if you explain them.",
    toneGuidelines:
      "Culturally authentic, funny, relatable to bilingual audiences, all-ages appropriate. Never mean-spirited. The vibe is 'sending this to my prima in the group chat' not 'edgy comedy special'.",
    graphicThemes: [
      'retro loteria',
      'bold street art',
      'minimalist line art',
      'comic book/cartoon',
      'watercolor botanical',
      'neon sign',
    ],
    defaultApparelTypes: ['t-shirt', 'hoodie', 'tank-top'],
    defaultMarkupPercent: 50,
    ideaBatchSize: 5,
  },

  categories: [
    {
      name: 'Kitchen Sayings',
      slug: 'kitchen-sayings',
      promptContext:
        'Dichos de cocina — phrases about cooking, the kitchen as family gathering place, abuela\'s recipes, kitchen tools with personality. The kitchen is the heart of the Latino home.',
    },
    {
      name: 'Family Dynamics',
      slug: 'family-dynamics',
      promptContext:
        'La familia — phrases about family roles, tías who gossip, primos you grew up with, the family group chat, Sunday gatherings, being the favorite (or not).',
    },
    {
      name: 'Work Life',
      slug: 'work-life',
      promptContext:
        "El jale — phrases about code-switching at work, being bilingual in corporate settings, hustle culture, 'chambear' mentality, navigating two cultures in professional spaces.",
    },
    {
      name: 'Love & Dating',
      slug: 'love-dating',
      promptContext:
        "El amor — phrases about dating, love, heartbreak, telenovela-level drama, situationships, 'ya ni llorar es bueno', love advice from tías.",
    },
    {
      name: 'Money Talk',
      slug: 'money-talk',
      promptContext:
        "La feria — phrases about money, saving, spending, the hustle, 'el que no tranza no avanza' (but keep it clean), financial wisdom passed down generationally.",
    },
    {
      name: 'Party & Social',
      slug: 'party-social',
      promptContext:
        "La fiesta — phrases about parties, going out, carne asadas, quinceañeras, being the life of the party, the friend who always says 'one more song', weekend plans.",
    },
    {
      name: 'Comebacks & Shade',
      slug: 'comebacks-shade',
      promptContext:
        "El shade — witty comebacks, playful shade, the art of the clap-back Latino style, phrases your tía would say under her breath, 'no te hagas'. Funny, not cruel.",
    },
    {
      name: 'Food & Cooking',
      slug: 'food-cooking',
      promptContext:
        "La comida — phrases about food beyond the kitchen: street food, taco stands, food as love language, 'ya comiste?', the way Latinos express care through feeding people.",
    },
    {
      name: 'Motivation',
      slug: 'motivation',
      promptContext:
        "Echale ganas — motivational phrases rooted in Latino culture, immigrant resilience, 'sí se puede', working hard for family, the grind with heart, generational progress.",
    },
  ],

  buckets: [
    // Phrase buckets
    {
      stage: 'phrase',
      name: 'Flowers & Nature',
      prompt:
        "Incorporate floral imagery, garden metaphors, nature-related dichos. Think: roses with thorns as metaphors for love, cactus resilience, marigolds (cempasúchil) and their cultural significance, herbs from abuela's garden (ruda, manzanilla). The natural world as metaphor for life lessons.",
    },
    {
      stage: 'phrase',
      name: 'Humanized Objects',
      prompt:
        'Give personality to inanimate objects — anthropomorphize kitchen items (the comal that\'s seen too much, the chancla with its own reputation), household tools, food items with attitudes. Think loteria cards where objects have human traits and stories.',
    },
    {
      stage: 'phrase',
      name: 'Code-Switching',
      prompt:
        "Heavy on Spanglish code-switching — phrases that naturally blend English and Spanish mid-sentence the way bilingual people actually talk. Not translated phrases, but genuinely hybrid expressions. 'Literally me when...' + Spanish punchline energy.",
    },
    {
      stage: 'phrase',
      name: 'Dichos Clásicos',
      prompt:
        "Classic Mexican/Latino dichos and proverbs, but with a modern twist or visual reinterpretation. Take traditional wisdom ('el que madruga...', 'camarón que se duerme...') and give it fresh context or visual humor. Respect the original meaning while making it wearable.",
    },
    {
      stage: 'phrase',
      name: 'Telenovela Drama',
      prompt:
        "Over-the-top telenovela energy — dramatic phrases, betrayal, passion, 'que me haces si me matas' vibes. The melodrama of everyday situations elevated to soap opera level. Think: dramatic zoom on finding the last tamale gone.",
    },
    {
      stage: 'phrase',
      name: 'Abuela Wisdom',
      prompt:
        "Phrases your abuela would say — kitchen wisdom, life advice given while cooking, remedios, 'when I was your age', the unconditional love mixed with savage honesty that only abuelas deliver.",
    },

    // Design buckets
    {
      stage: 'design',
      name: 'Retro Loteria',
      prompt:
        'Classic loteria card aesthetic — bold black outlines, warm earthy palette (terracotta, gold, sage green), vintage hand-drawn typography, card-frame border. Each design should feel like a collectible loteria card with the phrase as the card name.',
    },
    {
      stage: 'design',
      name: 'Bold Street Art',
      prompt:
        "Urban street art style — graffiti-inspired lettering, vibrant neon and saturated colors, spray paint textures, stencil effects. Think murals you'd see in a Latino neighborhood. High energy, high contrast.",
    },
    {
      stage: 'design',
      name: 'Minimalist Line Art',
      prompt:
        'Clean single-weight continuous line drawings, minimal color (1-2 accent colors max), lots of white space, modern and sophisticated. The design should be simple enough to work at small print sizes. Think: one clever illustration that captures the whole phrase.',
    },
    {
      stage: 'design',
      name: 'Comic Book Pop',
      prompt:
        'Comic book / cartoon style — bold outlines, halftone dots, speech bubbles, action lines, bright primary colors. Characters should be expressive and fun. Think: a single panel that tells the whole joke.',
    },
    {
      stage: 'design',
      name: 'Watercolor Botanical',
      prompt:
        'Soft watercolor botanical illustrations — flowers, herbs, plants from Latin American gardens. Delicate washes of color, organic shapes, hand-lettered typography that feels warm and personal. Feminine but not exclusively — think unisex garden vibes.',
    },

    // Product buckets
    {
      stage: 'product',
      name: 'T-Shirts',
      prompt:
        'Focus on unisex and women\'s t-shirt variants — standard crew neck and women\'s relaxed fit. Include size range S-3XL. Suggest both light (white, heather grey) and dark (black, navy) base colors. Front center print placement, standard dimensions.',
    },
    {
      stage: 'product',
      name: 'Hoodies & Pullovers',
      prompt:
        'Focus on hoodie and pullover variants — unisex pullover hoodie and crewneck sweatshirt. Dark/neutral base colors preferred (black, navy, dark heather). Front print only, sized for the larger canvas. Include size range S-3XL.',
    },
    {
      stage: 'product',
      name: 'Tank Tops & Summer',
      prompt:
        'Focus on tank tops and lighter apparel for warm weather — unisex tanks, women\'s racerback tanks. Light and bright base colors (white, heather grey, light pink). Smaller print area — designs should work at reduced dimensions.',
    },
    {
      stage: 'product',
      name: 'Accessories',
      prompt:
        'Focus on non-apparel products — tote bags, mugs, stickers, phone cases. Smaller or differently-shaped print areas. Designs should be simple and high-contrast enough to work on varied surfaces. Consider which phrases/designs translate well to non-wearable formats.',
    },

    // Listing buckets
    {
      stage: 'listing',
      name: 'SEO Heavy',
      prompt:
        'Prioritize keyword density and search discoverability. Include bilingual search terms (both English and Spanish keywords). Optimize title for Google/Amazon/Etsy search. Front-load the most searchable terms. Tags should cover: apparel type, cultural keywords, occasion, gift-giving terms, bilingual/Spanglish identifiers.',
    },
    {
      stage: 'listing',
      name: 'Storytelling',
      prompt:
        "Lead with the cultural story behind the phrase — where it comes from, why it resonates, the feeling of recognition when a bilingual person reads it. Connect emotionally before describing the product. Make the reader feel like they're part of an inside joke. Longer descriptions are fine — this is about connection, not conversion.",
    },
    {
      stage: 'listing',
      name: 'Gift-Focused',
      prompt:
        "Frame the product as a gift — perfect for birthdays, holidays, Mother's Day, graduations, 'just because'. Emphasize the reaction the recipient will have. Include gift occasion tags. Title should hint at giftability: 'Funny Gift for...', 'Perfect for Your...'.",
    },
  ],
}
