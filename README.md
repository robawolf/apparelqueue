# Product Idea Queue

A brand-agnostic, multi-stage product idea approval queue for dropshipped apparel. AI generates product ideas (phrases, graphics, apparel combos), and an admin reviews them through a 5-stage pipeline before they go live on a Shopify store via Printful.

Built on Next.js 15, PostgreSQL (Prisma), Inngest, and integrations with OpenRouter, fal.ai, Canva, Printful, and Shopify.

## Project Structure

```
/frontend      Queue admin app (port 3000)
/storefront    Headless Shopify storefront (port 3001)
```

## Features

- **5-Stage Approval Pipeline** — Phrase → Design → Product → Listing → Publish
- **AI Curation at Every Stage** — OpenRouter for text, fal.ai for images, Canva for print-ready designs
- **Buckets** — Persistent, reusable creative directives that steer AI output per stage
- **Brand-Agnostic** — Deploy one instance per brand with separate DB, env vars, and subdomain
- **Inngest Jobs** — Event-driven background workflows with retries and monitoring
- **BetterAuth** — Email/password auth with session-based route protection
- **Headless Shopify Storefront** — SSG/ISR product pages via Storefront API

## Getting Started

### 1. Install dependencies

```shell
npm install
```

### 2. Configure environment variables

```shell
cp frontend/.env.example frontend/.env.local
```

### 3. Set up the database

```shell
cd frontend
npx prisma migrate dev    # Run migrations
npx prisma db seed        # Seed brand config, categories, and buckets
```

### 4. Start development servers

```shell
npm run dev                    # Start queue + storefront
npx inngest-cli@latest dev     # Start Inngest dev server (separate terminal)
```

- Queue Admin: [http://localhost:3000](http://localhost:3000)
- Storefront: [http://localhost:3001](http://localhost:3001)
- Inngest Dev Server: [http://localhost:8288](http://localhost:8288)

## Pipeline Overview

```
Stage 1: PHRASE          Stage 2: DESIGN          Stage 3: PRODUCT
(AI generates phrase) → (fal.ai + Canva graphic) → (AI suggests config)
                                                          ↓
                        Stage 5: PUBLISH         Stage 4: LISTING
                     (Printful → Shopify)  ←  (AI generates copy)
```

Each stage has its own queue view, bucket-based creative directives, and approval/reject/refine actions. See [CLAUDE.md](CLAUDE.md) for full architecture details.

## Automation (Inngest)

Background jobs in `/frontend/lib/inngest/functions/`:

| Job | Description |
|-----|-------------|
| `generate-ideas` | AI-generate batch of phrase options using bucket + category prompts |
| `create-design` | fal.ai concept art → Canva print-ready design |
| `refine-idea` | AI-regenerate at any stage using revision history |
| `configure-product` | AI-suggest Printful product configurations |
| `configure-listing` | AI-generate Shopify listing copy options |
| `create-printful-product` | Create product on Printful with full spec |
| `publish-to-shopify` | Update Shopify metadata after Printful sync |
| `analyze-categories` | Analyze which categories need more ideas |

### Running Jobs

- **Locally**: Use the Inngest Dev Server UI at http://localhost:8288
- **Production**: Via Inngest Cloud (triggered by cron schedules or API events)
- **Admin Dashboard**: Trigger jobs from `/admin/jobs`

## Admin API

```
Ideas:
GET    /api/admin/ideas                List ideas (filter by stage, status, bucketId)
PATCH  /api/admin/ideas/:id            Update idea fields
POST   /api/admin/ideas/:id/advance    Approve + advance to next stage
POST   /api/admin/ideas/:id/reject     Reject at current stage
POST   /api/admin/ideas/:id/refine     Submit refinement notes
POST   /api/admin/ideas/:id/publish    Final publish (stage 5)

Buckets:
GET    /api/admin/buckets              List buckets (filter by stage)
POST   /api/admin/buckets              Create bucket
PATCH  /api/admin/buckets/:id          Update bucket
DELETE /api/admin/buckets/:id          Delete bucket

Settings:
GET    /api/admin/settings             Get brand config
PATCH  /api/admin/settings             Update brand config

Jobs:
GET    /api/admin/jobs                 List available jobs
POST   /api/admin/jobs/:name/run       Trigger a job
GET    /api/admin/jobs/runs            List recent runs

Printful:
GET    /api/admin/printful/catalog     List printable product types
GET    /api/admin/printful/variants    Get variants for a product type
GET    /api/admin/printful/printfiles  Get placement specs
```

## Deployment

### Queue App (Vercel)

1. Connect your GitHub repository to Vercel
2. Set root directory to `frontend`
3. Configure environment variables (see `frontend/.env.example`)
4. Connect Inngest via Vercel integration
5. Provision PostgreSQL (Vercel Postgres or external)

### Storefront (Vercel)

1. Create a separate Vercel project
2. Set root directory to `storefront`
3. Configure Shopify Storefront API credentials

### Adding a New Brand

1. Deploy a new instance of this codebase
2. Set environment variables for the brand's infrastructure
3. Create `frontend/prisma/seeds/newbrand.ts`
4. Set `BRAND_SEED=newbrand` in `.env`
5. Run `npx prisma db seed`

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Inngest Documentation](https://www.inngest.com/docs)
- [BetterAuth Documentation](https://www.better-auth.com/docs)
- [Printful API Documentation](https://developers.printful.com/docs/)
- [Shopify Storefront API](https://shopify.dev/docs/api/storefront)
- [fal.ai Documentation](https://fal.ai/docs)
- [Canva API Documentation](https://www.canva.dev/docs/connect/)
