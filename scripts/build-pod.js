// Creates Printful sync products from data/products.json and pushes them to Shopify.
// Uploads each print file to Shopify Files first, then POST /store/products.
//
// Usage:
//   node --env-file=.env scripts/build-pod.js              # DRY: first product only, prints payload
//   node --env-file=.env scripts/build-pod.js only=amen-again
//   node --env-file=.env scripts/build-pod.js commit only=called-to-this   # create ONE for real
//   node --env-file=.env scripts/build-pod.js commit all                   # create all
import { readFile } from "node:fs/promises";
import { pf } from "./lib/printful.js";
import { uploadImage } from "./lib/shopify-files.js";

const args = process.argv.slice(2);
const COMMIT = args.includes("commit");
const ALL = args.includes("all");
const ONLY = (args.find((a) => a.startsWith("only=")) || "").split("=")[1];

async function existingNames() {
  const list = await pf("/store/products");
  return new Set(list.map((p) => p.name));
}

function buildPayload(p, price, artUrls) {
  const sync_variants = [];
  for (const [key, variant_id] of Object.entries(p.printful_variant_map)) {
    const slug = key.split(":")[0];
    sync_variants.push({
      variant_id,
      retail_price: price.toFixed(2),
      files: [{ type: "default", url: artUrls[slug] }],
    });
  }
  return { sync_product: { name: p.title }, sync_variants };
}

async function main() {
  const data = JSON.parse(await readFile(new URL("../data/products.json", import.meta.url), "utf8"));
  const price = data.defaults.price;

  let targets = data.products;
  if (ONLY) targets = targets.filter((p) => p.handle === ONLY);
  else if (!ALL) targets = targets.slice(0, 1); // safe default: first only

  console.log(`Mode: ${COMMIT ? "COMMIT" : "DRY"} | targets: ${targets.map((t) => t.handle).join(", ")}\n`);

  const taken = COMMIT ? await existingNames() : new Set();

  for (const p of targets) {
    const expected = (p.colorways.length) * data.defaults.sizes.length;
    const mapped = Object.keys(p.printful_variant_map).length;
    if (mapped < expected) { console.error(`  SKIP ${p.handle}: variant map ${mapped}/${expected} — run resolve-catalog.js`); continue; }
    if (COMMIT && taken.has(p.title)) { console.log(`  exists, skip: ${p.title}`); continue; }

    // Upload one art file per colorway (cached, deduped).
    const artUrls = {};
    for (const cw of p.colorways) {
      process.stdout.write(`  upload ${cw.slug} … `);
      artUrls[cw.slug] = await uploadImage(cw.print_file);
      console.log("ok");
    }

    const payload = buildPayload(p, price, artUrls);
    if (!COMMIT) {
      console.log(`  DRY payload for ${p.handle}: ${payload.sync_variants.length} variants @ $${price}`);
      console.log("  " + JSON.stringify(payload.sync_variants[0], null, 0));
      continue;
    }
    const res = await pf("/store/products", { method: "POST", body: payload });
    console.log(`  CREATED ${p.title} (printful sync id ${res.id})`);
  }
  console.log(COMMIT ? "\nDone. Check Printful + Shopify products." : "\nDry run complete. Add 'commit' to create.");
}

main().catch((e) => { console.error("BUILD FAILED:", e.message); process.exit(1); });
