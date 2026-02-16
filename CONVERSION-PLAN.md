# Codebase Conversion Plan — Multi-Stage Product Idea Queue

This document outlines a delegatable, agent-optimized plan for converting the existing Sanity CMS + blog monorepo into a brand-agnostic, multi-stage product idea approval queue.

---

## Conversion Summary

| Aspect | Current (Remove) | Target (Build) |
|--------|-------------------|-----------------|
| **Repo structure** | `/frontend` + `/studio` (Sanity) | `/frontend` (queue) + `/storefront` (headless Shopify) |
| **CMS** | Sanity Studio workspace | PostgreSQL + Prisma |
| **Auth** | Sanity draft mode + shared secret | BetterAuth (email/password, sessions, middleware) |
| **Content** | Blog posts, editorial | Multi-stage product idea pipeline |
| **Products** | Amazon ASINs + scrapes | AI ideas → Canva designs → Printful products → Shopify |
| **External APIs** | Amazon PA API, ScrapingBee, Brave Search | OpenRouter, fal.ai, Canva, Printful, Shopify Admin + Storefront APIs |
| **Public site** | Blog with categories, posts | Headless Next.js Shopify storefront (`/storefront`) |
| **Inngest jobs** | Discovery → Scrape → Post → Enhance | Generate → Design → Configure → List → Publish |
| **AI usage** | Content generation + ranking | OpenRouter (text inference) + fal.ai (image gen) + Canva (print-ready design) |
| **Approval flow** | Single status field | 5-stage pipeline (Phrase → Design → Product → Listing → Publish) |
| **Brand support** | Single-purpose blog | Single-tenant, brand-agnostic (deploy per brand) |

---

## Important: Context-Specific Values

**Everything in this plan that references specific environment variables, API keys, model IDs, domain names, store IDs, template IDs, etc. is illustrative — not final.** During implementation, agents must treat these as placeholders that will be filled in by the project owner:

- **Environment variable names** — use sensible names but the owner will supply actual values
- **API endpoints and SDK versions** — verify against current docs at implementation time
- **AI model IDs** — code should read from config/env, not hardcode
- **Domain names** — real values provided by owner
- **Canva template IDs, Printful catalog IDs, Shopify collection IDs** — all runtime configuration
- **Seed data** (category names, prompt contexts, apparel types) — starting points; the owner will curate
- **Database connection strings** — obviously environment-specific

**The rule:** If a value would change between local dev, staging, production, or brand deployments, it goes in `.env` or the `BrandConfig` / `Category` / `Bucket` database tables — never hardcoded. Agents should write code that reads from configuration, and `.env.example` should document every required variable with a descriptive placeholder.

---

## Phase 0: Project Scaffolding

> **Goal:** Replace studio workspace with storefront, clean up frontend workspace, set up Prisma and BetterAuth.
> **Dependencies:** None — do this first.
> **Parallelizable:** Tasks 0.1-0.5 can run in parallel after 0.0.

### Task 0.0 — Create a new branch
```
Agent: Bash
Action: git checkout -b multi-stage-queue-conversion
```

### Task 0.1 — Replace Studio workspace with Storefront
```
Agent: Bash + Write
Action:
  - Delete /studio/ contents (Sanity Studio code)
  - Scaffold /storefront/ as a new Next.js 15 headless Shopify storefront
  - Reference template: Vercel's "commerce" template or similar
  - Update /package.json: Change workspaces from ["studio", "frontend"] to ["storefront", "frontend"]
  - Update root scripts: replace dev:studio with dev:storefront, etc.
  - The storefront workspace is a SEPARATE concern from the queue — it reads from
    Shopify Storefront API. It does NOT share a database with /frontend.

Note: The storefront is scaffolded here but fleshed out in Phase 7.
The queue (/frontend) is the priority for this conversion.
```

### Task 0.2 — Clean up frontend workspace dependencies
```
Agent: Bash + Edit
Action:
  - Keep /frontend as a workspace (do NOT flatten to root)
  - Remove sanity-related dependencies from frontend/package.json:
    - next-sanity, @sanity/client, @sanity/image-url, @sanity/icons,
      sanity, sanity-plugin-*, @sanity/assist, @sanity/vision
  - Add new dependencies:
    - prisma, @prisma/client
    - better-auth
    - @fal-ai/client (AI image generation)
    - @shopify/shopify-api (for Admin API in queue)
```

### Task 0.3 — Initialize Prisma (in /frontend)
```
Agent: Bash + Write
Action:
  - npx prisma init (inside /frontend)
  - Write frontend/prisma/schema.prisma (see Task 1.1 for full schema)
  - Write frontend/lib/db.ts (Prisma client singleton)
  - Add DATABASE_URL to .env.example
```

### Task 0.4 — Write Prisma schema (see Phase 1, Task 1.1 for full schema)
```
Agent: Write
File: frontend/prisma/schema.prisma
Note: Schema must include BetterAuth tables (user, session, account, verification)
      alongside the queue tables (brandConfig, idea, category).
```

### Task 0.5 — Set up BetterAuth
```
Agent: Write
Files:
  - frontend/lib/auth.ts — BetterAuth server instance
    - Configure Prisma adapter (uses same DATABASE_URL)
    - Email/password provider
    - Session strategy with secure cookies
    - BETTER_AUTH_SECRET and BETTER_AUTH_URL from env
  - frontend/lib/auth-client.ts — BetterAuth client for React
    - Export useSession, signIn, signOut hooks
  - frontend/app/api/auth/[...all]/route.ts — BetterAuth catch-all route handler
  - frontend/middleware.ts — Protect /admin/* and /api/admin/* routes
    - Check for valid session
    - Redirect unauthenticated users to /admin/login
    - Allow /api/auth/* and /api/inngest/* through
  - Update frontend/app/admin/login/page.tsx — Replace secret-based form with
    email/password login using BetterAuth signIn()
  - Delete frontend/app/api/admin/auth/route.ts — No longer needed
  - Update frontend/app/admin/(dashboard)/layout.tsx — Remove draftMode() check
    (middleware now handles auth; layout just renders AdminLayoutClient)
```

---

## Phase 1: Database & Data Layer

> **Goal:** Define the full data model with BrandConfig singleton, Idea (5-stage), and Category.
> **Dependencies:** Phase 0 complete.
> **Parallelizable:** Tasks 1.1-1.3 fully parallel.

### Task 1.1 — Write Prisma schema file
```
Agent: Write
File: frontend/prisma/schema.prisma

// ─── BetterAuth tables (required by Prisma adapter) ───

model User {
  id            String    @id
  name          String
  email         String    @unique
  emailVerified Boolean   @default(false)
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  sessions      Session[]
  accounts      Account[]
}

model Session {
  id        String   @id
  expiresAt DateTime
  token     String   @unique
  ipAddress String?
  userAgent String?
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Account {
  id                    String  @id
  accountId             String
  providerId            String
  userId                String
  user                  User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

model Verification {
  id         String   @id
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

// ─── Brand configuration (singleton — one record per deployment) ───

model BrandConfig {
  id                    String   @id @default("default")
  name                  String   // e.g., "Chisme Wear"

  // Verbiage config
  verbiageTheme         String?  @db.Text // e.g., "Spanglish figures of speech, bilingual wordplay"
  verbiagePromptContext String?  @db.Text // Detailed AI prompt context for phrase generation
  toneGuidelines        String?  @db.Text // Brand voice guidelines

  // Graphic config
  graphicThemes         String?  @db.Text // JSON array: ["retro loteria", "bold street art", ...]
  canvaTemplateIds      String?  @db.Text // JSON map: { "t-shirt": "tmpl_xxx", "hoodie": "tmpl_yyy" }

  // Product config
  defaultApparelTypes   String   @default("[\"t-shirt\",\"hoodie\",\"tank-top\"]") @db.Text // JSON array
  defaultMarkupPercent  Int      @default(50) // Default retail markup over Printful cost

  // AI config
  aiModelPreference     String?  // Default OpenRouter model
  ideaBatchSize         Int      @default(5) // Ideas to generate per run

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

// ─── Buckets (persistent creative directives per pipeline stage) ───

model Bucket {
  id        String   @id @default(uuid())
  stage     String   // phrase, design, product, listing
  name      String   // Display name: "Flowers", "Retro Loteria", "Hoodies", "SEO Heavy"
  prompt    String   @db.Text // AI directive injected into system instruction
  isActive  Boolean  @default(true)
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Reverse relations — ideas generated under this bucket at each stage
  phraseIdeas  Idea[] @relation("PhraseBucket")
  designIdeas  Idea[] @relation("DesignBucket")
  productIdeas Idea[] @relation("ProductBucket")
  listingIdeas Idea[] @relation("ListingBucket")

  @@index([stage, isActive])
}

// ─── Multi-stage idea pipeline ───

model Idea {
  id                  String   @id @default(uuid())

  // Pipeline state
  stage               String   @default("phrase")
  // Stage values: phrase, design, product, listing, publish
  status              String   @default("pending")
  // Status values: pending, approved, rejected, refining, processing

  // Bucket assignments — which bucket directed generation at each stage
  phraseBucketId      String?
  phraseBucket        Bucket?  @relation("PhraseBucket", fields: [phraseBucketId], references: [id])
  designBucketId      String?
  designBucket        Bucket?  @relation("DesignBucket", fields: [designBucketId], references: [id])
  productBucketId     String?
  productBucket       Bucket?  @relation("ProductBucket", fields: [productBucketId], references: [id])
  listingBucketId     String?
  listingBucket       Bucket?  @relation("ListingBucket", fields: [listingBucketId], references: [id])

  // Revision tracking — prepend-only history of one-off admin guidance across all stages
  revisionHistory     String?  @db.Text // JSON: [{ stage, type, notes, timestamp }]
  // type: 'forward' (guidance before generation), 'revision' (feedback after output)
  // Bucket prompts are read live from Bucket record, not stored here
  // New entries are prepended; AI always sees full chain when regenerating

  // Stage 1 — Phrase (AI-generated, admin-editable)
  phrase              String
  phraseExplanation   String?  @db.Text
  graphicDescription  String?  @db.Text
  graphicStyle        String?  // Selected from BrandConfig graphicThemes
  aiModel             String?
  aiPrompt            String?  @db.Text

  // Stage 2 — Design (Canva integration)
  mockupImageUrl      String?
  canvaDesignId       String?
  designFileUrl       String?  // Exported print-ready file (high-res PNG)

  // Stage 3 — Product (Printful configuration)
  apparelType         String?  // t-shirt, hoodie, tank-top, hat, tote-bag
  printfulCatalogId   Int?     // Printful product catalog ID
  variants            String?  @db.Text // JSON: [{ printfulVariantId, size, color, colorHex, retailPrice }]
  printPlacements     String?  @db.Text // JSON: [{ placement, designFileUrl, width, height, top, left }]
  colorScheme         String?

  // Stage 4 — Listing (Shopify product metadata)
  productTitle        String?
  productDescription  String?  @db.Text
  productTags         String?  @db.Text // JSON array of Shopify tags
  shopifyCollectionId String?

  // Stage 5 — Fulfillment (post-publish tracking)
  printfulProductId   String?
  printfulExternalId  String?
  shopifyProductId    String?
  shopifyProductUrl   String?
  publishedAt         DateTime?

  // Relations
  category            Category? @relation(fields: [categoryId], references: [id])
  categoryId          String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@index([stage, status])
  @@index([categoryId])
  @@index([phraseBucketId])
  @@index([designBucketId])
  @@index([productBucketId])
  @@index([listingBucketId])
}

model Category {
  id            String   @id @default(uuid())
  name          String
  slug          String   @unique
  description   String?  @db.Text
  promptContext String?  @db.Text
  targetCount   Int      @default(10)
  isActive      Boolean  @default(true)
  ideas         Idea[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### Task 1.2 — Create database client singleton
```
Agent: Write
File: frontend/lib/db.ts

Standard Prisma singleton pattern for Next.js:
- Global prisma instance in development (prevent hot-reload connections)
- Direct instantiation in production
```

### Task 1.3 — Create brand seed system
```
Agent: Write

The seed system is a thin runner that imports a brand-specific data file.
Each brand gets its own seed file with brand config, categories, and buckets.
The runner is brand-agnostic; all brand-specific content lives in the data files.

File: frontend/prisma/seed.ts (runner)
  - Reads BRAND_SEED env var (defaults to "chismewear") to select which brand data file to load
  - Dynamically imports from prisma/seeds/{brandName}.ts
  - Upserts BrandConfig singleton (id="default") from brand data
  - Upserts categories from brand data (matched by slug to allow re-seeding)
  - Upserts buckets from brand data (matched by stage+name to allow re-seeding)
  - Creates default admin user (email/password from ADMIN_EMAIL + ADMIN_PASSWORD env vars)
  - Safe to re-run: uses upsert everywhere, never deletes existing data

File: frontend/prisma/seeds/chismewear.ts (first brand)
  - Exports: { brandConfig, categories, buckets }
  - Type-safe with a shared SeedData interface

  brandConfig:
    name: "Chisme Wear"
    verbiageTheme: "Spanglish figures of speech, bilingual wordplay, dichos mexicanos"
    verbiagePromptContext: "Generate phrases that blend English and Spanish naturally,
      the way bilingual Latinos actually talk. Think kitchen wisdom from abuela,
      workplace code-switching, family dynamics, dating culture. The humor should
      be culturally specific — someone who grew up in the culture should feel seen.
      Avoid stereotypes, tokenism, or phrases that only work if you explain them."
    toneGuidelines: "Culturally authentic, funny, relatable to bilingual audiences,
      all-ages appropriate. Never mean-spirited. The vibe is 'sending this to my
      prima in the group chat' not 'edgy comedy special'."
    graphicThemes: ["retro loteria", "bold street art", "minimalist line art",
                    "comic book/cartoon", "watercolor botanical", "neon sign"]
    defaultApparelTypes: ["t-shirt", "hoodie", "tank-top"]
    defaultMarkupPercent: 50
    ideaBatchSize: 5

  categories:
    - name: "Kitchen Sayings", slug: "kitchen-sayings"
      promptContext: "Dichos de cocina — phrases about cooking, the kitchen as family
        gathering place, abuela's recipes, kitchen tools with personality. The kitchen
        is the heart of the Latino home."
    - name: "Family Dynamics", slug: "family-dynamics"
      promptContext: "La familia — phrases about family roles, tías who gossip,
        primos you grew up with, the family group chat, Sunday gatherings,
        being the favorite (or not)."
    - name: "Work Life", slug: "work-life"
      promptContext: "El jale — phrases about code-switching at work, being bilingual
        in corporate settings, hustle culture, 'chambear' mentality, navigating
        two cultures in professional spaces."
    - name: "Love & Dating", slug: "love-dating"
      promptContext: "El amor — phrases about dating, love, heartbreak, telenovela-level
        drama, situationships, 'ya ni llorar es bueno', love advice from tías."
    - name: "Money Talk", slug: "money-talk"
      promptContext: "La feria — phrases about money, saving, spending, the hustle,
        'el que no tranza no avanza' (but keep it clean), financial wisdom
        passed down generationally."
    - name: "Party & Social", slug: "party-social"
      promptContext: "La fiesta — phrases about parties, going out, carne asadas,
        quinceañeras, being the life of the party, the friend who always says
        'one more song', weekend plans."
    - name: "Comebacks & Shade", slug: "comebacks-shade"
      promptContext: "El shade — witty comebacks, playful shade, the art of the
        clap-back Latino style, phrases your tía would say under her breath,
        'no te hagas'. Funny, not cruel."
    - name: "Food & Cooking", slug: "food-cooking"
      promptContext: "La comida — phrases about food beyond the kitchen: street food,
        taco stands, food as love language, 'ya comiste?', the way Latinos
        express care through feeding people."
    - name: "Motivation", slug: "motivation"
      promptContext: "Echale ganas — motivational phrases rooted in Latino culture,
        immigrant resilience, 'sí se puede', working hard for family, the grind
        with heart, generational progress."

  buckets:
    Phrase buckets (stage: "phrase"):
    - name: "Flowers & Nature"
      prompt: "Incorporate floral imagery, garden metaphors, nature-related dichos.
        Think: roses with thorns as metaphors for love, cactus resilience,
        marigolds (cempasúchil) and their cultural significance, herbs from
        abuela's garden (ruda, manzanilla). The natural world as metaphor
        for life lessons."
    - name: "Humanized Objects"
      prompt: "Give personality to inanimate objects — anthropomorphize kitchen
        items (the comal that's seen too much, the chancla with its own
        reputation), household tools, food items with attitudes. Think loteria
        cards where objects have human traits and stories."
    - name: "Code-Switching"
      prompt: "Heavy on Spanglish code-switching — phrases that naturally blend
        English and Spanish mid-sentence the way bilingual people actually talk.
        Not translated phrases, but genuinely hybrid expressions. 'Literally
        me when...' + Spanish punchline energy."
    - name: "Dichos Clásicos"
      prompt: "Classic Mexican/Latino dichos and proverbs, but with a modern twist
        or visual reinterpretation. Take traditional wisdom ('el que madruga...',
        'camarón que se duerme...') and give it fresh context or visual humor.
        Respect the original meaning while making it wearable."
    - name: "Telenovela Drama"
      prompt: "Over-the-top telenovela energy — dramatic phrases, betrayal,
        passion, 'que me haces si me matas' vibes. The melodrama of everyday
        situations elevated to soap opera level. Think: dramatic zoom on
        finding the last tamale gone."
    - name: "Abuela Wisdom"
      prompt: "Phrases your abuela would say — kitchen wisdom, life advice given
        while cooking, remedios, 'when I was your age', the unconditional love
        mixed with savage honesty that only abuelas deliver."

    Design buckets (stage: "design"):
    - name: "Retro Loteria"
      prompt: "Classic loteria card aesthetic — bold black outlines, warm earthy
        palette (terracotta, gold, sage green), vintage hand-drawn typography,
        card-frame border. Each design should feel like a collectible loteria
        card with the phrase as the card name."
    - name: "Bold Street Art"
      prompt: "Urban street art style — graffiti-inspired lettering, vibrant neon
        and saturated colors, spray paint textures, stencil effects. Think
        murals you'd see in a Latino neighborhood. High energy, high contrast."
    - name: "Minimalist Line Art"
      prompt: "Clean single-weight continuous line drawings, minimal color (1-2
        accent colors max), lots of white space, modern and sophisticated.
        The design should be simple enough to work at small print sizes.
        Think: one clever illustration that captures the whole phrase."
    - name: "Comic Book Pop"
      prompt: "Comic book / cartoon style — bold outlines, halftone dots, speech
        bubbles, action lines, bright primary colors. Characters should be
        expressive and fun. Think: a single panel that tells the whole joke."
    - name: "Watercolor Botanical"
      prompt: "Soft watercolor botanical illustrations — flowers, herbs, plants
        from Latin American gardens. Delicate washes of color, organic shapes,
        hand-lettered typography that feels warm and personal. Feminine but
        not exclusively — think unisex garden vibes."

    Product buckets (stage: "product"):
    - name: "T-Shirts"
      prompt: "Focus on unisex and women's t-shirt variants — standard crew neck
        and women's relaxed fit. Include size range S-3XL. Suggest both light
        (white, heather grey) and dark (black, navy) base colors. Front
        center print placement, standard dimensions."
    - name: "Hoodies & Pullovers"
      prompt: "Focus on hoodie and pullover variants — unisex pullover hoodie and
        crewneck sweatshirt. Dark/neutral base colors preferred (black, navy,
        dark heather). Front print only, sized for the larger canvas.
        Include size range S-3XL."
    - name: "Tank Tops & Summer"
      prompt: "Focus on tank tops and lighter apparel for warm weather — unisex
        tanks, women's racerback tanks. Light and bright base colors (white,
        heather grey, light pink). Smaller print area — designs should work
        at reduced dimensions."
    - name: "Accessories"
      prompt: "Focus on non-apparel products — tote bags, mugs, stickers, phone
        cases. Smaller or differently-shaped print areas. Designs should be
        simple and high-contrast enough to work on varied surfaces. Consider
        which phrases/designs translate well to non-wearable formats."

    Listing buckets (stage: "listing"):
    - name: "SEO Heavy"
      prompt: "Prioritize keyword density and search discoverability. Include
        bilingual search terms (both English and Spanish keywords). Optimize
        title for Google/Amazon/Etsy search. Front-load the most searchable
        terms. Tags should cover: apparel type, cultural keywords, occasion,
        gift-giving terms, bilingual/Spanglish identifiers."
    - name: "Storytelling"
      prompt: "Lead with the cultural story behind the phrase — where it comes
        from, why it resonates, the feeling of recognition when a bilingual
        person reads it. Connect emotionally before describing the product.
        Make the reader feel like they're part of an inside joke. Longer
        descriptions are fine — this is about connection, not conversion."
    - name: "Gift-Focused"
      prompt: "Frame the product as a gift — perfect for birthdays, holidays,
        Mother's Day, graduations, 'just because'. Emphasize the reaction
        the recipient will have. Include gift occasion tags. Title should
        hint at giftability: 'Funny Gift for...', 'Perfect for Your...'."

File: frontend/prisma/seeds/types.ts (shared interface)
  - Export SeedData interface:
    {
      brandConfig: { name, verbiageTheme, verbiagePromptContext, toneGuidelines,
                     graphicThemes, defaultApparelTypes, defaultMarkupPercent,
                     canvaTemplateIds?, aiModelPreference?, ideaBatchSize }
      categories: Array<{ name, slug, description?, promptContext, targetCount? }>
      buckets: Array<{ stage, name, prompt }>
    }

To add a new brand:
  1. Create frontend/prisma/seeds/newbrand.ts exporting SeedData
  2. Set BRAND_SEED=newbrand in .env
  3. Run npx prisma db seed
```

---

## Phase 2: Delete Sanity Integration

> **Goal:** Remove all Sanity-specific code.
> **Dependencies:** Phase 0 complete (studio removed).
> **Parallelizable:** All tasks in this phase are independent.

### Task 2.1 — Delete Sanity library files
```
Agent: Bash
Files to delete:
  - lib/sanity/ (entire directory)
  - lib/sanity-write.ts
  - sanity.types.ts
  - sanity-typegen.json
  - sanity.config.ts (if at frontend level)
```

### Task 2.2 — Delete Amazon/Scraping integrations
```
Agent: Bash
Files to delete:
  - lib/amazon-pa-api.ts
  - lib/brave-search.ts
  - lib/scrapingbee.ts
  - paapi5-nodejs-sdk.d.ts
  - app/api/amazon-images/ (entire directory)
  - app/api/draft-mode/ (entire directory)
```

### Task 2.3 — Delete public-facing routes
```
Agent: Bash
Files/dirs to delete:
  - app/(www)/ (entire directory)
  - app/sitemap.ts
  - app/robots.ts
  - All blog/content components (Posts, CoverImage, PortableText, etc.)
  - app/context/ (ThemeContext)
  - lib/themes.ts
  - app/lib/theme-utils.ts
  - lib/validation/post-publish.ts
```

### Task 2.4 — Delete old Inngest functions
```
Agent: Bash
Files to delete:
  - lib/inngest/functions/ (all existing files)
  - lib/inngest/events.ts (will be rewritten)
  - lib/inngest/types.ts (will be rewritten)
Keep:
  - lib/inngest/client.ts (update app ID)
```

### Task 2.5 — Delete old admin API routes that reference Sanity
```
Agent: Bash
Files to delete:
  - app/api/admin/products/ (entire directory)
  - app/api/admin/posts/ (entire directory)
  - app/api/admin/purge-data/ (entire directory)
  - app/api/admin/seed-categories/ (will be rewritten)
Also delete (replaced by BetterAuth):
  - app/api/admin/auth/route.ts
Keep & modify later:
  - app/api/admin/jobs/ (generic Inngest triggering — update job names)
  - app/api/inngest/route.ts (update function imports)
```

---

## Phase 3: New Service Libraries

> **Goal:** Create API clients for Canva, Printful, and Shopify.
> **Dependencies:** Phase 0 complete.
> **Parallelizable:** All tasks can be written in parallel.

### Task 3.1 — Write fal.ai image generation client
```
Agent: Write
File: lib/fal.ts

Setup:
- Import @fal-ai/client
- Configure: fal.config({ credentials: process.env.FAL_KEY })

Functions:
- generateDesignConcepts(prompt, options) — Generate multiple concept art variations
  - Uses fal.subscribe() for async job execution
  - Model: flux or similar image generation model
  - Options: count (number of variations), style, dimensions
  - Returns: array of { imageUrl, seed } for each variation
- generateMockup(designImageUrl, apparelType) — Generate product mockup on apparel
  - Uses fal.subscribe() with image-to-image or compositing model
  - Returns: mockup image URL
- uploadImage(buffer) — Upload image to fal.ai storage
  - Uses fal.storage.upload(blob)
  - Returns: fal storage URL for use in other calls

Uses: FAL_KEY (env)

Pattern reference: /home/rob/code/piecework/nextjs/src/lib/fal/index.js
  - fal.config({ credentials: process.env.FAL_KEY })
  - fal.subscribe("model-name", { input: {...} }) for async jobs
  - fal.storage.upload(blob) for media uploads
```

### Task 3.1a — Write Canva API client
```
Agent: Write
File: lib/canva.ts

Purpose: Template-based design for PRINT-READY files (after admin selects a concept from fal.ai).
Canva is used for finalization, not exploration — fal.ai handles the fast concept iteration.

Functions:
- createDesignFromTemplate(templateId, customizations) — Create design from template
- exportDesign(designId, format) — Export as high-res PNG for print
- getDesignUrl(designId) — Get shareable preview/edit URL
- listTemplates(brandKitId) — List available templates

Uses: CANVA_API_KEY + CANVA_BRAND_KIT_ID (env), BrandConfig.canvaTemplateIds (db)
```

### Task 3.2 — Write Printful API client
```
Agent: Write
File: lib/printful.ts

Catalog & Variants:
- getCatalogProducts() — List printable product types
- getCatalogVariants(catalogId) — Get variants (variantId, size, color, colorHex, cost)
- getProductPrintfiles(catalogId) — Get print area specs (placements, dimensions, DPI)

File Management:
- uploadDesignFile(imageUrl) — Upload print-ready PNG to Printful
- getFileStatus(fileId) — Check processing status

Product Creation:
- createSyncProduct(params) — Create product with variants and print files
  Params: { externalId, title, description, catalogId, variants: [{ variantId, retailPrice, files }] }

Product Status:
- getSyncProduct(printfulProductId) — Get product with sync status
- getShopifyProductId(printfulProductId) — Get Shopify ID after sync

Uses: PRINTFUL_API_KEY + PRINTFUL_STORE_ID (env)
```

### Task 3.3 — Write Shopify Admin API client
```
Agent: Write
File: lib/shopify.ts

Functions:
- updateProductMetadata(shopifyProductId, metadata) — Update tags, collections, SEO
- getProduct(shopifyProductId) — Get product details
- addProductToCollection(productId, collectionId) — Organize products
- listCollections() — List Shopify collections

Uses: SHOPIFY_STORE_DOMAIN + SHOPIFY_ADMIN_API_TOKEN (env)
Note: Printful auto-syncs products. This client is for metadata updates only.
```

### Task 3.4 — Update AI library (OpenRouter — text inference only)
```
Agent: Edit
File: lib/ai.ts

Purpose: OpenRouter handles ALL text inference (phrases, product config, listing copy).
Image generation is handled by fal.ai (see Task 3.1). These are separate concerns.

Changes:
- Keep generateWithOpenRouter() function
- Remove unused functions (generateWithGPT, generateImageWithGemini, etc.)
- Add prompt builders that compose the three-level hierarchy (Brand + Category/Idea + Bucket):
  - generatePhrasePrompt(brandConfig, category, bucket, existingPhrases) — Stage 1
    System: BrandConfig.verbiagePromptContext + toneGuidelines
    Context: Category.promptContext
    Directive: Bucket.prompt (e.g., "incorporate floral imagery")
  - suggestGraphicPrompt(idea, brandConfig, bucket, forwardGuidance?) — Stage 2
    System: BrandConfig.graphicThemes
    Context: idea.graphicDescription + graphicStyle
    Directive: Bucket.prompt (e.g., "retro loteria aesthetic")
  - suggestProductPrompt(idea, brandConfig, bucket, forwardGuidance?) — Stage 3
    System: BrandConfig.defaultApparelTypes + defaultMarkupPercent
    Context: idea design + apparel context
    Directive: Bucket.prompt (e.g., "focus on hoodie variants")
  - generateListingPrompt(idea, brandConfig, bucket, forwardGuidance?) — Stage 4
    System: BrandConfig.toneGuidelines
    Context: idea product + phrase context
    Directive: Bucket.prompt (e.g., "prioritize keyword density")
  - refineIdeaPrompt(idea, revisionHistory, brandConfig, bucket) — Any stage refinement
    Includes full revisionHistory chain + current bucket prompt
- All prompts follow: Brand (system) → Category/Idea (context) → Bucket (directive) → Forward guidance (one-off)
- Bucket prompts are read live from DB (not from revisionHistory) so editing a bucket affects future generations
```

### Task 3.5 — Update Telegram notifications
```
Agent: Edit
File: lib/telegram.ts

Changes:
- Read TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID from env
- Replace blog notification functions with:
  - sendStageNotification(idea, stage) — Idea ready for review at stage
  - sendPublishedNotification(idea) — Product is live on Shopify
- Update message formatting for apparel context
```

---

## Phase 4: New Inngest Functions

> **Goal:** Implement the job pipeline for the 5-stage approval flow with AI curation at every stage.
> **Dependencies:** Phase 1 (database), Phase 3 (service libs).
> **Parallelizable:** Tasks 4.1-4.8 can be written in parallel. Task 4.9-4.10 depend on them.

### Task 4.1 — Write new events.ts
```
Agent: Write
File: lib/inngest/events.ts

Define Events type with:
- Manual triggers: job/generate-ideas (with required bucketId), job/create-design,
  job/refine-idea, job/configure-product, job/configure-listing,
  job/create-printful-product, job/publish-to-shopify, job/analyze-categories
- Chain events: idea.created, design.created, product.configured,
  listing.configured, printful.created, categories.analyzed
- job/generate-ideas includes required `bucketId` string for phrase bucket selection
```

### Task 4.2 — Write generate-ideas function
```
Agent: Write
File: lib/inngest/functions/generate-ideas.ts

AI curates a BATCH of phrase options for admin selection.
Requires a PHRASE BUCKET to direct what kind of ideas are generated.

Steps:
1. Fetch BrandConfig from database (including ideaBatchSize)
2. Fetch the specified phrase Bucket (required — bucket.prompt directs generation)
3. Find category with highest need (targetCount - published count)
   (or use specified categoryId if provided)
4. Fetch existing phrases to avoid duplicates
5. Build AI prompt from three-level hierarchy:
   - Level 1 (Brand): BrandConfig.verbiagePromptContext + .toneGuidelines
   - Level 2 (Category): Category.promptContext
   - Level 3 (Bucket): Bucket.prompt (e.g., "incorporate floral imagery, garden metaphors")
6. Request BrandConfig.ideaBatchSize options (default 5) in a single AI call
7. Parse AI response — each option: phrase, explanation, graphicDescription, graphicStyle, apparelType
8. Save each as a separate Idea with stage='phrase', status='pending', phraseBucketId=bucket.id
9. Send Telegram notification: N new phrases ready for review in bucket "X"
10. Send idea.created events

Concurrency: 1, Retries: 3
Triggered by: job/generate-ideas (manual with bucketId, or cron with priority-based bucket selection)
```

### Task 4.3 — Write create-design function
```
Agent: Write
File: lib/inngest/functions/create-design.ts

Triggered when admin approves an idea at Stage 1 (phrase).
Two-step process: fal.ai generates concept art variations → admin selects → Canva finalizes.
Uses FORWARD GUIDANCE from the approval action to steer output.

Steps:
1. Fetch idea + BrandConfig (including graphicThemes, canvaTemplateIds)
2. Read forward guidance from idea.revisionHistory (most recent type='forward' entry)
3. Set idea: stage='design', status='processing'
4. Fetch the assigned design Bucket (set during phrase approval advance)
5. Build image generation prompt from three-level hierarchy:
   - Level 1 (Brand): BrandConfig.graphicThemes for style direction
   - Level 2 (Idea): idea.graphicDescription + idea.graphicStyle
   - Level 3 (Bucket): Design bucket prompt (e.g., "classic loteria card aesthetic, bold outlines")
   - Plus: Forward guidance if available (one-off additions on top of bucket)
6. Call fal.ai generateDesignConcepts() to create multiple variations (3-4):
   - Fast, cheap concept art for admin to browse
   - Vary across graphic styles, color palettes, compositions
6. Store fal.ai variations as JSON on the idea for admin comparison
   - Primary mockup: idea.mockupImageUrl (first/best variation)
   - All variations accessible in admin UI design card
7. Update idea: status='pending' (admin reviews fal.ai concepts)
8. When admin approves a concept:
   - Call Canva createDesignFromTemplate() with the selected concept as reference
   - Export print-ready high-res PNG → idea.designFileUrl
   - Store idea.canvaDesignId for future editing
9. Send Telegram notification: design variations ready for review
10. Send design.created event

Note: fal.ai handles exploration (cheap, fast, many variations).
Canva handles finalization (brand kit templates, print-ready export).
This prevents wasting Canva bandwidth on concepts the admin will reject.

Concurrency: 1, Retries: 2
Triggered by: job/create-design (from stage 1 approval)
```

### Task 4.4 — Write refine-idea function
```
Agent: Write
File: lib/inngest/functions/refine-idea.ts

Works at any stage — regenerates based on admin feedback.
CRITICAL: New guidance is PREPENDED to revisionHistory, not replacing it.
The AI always sees the full chain of prior guidance when regenerating.

Steps:
1. Fetch idea + BrandConfig
2. Prepend new revision entry to idea.revisionHistory:
   { stage: idea.stage, type: 'revision', notes: adminNotes, timestamp: now() }
3. Set idea: status='processing'
4. Build AI prompt with FULL revisionHistory (newest first) + original context
5. Based on current stage, call appropriate regeneration:
   - Stage 'phrase': Re-run OpenRouter with original + full guidance history
   - Stage 'design': Re-run fal.ai with accumulated design direction (new concept variations)
   - Stage 'product': Re-run OpenRouter for product suggestions with guidance
   - Stage 'listing': Re-run OpenRouter for listing copy with guidance
6. Generate new batch of options (same multi-option pattern as initial generation)
7. Update idea fields with refined output
8. Set status='pending' (re-enters current stage queue for review)

Concurrency: 1, Retries: 2
Triggered by: job/refine-idea (manual from admin)
```

### Task 4.5 — Write configure-product function
```
Agent: Write
File: lib/inngest/functions/configure-product.ts

Triggered when admin approves an idea at Stage 2 (design).
AI curates MULTIPLE product configuration suggestions for admin selection.
Uses FORWARD GUIDANCE from the approval action.

Steps:
1. Fetch idea + BrandConfig
2. Fetch the assigned product Bucket (set during design approval advance)
3. Read forward guidance from idea.revisionHistory (most recent type='forward' entry)
4. Set idea: stage='product', status='processing'
5. Fetch Printful catalog data for BrandConfig.defaultApparelTypes
6. AI generates multiple product configuration suggestions:
   - Use product bucket prompt to narrow product types (e.g., "focus on hoodie variants, dark colors")
   - Use forward guidance if available (additional one-off direction)
   - Color palette suggestions based on design colors
   - Size range recommendations based on category/audience
   - Pricing suggestions (Printful cost × BrandConfig.defaultMarkupPercent)
7. Include full revisionHistory in AI prompt for context
7. Store suggestions for admin review
8. Update idea with AI-recommended defaults, set status='pending'
9. Send product.configured event

Concurrency: 1, Retries: 2
Triggered by: job/configure-product (from stage 2 approval)
```

### Task 4.6 — Write configure-listing function
```
Agent: Write
File: lib/inngest/functions/configure-listing.ts

Triggered when admin approves an idea at Stage 3 (product).
AI generates MULTIPLE listing copy options for admin selection.
Uses FORWARD GUIDANCE from the approval action.

Steps:
1. Fetch idea + BrandConfig
2. Fetch the assigned listing Bucket (set during product approval advance)
3. Read forward guidance from idea.revisionHistory (most recent type='forward' entry)
4. Set idea: stage='listing', status='processing'
5. Include full revisionHistory in prompt for context
6. Call OpenRouter to generate multiple listing options (3-4 variations):
   - Use listing bucket prompt to direct copy style (e.g., "prioritize keyword density, bilingual search terms")
   - Use forward guidance if available (additional one-off direction)
   - productTitle variations (different angles: humor, culture, SEO)
   - productDescription variations (different tone/length)
   - productTags from category + apparel type + BrandConfig themes
6. Store all options for admin comparison
7. Update idea with AI-recommended defaults, set status='pending'
8. Send listing.configured event

Concurrency: 1, Retries: 2
Triggered by: job/configure-listing (from stage 3 approval)
```

### Task 4.7 — Write create-printful-product function
```
Agent: Write
File: lib/inngest/functions/create-printful-product.ts

Triggered when admin approves final publish at Stage 5.
Executes the fully-configured product spec — no guessing.

Steps:
1. Fetch idea — assert all required fields are set:
   - printfulCatalogId, variants JSON, printPlacements JSON, designFileUrl, productTitle
   - Fail with descriptive error if any missing
2. Set idea: status='processing'
3. Export final design from Canva (if not already exported)
4. Upload design file(s) to Printful file library
5. Wait for Printful to process files — poll getFileStatus()
6. Call createSyncProduct() with full spec from idea fields
7. Save printfulProductId and printfulExternalId
8. Send printful.created event → triggers publish-to-shopify

Concurrency: 1, Retries: 2
Triggered by: job/create-printful-product (from stage 5 approval)
```

### Task 4.8 — Write publish-to-shopify function
```
Agent: Write
File: lib/inngest/functions/publish-to-shopify.ts

Steps:
1. Fetch idea with printfulProductId
2. Wait for Printful → Shopify sync (poll getSyncProduct)
3. Get Shopify product ID from sync status
4. Update Shopify product metadata:
   - Tags from idea.productTags
   - Description from idea.productDescription
   - SEO title/description
5. Add to Shopify collection (idea.shopifyCollectionId)
6. Update idea: shopifyProductId, shopifyProductUrl, status='approved', publishedAt
7. Send Telegram notification: product is live

Concurrency: 1, Retries: 3
Triggered by: printful.created event
```

### Task 4.9 — Adapt analyze-categories function
```
Agent: Edit (adapt from existing)
File: lib/inngest/functions/analyze-categories.ts

Changes:
- Replace Sanity queries with Prisma queries
- Count ideas per category per stage (how many published vs target)
- Keep AI suggestion logic but use BrandConfig.verbiagePromptContext
- Emit categories.analyzed event

Cron: Daily at 2 AM
```

### Task 4.10 — Write new functions/index.ts
```
Agent: Write
File: lib/inngest/functions/index.ts

Export array of all new functions:
- generateIdeas, createDesign, refineIdea, configureProduct,
  configureListing, createPrintfulProduct, publishToShopify, analyzeCategories
```

---

## Phase 5: Admin Dashboard Conversion

> **Goal:** Convert admin UI to 5-stage approval queue with guidance prompts.
> **Dependencies:** Phase 1 (database), Phase 4 (jobs).
> **Parallelizable:** Tasks 5.1-5.7 are independent UI components.

### Task 5.1 — Rewrite admin navigation
```
Agent: Edit
Files:
  - app/admin/(dashboard)/AdminNav.tsx
  - app/admin/(dashboard)/AdminLayoutClient.tsx

Changes:
- Navigation items:
  - Stage queues: Phrases, Designs, Products, Listings, Publish
  - Each shows count badge of pending items
  - Management: Buckets, Jobs, Categories, Settings
- Remove old nav items (Products, Draft Posts, Purge Data)
- Brand name from BrandConfig displayed in header
```

### Task 5.2 — Write stage queue pages (5 pages, shared pattern)
```
Agent: Write
Files:
  - app/admin/(dashboard)/phrases/page.tsx — Stage 1 queue
  - app/admin/(dashboard)/designs/page.tsx — Stage 2 queue
  - app/admin/(dashboard)/products/page.tsx — Stage 3 queue
  - app/admin/(dashboard)/listings/page.tsx — Stage 4 queue
  - app/admin/(dashboard)/publish/page.tsx — Stage 5 queue

Each page follows the same pattern:
  - Server component fetches ideas WHERE stage=X
  - Filter tabs: All, Pending, Approved, Rejected, Refining
  - Bucket filter dropdown: filter by bucket for this stage
  - Renders <StageQueue> client component with stage-specific card layout

Shared component:
  - app/components/admin/StageQueue.tsx — Generic queue list with filter tabs,
    bucket filter, pagination, and stage-specific card rendering

IMPORTANT: The Phrases page has a "Generate Ideas" button that requires selecting
a phrase bucket — the bucket's prompt directs what the AI generates.
```

### Task 5.3 — Write stage-specific idea cards
```
Agent: Write
Files:
  - app/components/admin/PhraseCard.tsx — Stage 1 card
    Shows: phrase (large text), explanation, suggested graphic concept, graphic style, phrase bucket badge
    Actions: Approve (→ Design), Reject, Refine
    Approve: select design bucket + optional forward guidance textarea
    Refine opens guidance prompt: "What should AI change?" (prepends to revision history)
    Shows which phrase bucket generated this idea

  - app/components/admin/DesignCard.tsx — Stage 2 card
    Shows: fal.ai concept art variations (grid), selected mockup (large), phrase, graphic style, design bucket badge
    Two-step flow: Select concept from fal.ai variations → Canva finalizes print-ready file
    Actions: Approve (→ Product), Reject, Refine (re-run fal.ai), Edit in Canva (link to finalized design)
    Approve: select product bucket + optional forward guidance textarea
    Shows revision/guidance history for this idea

  - app/components/admin/ProductCard.tsx — Stage 3 card
    Shows: mockup image, AI product suggestions, apparel type, variant summary, pricing, product bucket badge
    Inline editing: VariantPicker, PlacementEditor (see Task 5.4)
    Actions: Approve (→ Listing), Reject, Refine, Back to Design
    Approve: select listing bucket + optional forward guidance textarea

  - app/components/admin/ListingCard.tsx — Stage 4 card
    Shows: AI listing copy options (multiple), product title, description, tags
    Admin can pick from options or edit inline
    Inline editing: title, description (textarea), tags (tag input)
    Actions: Approve (→ Publish), Reject, Refine, Back to Product

  - app/components/admin/PublishCard.tsx — Stage 5 card
    Shows: full summary — phrase, mockup, product config, listing details, pricing
    Shows: bucket assignments at each stage (phrase bucket, design bucket, product bucket, listing bucket)
    Shows: complete revision/guidance history across all stages
    Read-only overview with links to edit at previous stages
    Actions: Publish (triggers Printful + Shopify), Reject, Back to any stage
```

### Task 5.4 — Write product configuration components
```
Agent: Write
Files:
  - app/components/admin/VariantPicker.tsx
    - Fetches available sizes/colors from Printful via /api/admin/printful/variants
    - Grid of color swatches — click to toggle
    - Size checkboxes per selected color
    - Retail price input per variant (pre-filled with markup from BrandConfig)
    - Shows Printful cost vs retail for margin visibility

  - app/components/admin/PlacementEditor.tsx
    - Visual garment outline with placement zones
    - Assign design file to each placement (front, back, sleeve)
    - Set print dimensions with max bounds from Printful specs
    - Preview overlay of design on garment
```

### Task 5.5 — Write Buckets management page
```
Agent: Write
Files:
  - app/admin/(dashboard)/buckets/page.tsx
  - app/components/admin/BucketsSection.tsx

Features:
- Tabbed view by stage: Phrase Buckets, Design Buckets, Product Buckets, Listing Buckets
- Each tab shows buckets for that stage with:
  - Name, prompt (truncated), idea count, active toggle
  - Drag-to-reorder (sortOrder)
- Create new bucket: name, prompt textarea, stage (pre-selected from active tab)
- Edit bucket: inline name + prompt editing
- Delete bucket (only if no ideas reference it, or soft-delete via isActive=false)
- Each bucket shows a "Generate Ideas" button (phrase buckets only) to trigger
  idea generation using that bucket's prompt
```

### Task 5.5a — Write Categories management page
```
Agent: Write
Files:
  - app/admin/(dashboard)/categories/page.tsx
  - app/components/admin/CategoriesSection.tsx

Features:
- List categories with idea counts per stage (phrase/design/product/listed/published)
- Toggle active/inactive
- Edit name, description, promptContext
- Create new category
- "Generate Ideas" button per category with optional guidance textarea
```

### Task 5.6a — Write Settings page (BrandConfig editor)
```
Agent: Write
Files:
  - app/admin/(dashboard)/settings/page.tsx
  - app/components/admin/SettingsForm.tsx

Features:
- Edit BrandConfig singleton:
  - Brand name
  - Verbiage config: theme, prompt context, tone guidelines
  - Graphic config: themes (tag input or JSON editor), Canva template IDs
  - Product config: default apparel types, default markup percentage
  - AI config: model preference, batch size
- Connection status indicators (Canva, Printful, Shopify API health checks)
- Seed categories button
```

### Task 5.7 — Rewrite admin API routes
```
Agent: Write
Files:
  Buckets:
  - app/api/admin/buckets/route.ts — GET list (filter by stage, isActive), POST create
  - app/api/admin/buckets/[id]/route.ts — PATCH update (name, prompt, isActive, sortOrder), DELETE

  Idea management:
  - app/api/admin/ideas/route.ts — GET list (filter by stage, status, bucketId)
  - app/api/admin/ideas/[id]/route.ts — PATCH update fields
  - app/api/admin/ideas/[id]/advance/route.ts — POST approve + advance to next stage
    - Accepts optional `guidance` string (forward guidance) + optional `bucketId` (next-stage bucket)
    - If guidance provided, prepends to revisionHistory as type='forward'
    - If bucketId provided, sets the appropriate bucket FK (designBucketId, productBucketId, or listingBucketId)
    - Validates current stage, sets stage+1 with status='pending'
    - Triggers appropriate Inngest job for the next stage (job reads bucket prompt + guidance from history)
  - app/api/admin/ideas/[id]/reject/route.ts — POST reject at current stage
  - app/api/admin/ideas/[id]/refine/route.ts — POST submit refinement notes
    - Prepends to revisionHistory as type='revision'
    - Triggers refine-idea Inngest job
  - app/api/admin/ideas/[id]/publish/route.ts — POST final publish (stage 5 only)
    - Validates all required fields, triggers create-printful-product job

  Printful proxy:
  - app/api/admin/printful/catalog/route.ts — GET list product types
  - app/api/admin/printful/variants/route.ts — GET ?catalogId=71
  - app/api/admin/printful/printfiles/route.ts — GET ?catalogId=71

  Settings (BrandConfig):
  - app/api/admin/settings/route.ts — GET config, PATCH update

  Categories:
  - app/api/admin/categories/route.ts — GET list, POST create
  - app/api/admin/categories/[id]/route.ts — PATCH update, DELETE

  Jobs:
  - app/api/admin/jobs/route.ts — Update JOBS list with new function names
  - app/api/admin/jobs/[name]/run/route.ts — Update VALID_JOBS
    - job/generate-ideas requires `bucketId` in request body

  Seed:
  - app/api/admin/seed/route.ts — Trigger prisma seed

Note: All /api/admin/* routes protected by BetterAuth middleware.
```

---

## Phase 6: Cleanup & Configuration

> **Goal:** Remove dead code, update configs, prepare for deployment.
> **Dependencies:** All previous phases.
> **Parallelizable:** All tasks independent.

### Task 6.1 — Update root layout
```
Agent: Edit
File: app/layout.tsx

Changes:
- Remove Sanity/theme provider wrapping
- Remove settings fetch from Sanity
- Remove structured data injection
- Simplify to basic admin app layout
- Update metadata: "Product Idea Queue" (brand-agnostic)
```

### Task 6.2 — Update Next.js config
```
Agent: Edit
File: next.config.ts

Changes:
- Remove Amazon CDN image domains
- Add Canva CDN domains for mockup images
- Remove Sanity-related config
- Keep Turbopack
```

### Task 6.3 — Update package.json
```
Agent: Edit
File: frontend/package.json

Changes:
- Update name to "product-idea-queue" (brand-agnostic)
- Remove all sanity-related scripts
- Add prisma scripts (migrate, generate, seed, studio)
- Remove sanity dependencies
- Add prisma, @prisma/client
```

### Task 6.4 — Update Inngest client
```
Agent: Edit
File: lib/inngest/client.ts

Changes:
- Update app ID from 'thingsfor' to 'product-idea-queue'
```

### Task 6.5 — Update Inngest route
```
Agent: Edit
File: app/api/inngest/route.ts

Changes:
- Update functions import to new function list
```

### Task 6.6 — Write .env.example
```
Agent: Write
File: frontend/.env.example

Include all required environment variables with descriptive placeholders.
Group by: Database, Auth, Inngest, AI (OpenRouter + fal.ai), Canva, Printful, Shopify, Telegram.
Note: Brand creative config (verbiage themes, graphic styles, etc.) is in
the BrandConfig database record, not in env vars.
```

### Task 6.7 — Clean up unused files
```
Agent: Bash
Action:
- Remove any remaining Sanity type files
- Remove unused component files
- Run TypeScript type-check to find broken imports
- Fix any remaining import errors
```

---

## Phase 7: Headless Shopify Storefront

> **Goal:** Build the public-facing storefront in `/storefront`.
> **Dependencies:** Phase 0 (workspace scaffolded). Independent of queue phases.
> **Note:** This phase can proceed in parallel with Phases 1-6.

### Task 7.1 — Research and select storefront template
```
Agent: Research
Action:
  - Evaluate headless Shopify + Next.js templates:
    - Vercel Commerce (https://github.com/vercel/commerce)
    - next-shopify-starter (community)
    - Custom from scratch with @shopify/hydrogen-react
  - Select based on: Next.js 15 App Router, Storefront API, ISR/SSG, SEO, Tailwind
```

### Task 7.2 — Scaffold storefront from template
```
Agent: Bash + Edit
File: /storefront/

Action:
  - Initialize from chosen template
  - Configure Shopify Storefront API credentials
  - Set up product listing, product detail, collection, and cart pages
```

### Task 7.3 — Customize storefront for brand
```
Agent: Edit
Files: /storefront/ (various)

Changes:
  - Brand colors, typography, logo (from env vars or config file)
  - Custom homepage with featured collections
  - Product detail pages optimized for apparel (size guide, color swatches)
  - SEO: structured data, meta tags, Open Graph images
  - Performance: image optimization, ISR for product pages

Note: Each brand deployment gets its own storefront instance with
brand-specific styling configured via env vars or a config file.
```

---

## Phase Dependency Graph

```
Phase 0 (Scaffolding + Auth)
    ├──→ Phase 1 (Database + BrandConfig) ──→ Phase 4 (Inngest Jobs) ──→ Phase 5 (Admin UI)
    ├──→ Phase 2 (Delete Sanity) ──────────────────────────────────────→ Phase 6 (Cleanup)
    ├──→ Phase 3 (Service Libs) ──→ Phase 4 (Inngest Jobs)
    └──→ Phase 7 (Storefront) — runs independently, in parallel with everything
```

**Maximum parallelism:**
- Phase 1, 2, 3, and 7 can ALL run in parallel after Phase 0
- Phase 4 starts when Phase 1 + 3 are done
- Phase 5 starts when Phase 4 is done (but UI can be stubbed earlier)
- Phase 6 runs last as a cleanup sweep
- Phase 7 is fully independent — can be done by a separate agent at any time

---

## Agent Assignment Strategy

For optimal parallel execution with a team of Claude Code agents:

| Agent | Phases | Focus Area |
|-------|--------|------------|
| **Agent A** | 0, 1 | Scaffolding, BetterAuth, database + BrandConfig setup |
| **Agent B** | 2 | Sanity deletion (all the rm -rf work) |
| **Agent C** | 3 | Service libraries (Canva, Printful, Shopify, AI prompts) |
| **Agent D** | 4 | Inngest functions (stage-advancing jobs, guidance handling, event chains) |
| **Agent E** | 5.1-5.4 | Admin UI: 5 stage queue pages, bucket selection, idea cards |
| **Agent F** | 5.5-5.7 | Admin UI: buckets/settings/categories pages, API routes |
| **Agent G** | 6, 7 | Cleanup + headless Shopify storefront |

**Handoff points:**
- Agent A completes → signals Agents D, E, F to start
- Agent B completes → signals Agent G to start cleanup
- Agent C completes → signals Agent D to start (needs service libs)
- Agent D completes → signals Agents E, F for final UI wiring
- Agent G runs storefront track independently — no handoff needed
- All complete → Agent G does final cleanup pass
