#!/usr/bin/env node
/*
  Creates the SaahVay metafield definitions the theme reads.
  Safe to re-run: definitions that already exist are skipped.

  Usage:
    SHOPIFY_STORE=your-store.myshopify.com SHOPIFY_ADMIN_TOKEN=shpat_... node scripts/setup-metafields.mjs
    add --dry-run to print what would be created without calling the API.

  The token needs write_products (product definitions) and write_metaobject_definitions is
  not required. Collection definitions need write_products as well.
*/

const store = process.env.SHOPIFY_STORE;
const token = process.env.SHOPIFY_ADMIN_TOKEN;
const apiVersion = process.env.SHOPIFY_API_VERSION || '2025-07';
const dryRun = process.argv.includes('--dry-run');

const SHAPE_CHOICES = JSON.stringify({ choices: ['H', 'O', 'V', 'X', 'A'] });

export const definitions = [
  // Products
  { ownerType: 'PRODUCT', namespace: 'saahvay', key: 'shapes_primary', name: 'Shapes: selected for', type: 'list.single_line_text_field', description: 'Body shapes this piece is selected for. Letters H, O, V, X, A.', validations: [{ name: 'choices', value: SHAPE_CHOICES }], pin: true },
  { ownerType: 'PRODUCT', namespace: 'saahvay', key: 'shapes_secondary', name: 'Shapes: also works for', type: 'list.single_line_text_field', description: 'Body shapes this piece also works well for.', validations: [{ name: 'choices', value: SHAPE_CHOICES }], pin: true },
  { ownerType: 'PRODUCT', namespace: 'saahvay', key: 'why_it_works', name: 'Why it works', type: 'multi_line_text_field', description: 'One sentence per recommended shape. Use "selected for" or "designed to complement", never guarantees.', pin: true },
  { ownerType: 'PRODUCT', namespace: 'saahvay', key: 'fit_notes', name: 'Fit notes', type: 'multi_line_text_field', description: 'How it fits: true to size, stretch, length in cm on a named size.', pin: true },
  { ownerType: 'PRODUCT', namespace: 'saahvay', key: 'model_info', name: 'Model info', type: 'single_line_text_field', description: 'Example: Model is 175 cm and wears size M.', pin: true },
  { ownerType: 'PRODUCT', namespace: 'saahvay', key: 'fabric_care', name: 'Fabric and care', type: 'multi_line_text_field', description: 'Composition and care instructions.', pin: true },
  { ownerType: 'PRODUCT', namespace: 'saahvay', key: 'outfit_products', name: 'Outfit pieces', type: 'list.product_reference', description: 'For outfit (complete look) products only: the pieces that make up the look.', pin: true },
  { ownerType: 'PRODUCT', namespace: 'saahvay', key: 'publish_ready', name: 'Publish ready', type: 'boolean', description: 'Set to true only when title, description, images, shapes, and pricing have been checked.', pin: true },
  // Collections
  { ownerType: 'COLLECTION', namespace: 'saahvay', key: 'shape_letter', name: 'Shape letter', type: 'single_line_text_field', description: 'H, O, V, X, or A. Makes this collection a shape page.', validations: [{ name: 'choices', value: SHAPE_CHOICES }], pin: true },
  { ownerType: 'COLLECTION', namespace: 'saahvay', key: 'guide_intro', name: 'Shape guide intro', type: 'rich_text_field', description: 'Two or three lines shown above the product grid on a shape page.', pin: true },
  { ownerType: 'COLLECTION', namespace: 'saahvay', key: 'principles', name: 'Styling principles', type: 'list.single_line_text_field', description: 'Three short principles shown on the shape page.', pin: true },
  { ownerType: 'COLLECTION', namespace: 'saahvay', key: 'outfits_collection', name: 'Outfits collection', type: 'collection_reference', description: 'Collection of complete looks for this shape.', pin: true },
];

const MUTATION = `
  mutation Create($definition: MetafieldDefinitionInput!) {
    metafieldDefinitionCreate(definition: $definition) {
      createdDefinition { id name }
      userErrors { field message code }
    }
  }
`;

async function create(def) {
  const input = {
    ownerType: def.ownerType,
    namespace: def.namespace,
    key: def.key,
    name: def.name,
    type: def.type,
    description: def.description,
    pin: def.pin,
    validations: def.validations || [],
    access: { storefront: 'PUBLIC_READ' },
  };
  const response = await fetch(`https://${store}/admin/api/${apiVersion}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query: MUTATION, variables: { definition: input } }),
  });
  const body = await response.json();
  if (body.errors) throw new Error(JSON.stringify(body.errors));
  const result = body.data.metafieldDefinitionCreate;
  const taken = result.userErrors.find((e) => e.code === 'TAKEN');
  if (taken) return 'exists';
  if (result.userErrors.length) throw new Error(`${def.ownerType} ${def.key}: ${result.userErrors.map((e) => e.message).join('; ')}`);
  return 'created';
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!dryRun && (!store || !token)) {
    console.error('Set SHOPIFY_STORE and SHOPIFY_ADMIN_TOKEN, or pass --dry-run.');
    process.exit(1);
  }
  for (const def of definitions) {
    const label = `${def.ownerType.toLowerCase()}.${def.namespace}.${def.key} (${def.type})`;
    if (dryRun) {
      console.log(`would create ${label}`);
      continue;
    }
    const outcome = await create(def);
    console.log(`${outcome.padEnd(8)} ${label}`);
  }
}
