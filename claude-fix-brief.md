# FlockThreads Website Fixes — paste to Claude Code
Repo: the `shopify` branch of github.com/ariyahllc/flockthreads (theme at branch root).
Site: flockthreads.com (Shopify, custom theme built on Horizon 4.1.4).

## 1. Homepage "NEW THIS SEASON" placeholder grid (HIGHEST PRIORITY)
The section titled "NEW THIS SEASON / Quiet pieces, worn often" renders 4 dead cards
reading "Product title" with "$19.99" and gray placeholder boxes, not linked to any product.
- Either wire it to a real collection (e.g. a "New arrivals" collection or the Holiday Shop),
  or delete the section entirely. Do not leave placeholder cards on the live homepage.

## 2. Homepage SEO basics
- Page title: change from "FlockThreads" to "FlockThreads | Faith-Based Christian T-Shirts"
- Add a meta description (currently missing entirely):
  "Faith you'll actually wear. Scripture-based tees designed his & hers on soft
  Airlume cotton — It Is Well, Better Together couples' sets, Thanksgiving and
  Christmas collections."
- Favicon: currently 404s. Upload `flockthreads-favicon-512.png` (provided separately)
  as the theme favicon so browsers and tabs show the brand cross mark.

## 3. Tracking — install before any ad spend
- Add Google Analytics 4 (gtag.js) to the theme head.
- Add the Meta Pixel (fbevents.js) to the theme head.
- The store owner will supply the GA4 measurement ID and Pixel ID — scaffold the
  snippets with clearly-marked placeholder IDs at the top of the snippet file so he
  can paste them in once.

## 4. Email capture (currently none on the site)
- Add a newsletter signup to the footer (email field + button, wired to Shopify email).
- Add a welcome-discount popup (e.g. 10% off first order) that appears once per visitor.
  Keep it on-brand: headline "Faith you'll actually wear.", subline "Get 10% off your
  first order plus early access to new verse drops."

## 5. Footer additions
- Add social profile links: Instagram https://www.instagram.com/flockthreads
  (TikTok to be added later once the account exists).
- Add an About / brand-story link. If no /pages/about exists, create the page with this copy:
  "FlockThreads — faith you'll actually wear. Scripture-based tees designed his & hers,
  never one boxy fit for everyone. Soft Airlume cotton, quiet detailing, a verse where
  only you will find it. Made for Sundays and every day after."

## 6. Product page recommendations
On product pages the "You may also like" block gets stuck on "Loading product
recommendations". Fix or reconfigure it so related products actually render.

## Out of scope for Claude (Dinesh does these in Shopify admin)
- Supplying the GA4 measurement ID and Meta Pixel ID.
- Connecting Instagram/Facebook sales channel for shopping tags.
- Creating a TikTok account (@flockthreads) — pending.
