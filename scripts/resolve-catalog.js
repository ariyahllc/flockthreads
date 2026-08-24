// Resolves Printful catalog variant IDs for the house blank (Bella 6400) and
// fills printful_variant_map (colorway:size -> variant_id) in data/products.json.
// Run: node --env-file=.env scripts/resolve-catalog.js
import { readFile, writeFile } from "node:fs/promises";
import { dataFileUrl } from "./lib/datafile.js";
import { pf } from "./lib/printful.js";

const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

// Blank comes from the data file: explicit catalog_product_id wins, else the
// 4-digit model number in `blank` (6400 women's, 3001 unisex, ...).
async function findCatalogProductId(defaults) {
  if (defaults.catalog_product_id) {
    const d = await pf(`/products/${defaults.catalog_product_id}`);
    return d.product || { id: defaults.catalog_product_id, title: defaults.blank };
  }
  const match = (defaults.blank || "").match(/\d{4}/)?.[0] || "6400";
  const products = await pf("/products");
  const hit = products.find((p) => norm(p.model).includes(match) || norm(p.title).includes(match));
  if (!hit) throw new Error(`No catalog product matching "${match}". Check blank name.`);
  return hit;
}

async function main() {
  const file = dataFileUrl();
  const data = JSON.parse(await readFile(file, "utf8"));
  const sizes = data.defaults.sizes;

  const colorMap = data.defaults.printful_color_map || {};
  const cat = await findCatalogProductId(data.defaults);
  console.log(`Catalog blank: [${cat.id}] ${cat.title}`);
  const detail = await pf(`/products/${cat.id}`);
  const variants = detail.variants || [];
  console.log(`  ${variants.length} catalog variants available.`);

  // Index catalog variants by color:size (normalized).
  const index = new Map();
  for (const v of variants) index.set(`${norm(v.color)}:${norm(v.size)}`, v.id);

  let matched = 0;
  const missing = [];
  for (const p of data.products) {
    const map = {};
    for (const cw of p.colorways) {
      for (const size of sizes) {
        // Resolve the real Printful color name via the color map, then match.
        const pfColor = colorMap[cw.slug] || cw.label;
        const vid =
          index.get(`${norm(pfColor)}:${norm(size)}`) ??
          index.get(`${norm(cw.slug)}:${norm(size)}`) ??
          index.get(`${norm(cw.label)}:${norm(size)}`);
        if (vid) {
          map[`${cw.slug}:${size}`] = vid;
          matched++;
        } else {
          missing.push(`${p.handle} ${cw.slug}/${cw.label} ${size}`);
        }
      }
    }
    p.printful_variant_map = map;
  }

  await writeFile(file, JSON.stringify(data, null, 2) + "\n");
  console.log(`\nMatched ${matched} variants into printful_variant_map.`);
  if (missing.length) {
    console.log(`UNMATCHED ${missing.length} (color label mismatch — list of available colors below):`);
    console.log("  " + missing.slice(0, 20).join("\n  ") + (missing.length > 20 ? "\n  …" : ""));
    const colors = [...new Set(variants.map((v) => v.color))].sort();
    console.log("\nPrintful colors available for this blank:\n  " + colors.join(" | "));
  } else {
    console.log("All variants resolved. products.json updated.");
  }
}

main().catch((e) => {
  console.error("RESOLVE FAILED:", e.message);
  process.exit(1);
});
