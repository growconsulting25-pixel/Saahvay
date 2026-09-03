# SaahVay Shopify theme

An Online Store 2.0 theme for saahvay.com, built on Shopify's Dawn 16.0.0 (MIT) and restyled to the SaahVay system: black, white, cream, and warm beige; Cormorant Garamond headings and DM Sans everywhere else. Dawn's cart, checkout hand-off, predictive search, filters, and customer accounts are untouched, so nothing about the commerce backend changes.

## What is added on top of Dawn

| Feature | Files |
|---|---|
| Brand settings (colors, fonts, radii, cart drawer) | `config/settings_data.json` |
| Design-system CSS | `assets/saahvay.css` |
| Shape chips on every product card | `snippets/shape-chips.liquid`, hooked into `snippets/card-product.liquid` |
| Fit module on product pages | `snippets/fit-module.liquid`, new `fit_module` block in `sections/main-product.liquid` |
| Full-bleed photographic hero with a bundled studio photograph as the default | `sections/saahvay-hero.liquid`, `assets/saahvay-hero.webp` |
| Shape rail: five letters, one portrait, the panel re-sets when a letter is chosen | `sections/shape-rail.liquid`, `assets/shape-rail.js`, `assets/saahvay-shape-*.webp` |
| Statement with photo ("Size tells you if it closes. Shape tells you if it works.") | `sections/saahvay-statement.liquid`, `assets/saahvay-lineup.webp` |
| Shape cards (Shop by Shape page) | `sections/shape-cards.liquid` |
| 60-second fit quiz with result and email capture | `sections/fit-quiz.liquid`, `assets/fit-quiz.js`, `sections/shape-products.liquid` |
| Shape pages (guide above the grid, shape switcher, outfits row) | `sections/shape-guide.liquid`, `templates/collection.shape.json` |
| Outfit builder (size per piece, add the whole look) | `sections/outfit-builder.liquid`, `assets/outfit-builder.js`, `templates/product.outfit.json` |
| How it works, trust bar, testimonials | `sections/how-it-works.liquid`, `sections/trust-bar.liquid`, `sections/testimonials.liquid` |
| Sticky mobile add-to-cart | `assets/saahvay.js` |
| Organization, WebSite, and Breadcrumb structured data | `snippets/saahvay-schema.liquid` |
| Homepage H1 | `sections/saahvay-hero.liquid` renders its heading as H1 on the index template |
| Copy for shapes, quiz, and outfit UI | `locales/en.default.json` under the `saahvay` key |

## Local development

Requires the Shopify CLI (`npm i -g @shopify/cli`).

```bash
# validate
shopify theme check --path theme

# preview against your store (opens a development theme, never touches the live one)
shopify theme dev --path theme --store your-store.myshopify.com

# push as an unpublished theme for review
shopify theme push --path theme --unpublished --theme "SaahVay redesign"
```

Publish from Shopify admin only after the checklist in `docs/strategy/phase-7-shopify-implementation.md` is complete.

## Store setup the theme expects

Create these in Shopify admin. The theme degrades gracefully when something is missing (a shape card falls back to the all-products URL, the quiz hides the product row), but the funnel only works end to end when all of them exist.

**Metafield definitions.** Run `node scripts/setup-metafields.mjs` (see `scripts/`), or create them by hand with the same namespace and keys:

- Product: `saahvay.shapes_primary`, `saahvay.shapes_secondary` (lists of H, O, V, X, A), `saahvay.why_it_works`, `saahvay.fit_notes`, `saahvay.model_info`, `saahvay.fabric_care`, `saahvay.outfit_products` (product list), `saahvay.publish_ready` (boolean)
- Collection: `saahvay.shape_letter`, `saahvay.guide_intro`, `saahvay.principles`, `saahvay.outfits_collection`

**Collections.**

- `shape-h`, `shape-o`, `shape-v`, `shape-x`, `shape-a`: automated, condition "product metafield saahvay.shapes_primary contains H" (and so on). Assign the `collection.shape` template to each and set `saahvay.shape_letter`.
- `outfits`: all complete-look products. Optionally `outfits-shape-h` and so on, or set `saahvay.outfits_collection` on each shape collection.
- `new-arrivals`: automated, published within the last 30 days.
- Category collections: `dresses`, `tops`, `trousers`, `skirts`, `outerwear`, `sets`.

**Pages.** `fit-quiz` (template `page.fit-quiz`), `shop-by-shape` (template `page.shop-by-shape`), `our-story` (template `page.our-story`), `fit-and-sizing`, `shipping`, `returns`, `shipping-and-returns` (used by the product-page accordion), `contact`, `faq`.

**Menus.** `main-menu` (New Arrivals, Shop, Shop by Shape, Outfits, Find Your Fit, Our Story), `footer-shop`, `footer-fit`, `footer-care`.

**Search & Discovery app** (free, by Shopify): enable filters for the two shape metafields, size, colour, price, and availability. The quiz's "See complete looks" button links to `/collections/outfits?filter.p.m.saahvay.shapes_primary=A`, which only works once the metafield filter is enabled.

**Outfit products.** Create one product per complete look, assign template `product.outfit`, set `saahvay.outfit_products` to its pieces and `saahvay.shapes_primary` to the shapes it suits. Keep its own inventory at zero with tracking on so it cannot be bought as a product; customers buy the pieces through the builder.

## Product data rules

Every imported product stays in draft until it meets `docs/strategy/saahvay-redesign-strategy.md` section 1.6, then `saahvay.publish_ready` is set to true. `node scripts/audit-products.mjs` reports products that break the rules, including any variant whose compare-at price is below its price.

## Bundled photography

The hero, the shape rail portraits, and the statement band ship with generated studio photographs in `assets/` (`saahvay-hero.webp`, `saahvay-shape-h.webp` … `saahvay-shape-a.webp`, `saahvay-lineup.webp`) so the theme looks finished before any store images exist. Every one of those sections has an image picker; the moment a merchant image is chosen the bundled file is no longer used. Replace them with real campaign photography before launch. The same files sit in `preview/img/` for the static preview.
