# Donation receipts

One file per gift, named `<quarter>-<charity-slug>.pdf`, e.g. `2026-q4-compassion.pdf`.

Redact before committing: remove card numbers, bank details, and any personal
address. Keep the charity name, the date, and the amount visible, because those
are the three things the receipt exists to prove.

`scripts/record-gift.js` uploads the file to Shopify Files and stores the public
URL in `../ledger.json`. The local copy stays here so the git history shows the
receipt existed at the time the ledger row was added.

Never replace or delete a receipt that is already referenced by a ledger entry.
If a gift was recorded wrongly, add a correcting entry instead.
