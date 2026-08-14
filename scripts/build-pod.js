// Creates POD products (Printful) from data/products.json and syncs to Shopify.
// Idempotent by handle. Run: npm run build:pod
//
// NOTE: skeleton. Fills in once wash-test picks the provider and printful_variant_map
// is populated per product. Guards against half-configured data so it fails loud, not silent.
import { readFile } from "node:fs/promises";

const PROVIDER = process.env.POD_PROVIDER || "printful";

async function main() {
  const raw = await readFile(new URL("../data/products.json", import.meta.url), "utf8");
  const { products, defaults = {} } = JSON.parse(raw);
  const real = products.filter((p) => !p.handle.startsWith("example-"));

  if (!real.length) {
    console.log("No real products in data/products.json.");
    return;
  }
  if (PROVIDER !== "printful") {
    console.log(`POD_PROVIDER=${PROVIDER} not wired yet (only printful).`);
    return;
  }

  const sizes = defaults.sizes || [];
  let blocked = 0;
  for (const p of real) {
    const price = p.price ?? defaults.price;
    const expectedVariants = (p.colorways?.length || 0) * sizes.length;
    if (price == null) { console.error(`  BLOCK ${p.handle}: no price`); blocked++; continue; }
    const mapped = Object.keys(p.printful_variant_map || {}).length;
    if (mapped < expectedVariants) {
      console.error(`  BLOCK ${p.handle}: variant map ${mapped}/${expectedVariants} — run catalog resolve first (needs PRINTFUL_TOKEN)`);
      blocked++;
      continue;
    }
    // Ready: create sync product -> Printful pushes it to the connected Shopify store.
    console.log(`  would create: ${p.handle} @ $${price} (${expectedVariants} variants)`);
    // await pf("/store/products", { method: "POST", body: buildSyncProduct(p, defaults) });
  }
  if (blocked) {
    console.log(`\n${blocked}/${real.length} products blocked on variant maps.`);
    console.log("Next: fetch Printful catalog IDs for Bella 6400 (color x size) and fill printful_variant_map.");
  } else {
    console.log("POD build complete.");
  }
}

main().catch((e) => {
  console.error("BUILD FAILED:", e.message);
  process.exit(1);
});
