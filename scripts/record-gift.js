// Appends one gift to the public giving ledger, uploads its receipt, and
// refuses to touch anything already recorded.
//
//   node --env-file=.env scripts/record-gift.js \
//     --paid=2027-01-15 --quarter=2026-Q4 --charity="Compassion International" \
//     --amount=412.50 --revenue=41250 --receipt=data/giving/receipts/2026-q4-compassion.pdf
//
// Append-only is the entire value of the page, so this script never rewrites an
// existing entry. A wrong row is corrected by adding another row, which leaves
// both visible in git history.
import { readFile, writeFile, access } from "node:fs/promises";
import { uploadFile } from "./lib/shopify-files.js";
import { money, longDate } from "./lib/giving.js";

const LEDGER = new URL("../data/giving/ledger.json", import.meta.url);

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => {
    const i = a.indexOf("=");
    return i > 0 ? [a.slice(2, i), a.slice(i + 1)] : [a.slice(2), true];
  })
);

const need = (k) => {
  if (!args[k]) throw new Error(`Missing --${k}`);
  return args[k];
};

const paid = need("paid");
if (!/^\d{4}-\d{2}-\d{2}$/.test(paid)) throw new Error(`--paid must be YYYY-MM-DD, got "${paid}"`);

const charity = need("charity");
const amount = Number(need("amount"));
if (!Number.isFinite(amount) || amount <= 0) throw new Error(`--amount must be a positive number`);
const revenue = args.revenue ? Number(args.revenue) : null;
if (revenue !== null && (!Number.isFinite(revenue) || revenue <= 0)) {
  throw new Error(`--revenue must be a positive number`);
}

const ledger = JSON.parse(await readFile(LEDGER, "utf8"));
ledger.entries ||= [];

// Same charity paid on the same day is almost certainly a double-run.
const dup = ledger.entries.find((e) => e.paid_on === paid && e.charity === charity);
if (dup) {
  console.error(`Already recorded: ${charity} on ${paid} for ${money(dup.amount_usd)}.`);
  console.error(`Ledger is append-only. To correct it, add a new row with a different --paid date.`);
  process.exit(1);
}

let receipt_url = args["receipt-url"] || null;
if (args.receipt) {
  await access(args.receipt); // fail loudly before we mutate the ledger
  console.log(`Uploading receipt ${args.receipt} ...`);
  receipt_url = await uploadFile(args.receipt, "application/pdf");
  console.log(`  ${receipt_url}`);
} else if (!receipt_url) {
  console.warn(`No --receipt given. Row will show "Filed" with no link.`);
}

ledger.entries.push({
  paid_on: paid,
  quarter: args.quarter || null,
  charity,
  amount_usd: Number(amount.toFixed(2)),
  revenue_basis_usd: revenue === null ? null : Number(revenue.toFixed(2)),
  receipt: args.receipt || null,
  receipt_url,
  note: args.note || "",
});

await writeFile(LEDGER, JSON.stringify(ledger, null, 2) + "\n");

const total = ledger.entries.reduce((s, e) => s + Number(e.amount_usd || 0), 0);
console.log(`\nRecorded ${money(amount)} to ${charity}, paid ${longDate(paid)}.`);
console.log(`Ledger total is now ${money(total)} across ${ledger.entries.length} payments.`);
console.log(`\nNext: commit data/giving/, then \`npm run build:store\` to publish the page.`);
