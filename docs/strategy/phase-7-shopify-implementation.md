# Phase 7: Shopify implementation plan

How the redesign is built, what stays native, what is custom, and how it goes live without disturbing orders, inventory, or supplier feeds. The theme itself lives in `theme/` and its setup steps are in `theme/README.md`.

## Theme approach

Build on Dawn, Shopify's free reference theme, rather than a paid theme or a page builder.

- It is the theme Shopify tests every platform change against, so checkout, cart, Shop Pay, markets, and customer accounts keep working through updates.
- It ships with no JavaScript framework, lazy images, and native filters, which keeps Core Web Vitals in reach without a performance app.
- Every SaahVay feature is a section, snippet, or block layered on top. Dawn's own files are touched in four small places (layout, product section, product card, banner heading), all listed in `theme/README.md`, so future Dawn updates can be merged.

Rejected: page-builder apps (heavy scripts, locked-in markup), and a headless storefront (rebuilds checkout integrations for no customer-facing gain at this size).

## Native versus custom

| Requirement | How it is met |
|---|---|
| Cart, checkout, payments, accounts, currency selector | Shopify native, unchanged |
| Collection filters (shape, size, colour, price, availability, occasion, fit) | Search & Discovery app with metafield filters; Dawn renders them |
| Product recommendations and "Wear it with" | Shopify product recommendations and Search & Discovery complementary products |
| Quick view, wishlist | Dawn quick add; wishlist deferred (see apps) |
| Shape chips, fit module, shape pages, shape cards | Custom Liquid reading metafields |
| Fit quiz | Custom section and vanilla JS; products loaded through the Section Rendering API |
| Outfit builder | Custom section and JS using `/cart/add.js` with multiple items; reuses Dawn's cart drawer |
| Sticky mobile add-to-cart | Small custom script pinning Dawn's own button |
| Reviews | Deferred until a review app is chosen; theme shows no empty review modules |
| Structured data | Dawn's Product and Article JSON-LD plus custom Organization, WebSite, Breadcrumb |

## Metafields and tags

Defined by `scripts/setup-metafields.mjs`. All in the `saahvay` namespace so supplier imports cannot collide with them.

- Product: `shapes_primary`, `shapes_secondary` (lists limited to H, O, V, X, A), `why_it_works`, `fit_notes`, `model_info`, `fabric_care`, `outfit_products`, `publish_ready`.
- Collection: `shape_letter`, `guide_intro`, `principles`, `outfits_collection`.

Tags are for filtering only and are namespaced: `occasion:work`, `fit:relaxed`, `length:midi`, `sleeve:long`. Shape lives in metafields, not tags; the theme accepts `shape:H` tags only as a migration fallback.

## How quiz answers reach products

1. Each answer carries a small score map, for example `X:2,A:1`.
2. The highest total wins. A tie or a one-point gap names the runner-up so the customer sees both.
3. The result panel links to `/collections/shape-x` (an automated collection on `shapes_primary`) and fetches four products from it through `?section_id=shape-products`.
4. The result is stored in `localStorage` and in the customer tag `shape-X` when she saves it by email, which makes shape-based segments possible in Shopify Email or any connected ESP.
5. Every shape-filtered page offers "Change my shape" and the quiz offers "I'd rather just browse", so nobody is trapped in a category.

## Cleaning imported supplier products

Imports land as drafts. A product goes active only when a person has:

1. Rewritten the title to `[Style name] [Garment]`, 40 characters or fewer, colour as a variant.
2. Written the three-part description (the piece, why it works, fit and fabric) into the description and the `why_it_works`, `fit_notes`, `fabric_care` metafields.
3. Set `shapes_primary` (and `shapes_secondary` where relevant). A product that suits every shape gets all five, not none.
4. Checked pricing: `compare_at_price` empty or strictly greater than `price` on every variant.
5. Replaced or normalised imagery to 3:4 crops on a white or cream ground.
6. Replaced supplier tags with namespaced tags.
7. Set `publish_ready` to true.

`scripts/audit-products.mjs` lists everything that fails these checks and flags contradictory pricing and duplicate titles as launch blockers. Run it before launch and weekly afterwards; Shopify Flow can also trigger it on product creation once the store is on a plan that includes Flow.

## Apps

Necessary now:

- Search & Discovery (Shopify, free): filters and complementary products.
- Shopify Email or the existing ESP: quiz-result emails using the `shape-X` customer tag.
- Existing supplier import app: unchanged, but configured to create products as drafts.

Add when ready:

- A review app that supports product-level review schema and imports permissioned photos (Judge.me or Shopify's own Product Reviews successor). Do not enable review schema until real reviews exist.
- A wishlist app only if analytics show demand; the card heart is a light placeholder until then.
- Shopify Bundles (free) if outfits should be sold as one line item with inventory deducted from components. The current builder adds pieces as separate lines, which works today with no app.

Avoid: page builders, animation libraries, pop-up apps with more than one modal, review apps that inject their own fonts, anything that loads on every page but serves one section.

## Preserving the backend

- Products, variants, inventory, orders, customers, discounts, and payments are all data; the theme only reads them. Switching themes changes none of it.
- The supplier integration writes products through the Admin API, which is independent of the theme. The only change asked of it is default status draft.
- Checkout is Shopify's hosted checkout. The theme hands off at `/checkout` exactly as Dawn does.
- Metafield definitions are additive. Existing metafields from apps or imports are left alone.

## Staging and launch

1. Push the theme unpublished (`shopify theme push --unpublished`). It is invisible to customers.
2. Run `scripts/setup-metafields.mjs`, create the collections, pages, and menus listed in `theme/README.md`.
3. Clean a first batch of 20 to 30 products end to end so every shape page and the quiz have real content. Run the audit script until pricing and duplicate blockers are zero.
4. Use the theme preview link with the team on desktop and mobile. Test: quiz to result to shape page to product to cart to checkout; outfit add with one piece unticked; sold-out size handling; filters; search; account pages; 404.
5. Check Lighthouse on home, a shape page, and a product page (mobile). Fix anything below 90 performance or accessibility before launch.
6. Set the redirects: any old collection or page URLs that change get a redirect in Navigation > URL redirects.
7. Publish. Keep the previous theme in the library for a one-click rollback.
8. After launch: watch the audit weekly, and review search terms and quiz completion in analytics to refine questions.
