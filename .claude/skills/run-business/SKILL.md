---
name: run-business
description: Interactive launcher for the reusable business-os pipeline. Interviews the owner about the business and which phase(s) to run (Bootstrap / Launch / Operate), then runs the business-os workflow and delivers the operating report. Use when the owner says "run the business workflow", "launch a business", "run the pipeline", "do a weekly report", "launch a new product", or names any business to operate.
---

# Run Business — interactive launcher for `business-os`

This skill is the front door to the reusable `business-os` workflow. The workflow itself is
deterministic and headless, so **all interactivity lives here**: you interview the owner, build the
`args`, run the pipeline, and deliver the report. The same skill serves every business — a t-shirt
shop today, anything else tomorrow. Nothing is hard-coded to a specific business.

## Step 1 — Interview the owner (ALWAYS, every run)

Use the `AskUserQuestion` tool. Ask in this order; keep it to 2–3 screens, don't over-ask.

1. **Which business & which phases?**
   - Business: free text (offer the last-used one if you know it, e.g. "Faith-Apparel T-Shirt Shop").
   - Phases to run this time (multi-select): **Bootstrap** (research → product → store plan),
     **Launch** (new product/campaign go-to-market kit), **Operate** (orders + customer pulse +
     weekly P&L + next-period plan). They may pick one, two, or all three.

2. **Business profile** — only ask for fields you don't already know from context/files
   (e.g. `tshirt-shop-launch-brief.md`). Collect: one-liner, model/fulfillment, channels,
   products/lines, target customer, price range, brand voice, differentiators, notes.
   If a launch brief or config file exists, pre-fill from it and just confirm.

3. **Phase-specific follow-ups** (only for the phases they chose):
   - If **Launch**: product/design idea, occasion/timing, target volume, any notes.
   - If **Operate**: lookback window (default 7 days), and — since live connectors may not be
     authorized — ask them to paste or point to sales / orders / expenses data. If they have none,
     tell them the Operate phase will return ready-to-fill templates + the connectors to wire up.

Confirm the assembled picture back to the owner in one short summary before launching.

## Step 2 — Build `args` and run the workflow

Assemble this object (omit unknown fields rather than guessing):

```js
{
  date: "<today's date, e.g. 2026-07-11>",   // pass it in; the script cannot read the clock
  business: { name, oneLiner, model, channels, products, targetCustomer, priceRange, brandVoice, differentiators, notes },
  phases: ["bootstrap","launch","operate"],   // only the chosen ones
  launch:  { productIdea, occasion, quantity, notes },        // only if 'launch' chosen
  operate: { lookbackDays, salesData, expensesData, ordersData } // only if 'operate' chosen
}
```

Then launch it:

```
Workflow({ name: "business-os", args: <the object above> })
```

The owner invoking this skill IS the opt-in to run a workflow. Tell them roughly how many agents
will run (bootstrap ≈ 7, launch ≈ 6, operate ≈ 5, plus 1 report) so cost is no surprise, then run it.

## Step 3 — Deliver the result

The workflow returns `{ report, execSummary, phasesRun, sectionTitles }`.

1. Write `report` to `business-os/reports/<business-slug>-<phases>-<date>.md`.
2. Show the owner the **executive summary + action list** inline (that's the top of `report`).
3. Offer to publish the report as a shareable **Artifact dashboard** (a hosted page with a URL) —
   this is the "productized" deliverable, comparable to what Creao/Accio show. Only publish on a yes.
4. If any Operate section came back as a template (no data), remind them which connectors to
   authorize (Shopify/Square/Stripe/QuickBooks/Gmail via claude.ai connector settings or `/mcp`)
   to make the next weekly run pull real numbers automatically.

## Reusing for a new business

Nothing changes — just answer the Step 1 interview for the new business. Optionally save the
answers as `business-os/<business-slug>.json` so future runs pre-fill instead of re-interviewing.

## Scheduling the Operate phase

The Operate phase is the recurring engine. If the owner wants it weekly, offer to set up a
scheduled routine (via the `schedule` skill) that runs `business-os` with `phases:["operate"]`
every Monday and posts the report.
