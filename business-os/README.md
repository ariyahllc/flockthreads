# Business OS — the reusable operating pipeline

One workflow that runs a business end-to-end, as an ordered pipeline of tasks. Built for the
Faith-Apparel T-shirt shop first, but **nothing is hard-coded** — the same pipeline serves every
business you build. You just answer the interview differently each time.

Inspiration: Accio Work's "team of specialist agents, idea → execution" and Creao's "super-agent
that executes + scheduled runs." This is that idea, running on your own Claude Code stack instead
of a locked ecosystem.

## The pipeline (tasks, in order)

```
                ┌─────────────────────────────────────────────────────────────┐
                │  /run-business  →  interview (every run)  →  business-os      │
                └─────────────────────────────────────────────────────────────┘

  PHASE 1 · BOOTSTRAP            PHASE 2 · LAUNCH               PHASE 3 · OPERATE
  (once per business/line)       (per product / campaign)      (recurring — weekly)

  1. Market research        →    5. Product / design brief  →  9.  Orders & fulfillment
     (demand, competitors,       6. Pricing & margin model      (sell / check orders)
      pricing, channels)         7. Listing / store copy    →  10. Customer pulse
  2. Product & positioning  →    8. Campaign plan            →  11. Weekly P&L
  3. Store & brand setup            (run campaign)                (expenses vs income
     (launch-store)           →    · Marketing content            vs profit)
                                     (market the product)     →  12. Next-period plan
                                                                     ↓
                          ┌──────────────────────────────────────────────┐
                          │  REPORT · exec summary + prioritized actions   │
                          │  tagged [today] / [this week] / [this month]   │
                          └──────────────────────────────────────────────┘
```

You can run **any subset** of phases in a given run:
- New business? Run **Bootstrap**.
- New design/drop or seasonal campaign? Run **Launch**.
- Monday morning? Run **Operate** (this is the one to schedule weekly).
- Whole thing for a fresh line? Run all three.

## How to run it

Say **"run the business workflow"** (or `/run-business`). It will:
1. Interview you — which business, which phases, and the details for those phases.
2. Fire the `business-os` workflow (a team of agents, one per task above, running in parallel where
   they can).
3. Save the report to `business-os/reports/` and show you the executive summary + action list.
4. Offer to publish it as a shareable dashboard (Artifact) with a URL.

## Files

| File | What it is |
|---|---|
| `.claude/workflows/business-os.js` | The pipeline engine (the agent team + task order). Reusable, parameterized. |
| `.claude/skills/run-business/SKILL.md` | The interactive launcher — interviews you each run, then runs the engine. |
| `business-os/reports/` | Saved operating reports, one per run. |
| `business-os/<business>.json` (optional) | Saved answers per business, so future runs pre-fill. |

## A note on live data & connectors

The **Operate** phase produces real numbers when you give it data (paste sales/expenses, or connect
your tools). Today, connectors (Shopify / Square / Stripe / QuickBooks / Gmail) aren't authorized in
this session, so if you run Operate with no data it returns ready-to-fill **templates + formulas**
and tells you which connector to wire up. Authorize them via your **claude.ai connector settings**
(or `/mcp` in an interactive Claude Code terminal) and the weekly report starts pulling real figures
automatically.

## Reuse checklist for business #2, #3, …

1. `/run-business`
2. Answer the interview for the new business.
3. (Optional) save the answers as `business-os/<new-business>.json`.
4. Done — same pipeline, new business.
