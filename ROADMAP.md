# Roadmap — Remaining Work

## Admin UI Components (Phase 5 — 7 components)

These are the stage-specific idea cards and product configuration components for the admin dashboard. `StageQueue.tsx` (the generic queue list) already exists.

### Stage Cards

- **`app/components/admin/PhraseCard.tsx`** — Stage 1 idea card. Shows phrase (large text), cultural explanation, suggested graphic concept/style, phrase bucket badge. Actions: Approve (select design bucket + optional forward guidance), Reject, Refine (guidance prompt that prepends to revision history).

- **`app/components/admin/DesignCard.tsx`** — Stage 2 card. Shows fal.ai concept art variations in a grid, selected mockup large, design bucket badge. Two-step flow: select concept from fal.ai variations, then Canva finalizes print-ready file. Actions: Approve (select product bucket + forward guidance), Reject, Refine (re-run fal.ai), Edit in Canva (external link). Shows revision/guidance history.

- **`app/components/admin/ProductCard.tsx`** — Stage 3 card. Shows mockup image, AI product suggestions, apparel type, variant summary, pricing, product bucket badge. Embeds VariantPicker and PlacementEditor for inline editing. Actions: Approve (select listing bucket + forward guidance), Reject, Refine, Back to Design.

- **`app/components/admin/ListingCard.tsx`** — Stage 4 card. Shows multiple AI listing copy options for comparison. Inline editing for title, description (textarea), tags (tag input). Actions: Approve (advance to Publish), Reject, Refine, Back to Product.

- **`app/components/admin/PublishCard.tsx`** — Stage 5 card. Read-only full summary: phrase, mockup, product config, listing details, pricing. Shows bucket assignments at each stage and complete revision/guidance history. Actions: Publish (triggers Printful + Shopify), Reject, Back to any stage.

### Product Configuration Components

- **`app/components/admin/VariantPicker.tsx`** — Printful variant selector. Fetches sizes/colors from `/api/admin/printful/variants`. Color swatch grid (toggle), size checkboxes per color, retail price input per variant (pre-filled from BrandConfig markup). Shows Printful cost vs retail for margin visibility.

- **`app/components/admin/PlacementEditor.tsx`** — Print placement configurator. Visual garment outline with placement zones (front, back, sleeve). Assign design file to each placement, set print dimensions within Printful max bounds, preview overlay of design on garment.

## Headless Shopify Storefront (Phase 7)

The `/storefront` workspace is scaffolded (layout + page) but needs full implementation.

- **Shopify Storefront API integration** — Connect to Shopify Storefront API for product data
- **Product pages** — Product listing (collection), product detail (size guide, color swatches), and cart
- **Brand-specific styling** — Colors, typography, logo configured via env vars or config
- **SEO** — Structured data (JSON-LD), meta tags, Open Graph images, ISR for product pages
- **Performance** — Image optimization, SSG/ISR for product and collection pages
