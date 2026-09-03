#!/usr/bin/env node
/*
  SaahVay product-data audit.

  Reads every product through the Shopify Admin GraphQL API and reports the
  problems the redesign strategy identified: contradictory sale prices,
  duplicate titles, supplier-style titles, missing shape metafields, missing
  descriptions or images, un-namespaced tags. Read-only: it changes nothing.

  Usage:
    SHOPIFY_STORE=your-store.myshopify.com SHOPIFY_ADMIN_TOKEN=shpat_... node scripts/audit-products.mjs
  Options:
    --json audit-report.json   also write the full report as JSON
    --status active            only audit products with this status (active|draft|archived)

  The token needs read_products scope. Create it in Shopify admin under
  Settings > Apps and sales channels > Develop apps.
*/

import { writeFileSync } from 'node:fs';

const store = process.env.SHOPIFY_STORE;
const token = process.env.SHOPIFY_ADMIN_TOKEN;
const apiVersion = process.env.SHOPIFY_API_VERSION || '2025-07';

if (!store || !token) {
  console.error('Set SHOPIFY_STORE (your-store.myshopify.com) and SHOPIFY_ADMIN_TOKEN.');
  process.exit(1);
}

const args = process.argv.slice(2);
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const statusFilter = args.includes('--status') ? args[args.indexOf('--status') + 1] : null;

const QUERY = `
  query Products($cursor: String, $query: String) {
    products(first: 100, after: $cursor, query: $query) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id title handle status vendor productType tags
        descriptionHtml
        featuredImage { id }
        media(first: 1) { nodes { id } }
        shapesPrimary: metafield(namespace: "saahvay", key: "shapes_primary") { value }
        whyItWorks: metafield(namespace: "saahvay", key: "why_it_works") { value }
        publishReady: metafield(namespace: "saahvay", key: "publish_ready") { value }
        variants(first: 100) {
          nodes { id title sku price compareAtPrice inventoryQuantity }
        }
      }
    }
  }
`;

async function gql(query, variables) {
  const response = await fetch(`https://${store}/admin/api/${apiVersion}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query, variables }),
  });
  const body = await response.json();
  if (body.errors) throw new Error(JSON.stringify(body.errors));
  return body.data;
}

async function fetchAll() {
  const products = [];
  let cursor = null;
  do {
    const data = await gql(QUERY, { cursor, query: statusFilter ? `status:${statusFilter}` : null });
    products.push(...data.products.nodes);
    cursor = data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : null;
  } while (cursor);
  return products;
}

function normalise(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function looksLikeSupplierTitle(title) {
  const words = title.trim().split(/\s+/);
  const allCaps = title === title.toUpperCase() && /[A-Z]/.test(title);
  return title.length > 40 || words.length > 6 || allCaps;
}

function audit(products) {
  const findings = [];
  const byTitle = new Map();

  for (const p of products) {
    const issues = [];
    const strip = (s) => (s || '').replace(/<[^>]+>/g, '').trim();

    for (const v of p.variants.nodes) {
      const price = parseFloat(v.price);
      const compare = v.compareAtPrice === null ? null : parseFloat(v.compareAtPrice);
      if (compare !== null && compare < price) {
        issues.push({ code: 'SALE_PRICE_ABOVE_COMPARE', detail: `${v.title}: price ${price} > compare-at ${compare}` });
      } else if (compare !== null && compare === price) {
        issues.push({ code: 'COMPARE_EQUALS_PRICE', detail: `${v.title}: compare-at equals price (no sale shown, remove compare-at)` });
      }
      if (price === 0) issues.push({ code: 'ZERO_PRICE', detail: v.title });
    }

    if (looksLikeSupplierTitle(p.title)) issues.push({ code: 'SUPPLIER_STYLE_TITLE', detail: p.title });
    if (!strip(p.descriptionHtml)) issues.push({ code: 'MISSING_DESCRIPTION' });
    if (!p.featuredImage && p.media.nodes.length === 0) issues.push({ code: 'MISSING_IMAGE' });
    if (!p.shapesPrimary || !p.shapesPrimary.value || p.shapesPrimary.value === '[]') {
      issues.push({ code: 'MISSING_SHAPES', detail: 'saahvay.shapes_primary is empty' });
    }
    if (!p.whyItWorks || !p.whyItWorks.value) issues.push({ code: 'MISSING_WHY_IT_WORKS' });
    const badTags = p.tags.filter((t) => !/^[a-z_]+:/.test(t));
    if (badTags.length) issues.push({ code: 'UNNAMESPACED_TAGS', detail: badTags.join(', ') });
    if (p.status === 'ACTIVE' && (!p.publishReady || p.publishReady.value !== 'true')) {
      issues.push({ code: 'ACTIVE_WITHOUT_PUBLISH_READY' });
    }

    const key = normalise(p.title);
    byTitle.set(key, [...(byTitle.get(key) || []), p.handle]);

    if (issues.length) findings.push({ id: p.id, title: p.title, handle: p.handle, status: p.status, issues });
  }

  for (const [, handles] of byTitle) {
    if (handles.length > 1) {
      for (const handle of handles) {
        const f = findings.find((x) => x.handle === handle);
        const issue = { code: 'DUPLICATE_TITLE', detail: `also: ${handles.filter((h) => h !== handle).join(', ')}` };
        if (f) f.issues.push(issue);
        else findings.push({ handle, issues: [issue] });
      }
    }
  }
  return findings;
}

const products = await fetchAll();
const findings = audit(products);
const counts = {};
for (const f of findings) for (const i of f.issues) counts[i.code] = (counts[i.code] || 0) + 1;

console.log(`Audited ${products.length} products. ${findings.length} with at least one issue.\n`);
console.log('Issue counts:');
for (const [code, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(`  ${code.padEnd(30)} ${n}`);

const blocking = findings.filter((f) => f.issues.some((i) => i.code === 'SALE_PRICE_ABOVE_COMPARE' || i.code === 'DUPLICATE_TITLE'));
if (blocking.length) {
  console.log('\nFix before launch (contradictory pricing or duplicates):');
  for (const f of blocking) {
    console.log(`  ${f.handle}`);
    for (const i of f.issues.filter((i) => i.code === 'SALE_PRICE_ABOVE_COMPARE' || i.code === 'DUPLICATE_TITLE')) {
      console.log(`      ${i.code}: ${i.detail}`);
    }
  }
}

if (jsonOut) {
  writeFileSync(jsonOut, JSON.stringify({ audited: products.length, counts, findings }, null, 2));
  console.log(`\nFull report written to ${jsonOut}`);
}
