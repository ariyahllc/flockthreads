// Builds store CONTENT programmatically: pages (and later collections/menus).
// Idempotent — safe to re-run. Run: npm run build:store
import { readFile, readdir } from "node:fs/promises";
import { join, basename } from "node:path";
import { upsertPage } from "./lib/shopify.js";

const PAGES_DIR = new URL("../data/pages/", import.meta.url);

// Pull optional "---\ntitle: X\n---" front matter off the top of a page file.
function frontMatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { meta: {}, body: md };
  const meta = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { meta, body: md.slice(m[0].length) };
}

// Inline markdown: bold, italic, links, code.
function inline(t) {
  return t
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

// Very small md -> html. Real build can swap in a proper markdown lib later.
function mdToHtml(md) {
  return md
    .replace(/^<!--[\s\S]*?-->\s*/g, "") // strip leading HTML comment block
    .split(/\n{2,}/)
    .map((block) => {
      const t = block.trim();
      if (!t) return "";
      if (t.startsWith("# ")) return `<h1>${inline(t.slice(2))}</h1>`;
      if (t.startsWith("## ")) return `<h2>${inline(t.slice(3))}</h2>`;
      if (t.startsWith("- ")) {
        const items = t.split("\n").map((l) => `<li>${inline(l.replace(/^- /, ""))}</li>`).join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${inline(t.replace(/\n/g, "<br>"))}</p>`;
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
    const raw = await readFile(join(PAGES_DIR.pathname, file), "utf8");
    const { meta, body: md } = frontMatter(raw);
    const handle = basename(file, ".md");
    const title = meta.title || basename(file, ".md");
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
