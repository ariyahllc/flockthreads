// Renders the public 1% giving ledger from data/giving/ledger.json.
//
// The ledger is append-only on purpose. Every row on the storefront page comes
// from a committed JSON entry plus a committed receipt, so anyone can check the
// git history and see that no past row was quietly edited. That check is the
// whole point of the page, so nothing here recalculates or infers an amount:
// it only formats what was actually paid.
import { readFile } from "node:fs/promises";

const LEDGER_URL = new URL("../../data/giving/ledger.json", import.meta.url);

export async function loadLedger() {
  return JSON.parse(await readFile(LEDGER_URL, "utf8"));
}

export const money = (n) =>
  "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// "2027-01-15" -> "15 January 2027". Parsed as UTC so the date never shifts back
// a day for anyone west of Greenwich.
export function longDate(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
}

export const totalGiven = (ledger) =>
  (ledger.entries || []).reduce((sum, e) => sum + Number(e.amount_usd || 0), 0);

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const STYLE = `
<style>
.ft-ledger{margin:26px 0;font-family:'Jost',system-ui,sans-serif}
.ft-ledger__total{border:1px solid #e2dbcd;background:#faf8f3;padding:20px 22px;margin-bottom:18px}
.ft-ledger__amount{font-family:'EB Garamond',Georgia,serif;font-size:34px;line-height:1.1;color:#2B2B2B;margin:0}
.ft-ledger__caption{font-size:12px;letter-spacing:.02em;color:#6b665d;margin:6px 0 0;line-height:1.6}
.ft-ledger__wrap{overflow-x:auto}
.ft-ledger table{width:100%;border-collapse:collapse;font-size:14px;min-width:560px}
.ft-ledger th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.14em;color:#8a8377;
  font-weight:400;padding:0 14px 9px 0;border-bottom:1px solid #e2dbcd}
.ft-ledger td{padding:13px 14px 13px 0;border-bottom:1px solid #efe9dd;color:#2B2B2B;vertical-align:top}
.ft-ledger td.ft-ledger__num{white-space:nowrap;font-variant-numeric:tabular-nums}
.ft-ledger a{color:#5F6650}
.ft-ledger__none{border:1px solid #e2dbcd;background:#faf8f3;padding:20px 22px;font-size:14px;
  line-height:1.7;color:#4a463f}
.ft-ledger__none strong{color:#2B2B2B}
</style>`.trim();

function emptyState(pledge) {
  return `${STYLE}
<div class="ft-ledger">
  <div class="ft-ledger__none">
    <p><strong>Nothing given yet.</strong> We opened on ${longDate(pledge.opened)}, so the first
    quarter is still running.</p>
    <p>First payment: <strong>${longDate(pledge.first_payout)}</strong>. This page updates within a
    week of each quarter closing, with the amount, the charity, and the receipt.</p>
    <p>We would rather show you an empty table than a number we have not paid yet.</p>
  </div>
</div>`;
}

export function renderLedger(ledger) {
  const entries = [...(ledger.entries || [])].sort((a, b) => String(b.paid_on).localeCompare(String(a.paid_on)));
  if (!entries.length) return emptyState(ledger.pledge);

  const rows = entries.map((e) => `      <tr>
        <td class="ft-ledger__num">${esc(longDate(e.paid_on))}</td>
        <td>${esc(e.charity)}</td>
        <td class="ft-ledger__num">${esc(money(e.amount_usd))}</td>
        <td class="ft-ledger__num">${e.revenue_basis_usd ? esc(money(e.revenue_basis_usd)) : "&mdash;"}</td>
        <td>${e.receipt_url ? `<a href="${esc(e.receipt_url)}" rel="noopener">Receipt</a>` : "Filed"}</td>
      </tr>`).join("\n");

  const total = totalGiven(ledger);
  const last = entries[0];

  return `${STYLE}
<div class="ft-ledger">
  <div class="ft-ledger__total">
    <p class="ft-ledger__amount">${money(total)}</p>
    <p class="ft-ledger__caption">Given since ${longDate(ledger.pledge.opened)}, across
      ${entries.length} payment${entries.length === 1 ? "" : "s"}.
      Most recent: ${esc(last.charity)} on ${longDate(last.paid_on)}.</p>
  </div>
  <div class="ft-ledger__wrap">
    <table>
      <thead>
        <tr><th>Paid</th><th>Charity</th><th>Amount</th><th>Revenue basis</th><th>Proof</th></tr>
      </thead>
      <tbody>
${rows}
      </tbody>
    </table>
  </div>
</div>`;
}
