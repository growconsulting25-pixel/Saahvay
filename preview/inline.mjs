// Produces a single self-contained copy of the preview with every photo inlined as a data URI.
// Usage: node preview/inline.mjs [out.html]   (default: preview/saahvay-preview.inline.html)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, 'saahvay-preview.html');
const out = resolve(process.argv[2] || resolve(here, 'saahvay-preview.inline.html'));

const cache = new Map();
const dataUri = (file) => {
  if (!cache.has(file)) {
    cache.set(file, 'data:image/webp;base64,' + readFileSync(resolve(here, 'img', file)).toString('base64'));
  }
  return cache.get(file);
};

const html = readFileSync(src, 'utf8').replace(/(["'])img\/([\w.-]+\.webp)\1/g, (m, q, file) => q + dataUri(file) + q);
writeFileSync(out, html);
console.log(`${out}: ${(html.length / 1024).toFixed(0)} KB, ${cache.size} images inlined`);
