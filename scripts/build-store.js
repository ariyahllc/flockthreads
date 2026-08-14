// Builds store CONTENT programmatically: pages (and later collections/menus).
// Idempotent — safe to re-run. Run: npm run build:store
import { readFile, readdir } from "node:fs/promises";
import { join, basename } from "node:path";
import { upsertPage } from "./lib/shopify.js";

const PAGES_DIR = new URL("../data/pages/", import.meta.url);

// Very small md -> html. Real build can swap in a proper markdown lib later.
function mdToHtml(md) {
  return md
    .replace(/^<!--[\s\S]*?-->\s*/g, "") // strip leading HTML comment block
    .split(/\n{2,}/)
    .map((block) => {
      const t = block.trim();
      if (!t) return "";
      if (t.startsWith("# ")) return `<h1>${t.slice(2)}</h1>`;
      if (t.startsWith("## ")) return `<h2>${t.slice(3)}</h2>`;
      if (t.startsWith("- ")) {
        const items = t.split("\n").map((l) => `<li>${l.replace(/^- /, "")}</li>`).join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${t.replace(/\n/g, "<br>")}</p>`;
    })
    .join("\n");
}

async function main() {
  const files = (await readdir(PAGES_DIR)).filter((f) => f.endsWith(".md"));
  if (!files.length) {
    console.log("No pages in data/pages/. Nothing to build.");
    return;
  }
  for (const file of files) {
    const md = await readFile(join(PAGES_DIR.pathname, file), "utf8");
    const titleLine = md.split("\n").find((l) => l.startsWith("# "));
    const title = titleLine ? titleLine.slice(2).trim() : basename(file, ".md");
    const handle = basename(file, ".md");
    const body = mdToHtml(md);
    const r = await upsertPage({ handle, title, body });
    console.log(`  page ${r.action}: /${r.handle}`);
  }
  console.log("Store content build complete.");
}

main().catch((e) => {
  console.error("BUILD FAILED:", e.message);
  process.exit(1);
});
