# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **brand-agnostic, multi-stage product idea approval queue** for dropshipped apparel. AI generates product ideas (phrases, graphics, apparel combos), and an admin reviews them through a 5-stage pipeline before they go live on a Shopify store via Printful.

The codebase is designed to be deployed as **separate instances per brand** — each brand gets its own deployment, subdomain, and database. The first brand is **Chisme Wear** (Spanglish-themed apparel), but the queue code contains zero hardcoded brand references. Brand identity, verbiage themes, graphic styles, and product types are all configurable via a `BrandConfig` database record and environment variables.

This monorepo houses two applications:

- **Queue** (`/frontend`) — The admin dashboard for AI-powered product idea generation and multi-stage approval. Hosted on a subdomain (e.g., `queue.chismewear.com`).
- **Storefront** (`/storefront`) — A headless Next.js Shopify storefront replacing the default Shopify theme. Hosted on the main domain (e.g., `chismewear.com`).

This project is being converted from a Sanity CMS + blog monorepo:
- **Inngest** for background job orchestration (kept from original)
- **OpenRouter** for AI inference — phrase generation, product config, listing copy (kept from original, repurposed)
- **fal.ai** for AI image generation — mockups, design variations, supplemental graphics (new integration)
- **Canva API** for template-based graphic design — print-ready files from brand kit templates (new integration)
- **Printful API** for product creation and fulfillment (new integration)
- **Shopify Storefront API** for the headless storefront (new integration)
- **Shopify Admin API** for product metadata management from the queue (new integration)
- **PostgreSQL** (via Prisma) for queue data persistence (replaces Sanity CMS)

## Development Commands

### Start Development Servers
```bash
npm run dev                 # Start both queue and storefront in parallel
npm run dev:queue           # Start only the queue admin app (port 3000)
npm run dev:storefront      # Start only the Shopify storefront (port 3001)
npx inngest-cli@latest dev  # Start Inngest dev server (port 8288)
```

### Building and Type Checking
```bash
npm run build --workspace=frontend      # Build queue admin app
npm run build --workspace=storefront    # Build Shopify storefront
npm run type-check                       # Type check both workspaces
npm run lint                             # Lint code
```

### Database (queue only)
```bash
npx prisma migrate dev   # Run database migrations (from /frontend)
npx prisma generate      # Generate Prisma client
npx prisma studio        # Open Prisma Studio (DB browser)
```

### Code Formatting
```bash
npm run format           # Format all code using Prettier
```

## Architecture Overview

### Monorepo Structure
This is a workspace monorepo with two Next.js applications:

- **`/frontend`** — Queue admin app (internal tool, hosted on subdomain)
- **`/storefront`** — Headless Shopify storefront (public site, hosted on main domain)

### Single-Tenant Deployment Model
Each brand gets its own deployment of this codebase:
- Separate Vercel project (or other host)
- Separate subdomain (e.g., `queue.chismewear.com`, `queue.otherbrand.com`)
- Separate PostgreSQL database
- Separate environment variables pointing to that brand's Printful store, Shopify store, Canva brand kit, etc.
- Brand creative config (verbiage themes, graphic styles, tone) lives in a `BrandConfig` singleton record in the database, editable via the admin Settings page

To add a new brand: deploy a new instance, set env vars, seed the database with that brand's config.

### Queue App Architecture (`/frontend`)
- **Framework**: Next.js 15 with App Router and Turbopack
- **Styling**: Tailwind CSS 4.x
- **Database**: PostgreSQL via Prisma ORM (replaces Sanity CMS)
- **Auth**: BetterAuth with Prisma adapter (email/password, session-based)
- **Jobs**: Inngest serverless workflow platform
- **Deployment**: Vercel (subdomain per brand)

### Storefront Architecture (`/storefront`)
- **Framework**: Next.js 15 with App Router
- **Data**: Shopify Storefront API (reads products published from queue)
- **Styling**: Tailwind CSS
- **Features**: SSG/ISR product pages, SEO, structured data, cart
- **Deployment**: Vercel (main domain per brand)
- **Note**: The storefront does NOT share a database with the queue. It reads product data from Shopify's API — the queue pushes products there via Printful.

### Key Directories (Queue — `/frontend`)
- `app/admin/` - Admin dashboard (5-stage approval queues, buckets, jobs, settings)
- `app/api/` - API routes (admin endpoints, Inngest webhook, Printful proxy)
- `app/api/auth/` - BetterAuth catch-all route
- `app/components/admin/` - Admin UI components (stage queues, idea cards, variant picker)
- `lib/` - Service clients and utilities (flat structure)
- `lib/inngest/` - Inngest client, job functions, and event types
- `lib/auth.ts` - BetterAuth server instance
- `lib/auth-client.ts` - BetterAuth client for React
- `middleware.ts` - Route protection for /admin/* and /api/admin/*
- `prisma/` - Database schema and migrations
- `prisma/seeds/` - Brand-specific seed data files (one per brand: `chismewear.ts`, etc.)

### Service Libraries (`/lib/`):
- `ai.ts` - OpenRouter AI integration for text inference (phrases, product config, listing copy)
- `fal.ts` - fal.ai client for AI image generation (mockups, design variations, concept art)
- `canva.ts` - Canva API client for template-based graphic design (print-ready files)
- `printful.ts` - Printful API client for product creation
- `shopify.ts` - Shopify Admin API client for publishing
- `telegram.ts` - Telegram bot notifications
- `logger.ts` - Console-based logging for serverless
- `db.ts` - Prisma client singleton

### Admin API Endpoints:
- `GET /api/admin/ideas` - List ideas (filtered by stage, status, bucketId)
- `PATCH /api/admin/ideas/[id]` - Update idea fields
- `POST /api/admin/ideas/[id]/advance` - Approve idea, advance to next stage (with optional forward guidance + next-stage bucketId)
- `POST /api/admin/ideas/[id]/reject` - Reject idea at current stage
- `POST /api/admin/ideas/[id]/refine` - Submit refinement notes, trigger AI regen
- `POST /api/admin/ideas/[id]/publish` - Final publish (stage 5 approval)
- `GET /api/admin/jobs` - List available jobs
- `POST /api/admin/jobs/[name]/run` - Trigger a job (sends Inngest event)
- `GET /api/admin/jobs/runs` - List recent job runs
- `GET /api/admin/printful/catalog` - List printable product types
- `GET /api/admin/printful/variants` - Get variants for a product type
- `GET /api/admin/printful/printfiles` - Get placement specs
- `GET /api/admin/buckets` - List buckets (filtered by stage)
- `POST /api/admin/buckets` - Create bucket (name, stage, prompt)
- `PATCH /api/admin/buckets/[id]` - Update bucket (name, prompt, isActive, sortOrder)
- `DELETE /api/admin/buckets/[id]` - Delete bucket
- `GET /api/admin/settings` - Get brand config
- `PATCH /api/admin/settings` - Update brand config

## Multi-Stage Approval Pipeline

Ideas flow through **5 sequential stages**. Each stage has its own queue view in the admin dashboard. An idea must be approved at its current stage to advance to the next. At any stage, an idea can be rejected or sent back for refinement.

```
Stage 1: PHRASE          Stage 2: DESIGN          Stage 3: PRODUCT
(AI generates phrase) → (Canva creates graphic) → (AI suggests product config)
                                                          ↓
                        Stage 5: PUBLISH         Stage 4: LISTING
                     (Go live on Shopify)  ←  (AI generates listing copy)
```

### AI Curation at Every Stage

AI is actively involved at every stage up through listing — it's not just generating at Stage 1 and handing off. At each stage, AI curates **multiple options** for the admin to choose from or refine. The admin's role is selection and guidance, not creation.

### Buckets (Persistent Creative Directives Per Stage)

Each pipeline stage has its own set of **Buckets** — named, reusable creative directives with prompts that get injected into the AI's system instruction. Buckets create a three-level prompt hierarchy:

1. **Brand level** (BrandConfig) — high-level brand identity prompt, e.g., *"apparel with spanglish sayings and toons that allude to gossip and coffee"*
2. **Category level** (Category.promptContext) — thematic grouping, e.g., *"kitchen sayings, dichos de cocina"*
3. **Bucket level** (Bucket.prompt) — specific creative directive for THIS stage's generation

Buckets are **stage-specific** — each stage has its own independent set:
- **Phrase buckets**: Direct what KIND of phrases AI generates. E.g., *"include flowers"*, *"humanized inanimate objects"*, *"workplace code-switching"*
- **Design buckets**: Direct visual style for fal.ai/Canva. E.g., *"retro loteria aesthetic"*, *"bold street art with neon"*, *"watercolor botanical"*
- **Product buckets**: Direct which product types the AI suggests. E.g., *"hats"*, *"hoodies"*, *"tote bags and accessories"*
- **Listing buckets**: Direct copywriting tone/angle. E.g., *"SEO-heavy, keyword focused"*, *"storytelling, cultural context"*, *"short and punchy"*

When the AI generates at any stage, it receives: `BrandConfig prompt + Category prompt + Bucket prompt`. The bucket narrows the AI's focus so it produces relevant output from the start — preventing wasted API/Canva bandwidth on off-target generations.

Ideas are tagged with which bucket they were generated under at each stage (separate FK per stage). Queue views can filter by bucket.

### Additional Guidance (Forward + Revision)

On top of buckets, admins can still provide **one-off guidance** at two points:

**1. Forward guidance (on approve):** When approving an idea to advance to the next stage, the admin can provide an optional prompt directing what the NEXT stage's generation should look like. This is in addition to the bucket the idea will land in.

Example: Admin approves a phrase → adds guidance: *"focus on the cooking metaphor, warm earthy tones"* → design generation uses this alongside the design bucket prompt.

**2. Revision guidance (on refine):** When reviewing output at any stage and requesting a redo, the admin provides feedback. This happens AFTER seeing output they want to improve.

### Revision History (Prepend, Don't Replace)

All one-off guidance — forward and revision — is stored in each idea's `revisionHistory` as **prepended entries** (newest first). The AI always sees the full chain of guidance when regenerating:
- `[{ stage, type, notes, timestamp }]`
- `type`: `'forward'` | `'revision'`
- New entries are prepended, never replacing old ones
- The most recent guidance is weighted highest, but prior context is preserved
- Bucket prompts are NOT stored in revisionHistory — they're read live from the Bucket record (so updating a bucket prompt affects future generations)
- The admin can see the full guidance chain + bucket assignments in the Publish Queue for final review

### Stage Details

**Stage 1 — Phrase Queue**
- Admin selects a **phrase bucket** (e.g., "Flowers", "Humanized Objects") and optionally a category
- AI generates **multiple phrase options** using: BrandConfig prompt + Category prompt + **Bucket prompt**
- Each phrase comes with: cultural explanation, suggested graphic concept, suggested apparel type
- Admin reviews options: approve favorites, reject others, or refine with guidance
- Actions: Approve (→ Stage 2, with optional forward guidance), Reject, Refine (with revision guidance)
- Ideas are tagged with their `phraseBucketId` for filtering
- **Bucket example**: Bucket "Flowers" with prompt *"incorporate floral imagery, garden metaphors, or flower-related dichos"*

**Stage 2 — Design Queue**
- Ideas land in a **design bucket** (admin assigns on approve, or defaults from phrase bucket mapping)
- **fal.ai generates AI concept art/mockups** using: BrandConfig graphic themes + **Design bucket prompt** + forward guidance
- Admin selects the best concept, then **Canva finalizes print-ready design** from brand kit template
- Admin reviews mockups: pick the best, refine with visual direction, or edit directly in Canva
- Actions: Approve (→ Stage 3, with optional forward guidance), Reject, Refine (re-run fal.ai), Edit in Canva (link)
- **Bucket example**: Bucket "Retro Loteria" with prompt *"classic loteria card aesthetic, bold outlines, warm earthy palette, vintage typography"*

**Stage 3 — Product Queue**
- Ideas land in a **product bucket** (admin assigns on approve, or AI suggests based on design)
- AI suggests **product configurations** using: BrandConfig defaults + **Product bucket prompt** + forward guidance
- Product buckets narrow which apparel types and variants the AI recommends
- Admin reviews suggestions, modifies, or asks for different recommendations
- Actions: Approve (→ Stage 4, with optional forward guidance), Reject, Refine, Back to Design
- **Bucket example**: Bucket "Hoodies" with prompt *"focus on hoodie and pullover variants, dark/neutral base colors, front print only"*

**Stage 4 — Listing Queue**
- Ideas land in a **listing bucket** (admin assigns on approve, or defaults based on product type)
- AI generates **multiple listing copy options** using: BrandConfig tone + **Listing bucket prompt** + forward guidance
- Options vary in: tone, length, keyword emphasis, SEO angle
- Admin picks the best copy or refines with copywriting direction
- Actions: Approve (→ Stage 5), Reject, Refine, Back to Product
- **Bucket example**: Bucket "SEO Heavy" with prompt *"prioritize keyword density, include bilingual search terms, optimize title for Amazon/Google discovery"*

**Stage 5 — Publish Queue**
- Final human review of the complete product package before going live
- Admin sees: full summary (phrase, design, product config, listing details, complete guidance history)
- Shows: bucket assignments at each stage (which phrase/design/product/listing bucket directed each generation)
- No AI curation at this stage — pure approval gate
- Actions: Publish (creates on Printful → syncs to Shopify → live), Reject, Back to any stage

### Status Values Per Stage
Each idea has a `stage` (which queue it's in) and a `status` (its state within that queue):
- `pending` — Waiting for admin review
- `approved` — Approved, advancing to next stage (or published if Stage 5)
- `rejected` — Rejected at this stage (terminal)
- `refining` — Sent back for AI/manual refinement
- `processing` — Background job running (e.g., Canva generating, Printful creating)

## Data Model

### Core Entities (Prisma/PostgreSQL)

**1. BrandConfig** — Singleton configuration record for this deployment's brand. Editable via the admin Settings page. Contains all brand-specific creative and business configuration.
- `id` - Always "default" (singleton)
- `name` - Brand display name (e.g., "Chisme Wear")
- **Verbiage config:**
  - `verbiageTheme` - Description of the brand's text/phrase style (e.g., "Spanglish figures of speech, bilingual wordplay, dichos")
  - `verbiagePromptContext` - Detailed AI prompt context for phrase generation
  - `toneGuidelines` - Brand voice guidelines (e.g., "culturally authentic, funny, all-ages appropriate")
- **Graphic config:**
  - `graphicThemes` - JSON array of graphic style options (e.g., ["retro loteria", "bold street art", "minimalist line art"])
  - `canvaTemplateIds` - JSON map of Canva template IDs per apparel type
- **Product config:**
  - `defaultApparelTypes` - JSON array of default product types (e.g., ["t-shirt", "hoodie", "tank-top"])
  - `defaultMarkupPercent` - Default retail markup over Printful cost
- **AI config:**
  - `aiModelPreference` - Default OpenRouter model
  - `ideaBatchSize` - How many ideas to generate per run
- `createdAt`, `updatedAt`

**2. Bucket** — Persistent, reusable creative directives scoped to a pipeline stage. Each stage has its own independent set of buckets.
- `id` - UUID primary key
- `stage` - Which pipeline stage this bucket belongs to: `phrase`, `design`, `product`, `listing`
- `name` - Display name (e.g., "Flowers", "Retro Loteria", "Hoodies", "SEO Heavy")
- `prompt` - AI directive text injected into system instruction alongside brand/category prompts
- `isActive` - Whether this bucket is available for new generations
- `sortOrder` - Display order in admin UI
- `createdAt`, `updatedAt`

**3. Idea** — The primary entity flowing through the 5-stage pipeline.

**Pipeline fields:**
- `id` - UUID primary key
- `stage` - Current pipeline stage: `phrase`, `design`, `product`, `listing`, `publish`
- `status` - Status within current stage: `pending`, `approved`, `rejected`, `refining`, `processing`
- `categoryId` - FK to Category
- `createdAt`, `updatedAt`

**Bucket assignments (one per stage, tracking which bucket directed generation):**
- `phraseBucketId` - FK to Bucket (stage=phrase) — which bucket directed phrase generation
- `designBucketId` - FK to Bucket (stage=design) — which bucket directed design generation
- `productBucketId` - FK to Bucket (stage=product) — which bucket directed product suggestions
- `listingBucketId` - FK to Bucket (stage=listing) — which bucket directed listing copy

**Revision tracking:**
- `revisionHistory` - JSON array of timestamped guidance entries. Newest first (prepended). Each entry: `{ stage, type, notes, timestamp }`. Types: `'forward'` (guidance before generation), `'revision'` (feedback after seeing output). Bucket prompts are read live from the Bucket record, not stored here.

**Stage 1 — Phrase fields (AI-generated, admin-editable):**
- `phrase` - The phrase/figure of speech
- `phraseExplanation` - Cultural context and meaning
- `graphicDescription` - AI-suggested visual concept
- `graphicStyle` - Selected art style (from BrandConfig graphicThemes)
- `aiModel` - Which AI model generated this
- `aiPrompt` - The prompt used (for iteration)

**Stage 2 — Design fields (Canva integration):**
- `mockupImageUrl` - Canva-generated mockup image URL
- `canvaDesignId` - Canva design ID for editing/re-exporting
- `designFileUrl` - Exported print-ready file URL (high-res PNG)

**Stage 3 — Product fields (Printful configuration):**
- `apparelType` - Product type (from BrandConfig defaultApparelTypes)
- `printfulCatalogId` - Printful product catalog ID
- `variants` - JSON array of selected variant objects:
  - `{ printfulVariantId, size, color, colorHex, retailPrice }`
- `printPlacements` - JSON array of print file placements:
  - `{ placement, designFileUrl, width, height, top, left }`
- `colorScheme` - Suggested colors for the design

**Stage 4 — Listing fields (Shopify product metadata):**
- `productTitle` - Shopify product title
- `productDescription` - Shopify product description
- `productTags` - JSON array of Shopify tags
- `shopifyCollectionId` - Target Shopify collection

**Stage 5 — Fulfillment fields (post-publish tracking):**
- `printfulProductId` - Printful sync product ID
- `printfulExternalId` - External ID linking Printful ↔ Shopify
- `shopifyProductId` - Shopify product ID
- `shopifyProductUrl` - Live product URL
- `publishedAt` - Timestamp of Shopify publish

**4. Category** — Thematic groupings for ideas.
- `id` - UUID primary key
- `name` - Category name (e.g., "Kitchen Sayings", "Family Dynamics")
- `slug` - URL-safe identifier (unique)
- `description` - Category theme description
- `promptContext` - AI prompt context for generating ideas in this category
- `targetCount` - Desired number of published products
- `isActive` - Whether to generate new ideas for this category
- `createdAt`, `updatedAt`

**5. User / Session / Account / Verification** — BetterAuth tables (see Auth section).

## Inngest Job Architecture

### Job Functions (`/lib/inngest/functions/`):

**Stage-advancing jobs (triggered by stage approvals):**
- `generate-ideas.ts` - AI-generate batch of phrase options (→ Stage 1: pending). Uses phrase bucket prompt + category + brand context.
- `create-design.ts` - fal.ai generates concept art variations, then Canva creates print-ready design (Stage 1 approved → Stage 2: pending). Uses design bucket prompt + forward guidance.
- `configure-product.ts` - AI-suggest product configurations from BrandConfig defaults (Stage 2 approved → Stage 3: pending). Uses product bucket prompt + forward guidance.
- `configure-listing.ts` - AI-generate multiple listing copy options (Stage 3 approved → Stage 4: pending). Uses listing bucket prompt + forward guidance.
- `create-printful-product.ts` - Create product on Printful (Stage 5 approved → processing)
- `publish-to-shopify.ts` - Update Shopify metadata after Printful sync (→ published)

**Utility jobs:**
- `refine-idea.ts` - AI-regenerate at any stage using full revision history (prepends new guidance, generates new batch of options)
- `analyze-categories.ts` - AI-analyze which categories need more ideas

### Job Chaining (Event-Driven):
```
generate-ideas → (idea.created) → [Admin approves phrase + assigns design bucket]
  → create-design → (design.created) → [Admin approves design + assigns product bucket]
  → configure-product → (product.configured) → [Admin approves product + assigns listing bucket]
  → configure-listing → (listing.configured) → [Admin approves listing]
  → [Admin approves publish] → create-printful-product
  → (printful.created) → publish-to-shopify → LIVE
```

Human approval gates (with bucket assignment + optional forward guidance) are between each automated step. The admin dashboard is the control surface; Inngest handles the async work.

### Event Types:
```typescript
type Events = {
  // Manual triggers
  'job/generate-ideas': { categoryId?: string; bucketId: string }
  'job/create-design': { ideaId: string }
  'job/refine-idea': { ideaId: string; notes: string; stage: string }
  'job/configure-product': { ideaId: string }
  'job/configure-listing': { ideaId: string }
  'job/create-printful-product': { ideaId: string }
  'job/publish-to-shopify': { ideaId: string }
  'job/analyze-categories': {}

  // Chain events (emitted after job completion)
  'idea.created': { ideaId: string; categoryId: string }
  'design.created': { ideaId: string }
  'product.configured': { ideaId: string }
  'listing.configured': { ideaId: string }
  'printful.created': { ideaId: string; printfulProductId: string }
  'categories.analyzed': { categoryIds: string[] }
}
```

## Single-Tenant Brand Architecture

The queue is deployed as **one instance per brand**. Each deployment has its own database, env vars, and subdomain. The codebase is brand-agnostic — it contains no hardcoded brand references.

### To deploy for a new brand:
1. Deploy a new instance of this codebase
2. Set environment variables for the brand's infrastructure (API keys, store IDs, domain)
3. Create a seed data file: `prisma/seeds/newbrand.ts` (exports BrandConfig, categories, and buckets)
4. Set `BRAND_SEED=newbrand` in `.env`
5. Run `npx prisma db seed` — populates BrandConfig, categories, and stage-specific buckets
6. Point a subdomain at the deployment

### What's configurable per deployment:

**Via environment variables** (infrastructure):
- Database connection, auth secrets, Inngest keys
- OpenRouter API key, fal.ai API key, Canva API key, Printful API key
- Printful store ID, Shopify store domain + admin API token
- Canva brand kit ID
- Telegram bot token + chat ID
- Public site URL

**Via BrandConfig database record** (creative/business — editable in admin Settings):
- Brand name and display identity
- Verbiage theme + prompt context + tone guidelines
- Graphic themes (art style options)
- Canva template IDs per apparel type
- Default apparel types
- Default pricing markup
- AI model preference + batch size

**Via Category records** (content themes — editable in admin Categories page):
- Category names, descriptions, AI prompt context
- Target product counts per category
- Active/inactive toggle

**Via Bucket records** (stage-specific creative directives — editable in admin Buckets page):
- Per-stage named directives with AI prompts (phrase buckets, design buckets, product buckets, listing buckets)
- Each bucket's prompt is injected into the AI system instruction alongside brand + category context
- Active/inactive toggle, sort order

## Environment Configuration

```bash
# In frontend/.env.local

# Database
DATABASE_URL="postgresql://..."

# BetterAuth
BETTER_AUTH_SECRET="your-auth-secret"
BETTER_AUTH_URL="http://localhost:3000"

# Inngest
INNGEST_SIGNING_KEY="your-signing-key"

# AI Services
OPENROUTER_API_KEY="your-openrouter-key"   # Text inference (phrases, config, listing copy)
FAL_KEY="your-fal-ai-key"                  # Image generation (mockups, concept art, variations)

# Canva API
CANVA_API_KEY="your-canva-api-key"
CANVA_BRAND_KIT_ID="your-brand-kit-id"

# Printful API
PRINTFUL_API_KEY="your-printful-api-key"
PRINTFUL_STORE_ID="your-store-id"

# Shopify Admin API
SHOPIFY_STORE_DOMAIN="yourstore.myshopify.com"
SHOPIFY_ADMIN_API_TOKEN="your-admin-api-token"

# Notifications
TELEGRAM_BOT_TOKEN="your-bot-token"
TELEGRAM_CHAT_ID="your-chat-id"
PUBLIC_SITE_URL="https://yourdomain.com"
```

## Key Design Decisions

### Why a 5-stage pipeline instead of a single approval status?
Each stage involves different concerns and different kinds of review:
- **Phrase**: Is this culturally on-brand? Is it funny/relatable?
- **Design**: Does the graphic work visually? Does it fit the brand aesthetic?
- **Product**: Are the variants right? Is the pricing competitive?
- **Listing**: Is the copy compelling? Are the tags/SEO correct?
- **Publish**: Final sanity check before going live.

A single queue would force the admin to context-switch between all these concerns at once. Separate queues let you batch similar work (e.g., approve 20 phrases in one sitting, then switch to reviewing designs).

### Why single-tenant instead of multi-tenant?
The queue will serve 2-3 brands at most, each on its own subdomain. Single-tenant is simpler:
- No brandId foreign keys cluttering every query
- No brand switcher in the UI
- Each deployment is fully isolated (separate DB, separate env vars)
- Adding a brand = deploying a new instance, not adding a DB record
- The codebase stays brand-agnostic through BrandConfig + env vars, not through multi-tenant data modeling

### Why PostgreSQL instead of Sanity?
- No public-facing content site — this is purely an admin tool
- Simpler data model fits relational DB (Category → Idea)
- Prisma provides type-safe queries without GROQ learning curve
- Lower cost and operational complexity for an internal queue

### Why BetterAuth instead of the draft mode hack?
The original codebase piggybacked on Next.js draft mode cookies for admin auth. BetterAuth provides:
- Email/password authentication with proper session management
- User table in the same PostgreSQL database (via Prisma adapter)
- Middleware-based route protection
- Future ability to add OAuth providers, invite team members, or role-based access

**Auth architecture:**
- `lib/auth.ts` — BetterAuth server instance (configures Prisma adapter, session strategy)
- `lib/auth-client.ts` — BetterAuth client for React components
- `app/api/auth/[...all]/route.ts` — BetterAuth catch-all API route
- `middleware.ts` — Protects `/admin/*` and `/api/admin/*` routes
- `app/admin/login/page.tsx` — Login form using BetterAuth client

### Why keep Inngest?
- Proven event-driven job chaining pattern from the original codebase
- Built-in retries, concurrency control, and monitoring
- Step functions allow long-running API calls (Canva, Printful) without timeouts
- Admin dashboard job UI pattern is directly reusable

### Why buckets instead of one-off guidance prompts?
AI output is only as good as its direction. Without structured guidance, you waste fal.ai/Canva bandwidth on irrelevant designs and OpenRouter tokens on off-brand copy. Buckets solve this by providing **persistent, reusable creative directives** per stage:
- **Buckets** (per stage): Reusable named directives that categorize and steer AI output. E.g., phrase bucket "Flowers" ensures every idea in that bucket incorporates floral imagery. Product bucket "Hoodies" ensures the AI suggests hoodie variants.
- **Forward guidance** (one-off): Admin provides additional direction when approving to next stage, on top of the bucket prompt
- **Revision guidance** (one-off): Admin corrects after seeing output ("bolder colors, less busy")
- The three-level hierarchy (Brand → Category → Bucket) means each generation gets maximally targeted prompts, and buckets can be created/tweaked without touching brand-level config

## Deployment Notes

- **Queue app** (`/frontend`): Vercel project on subdomain (e.g., `queue.chismewear.com`)
- **Storefront** (`/storefront`): Vercel project on main domain (e.g., `chismewear.com`)
- **Database**: Vercel Postgres or external PostgreSQL provider (queue only)
- **Shopify**: Remains as backend for orders, inventory, payments — storefront is headless
- **Inngest**: Connected to queue via Vercel integration
- Both apps deploy independently from the same monorepo
- For additional brands: deploy new instances with different env vars and databases

## Testing and Quality

- ESLint configuration for Next.js best practices
- Prettier formatting
- TypeScript strict mode enabled
- Prisma type safety for all database operations
