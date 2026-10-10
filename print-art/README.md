# FlockThreads Print Art Generator

Reusable design system for FlockThreads print-on-demand artwork.
Generates production-ready **4500×5400px transparent PNGs at 300 DPI** —
the exact spec Printful DTG needs. No AI art: all typography is real
vector-rendered text, so lettering prints razor-sharp.

## Quick start

```bash
cd print-art

# 1. One-time: fetch the script font (OFL-licensed, free)
mkdir -p fonts output
curl -sL -o fonts/GreatVibes-Regular.ttf \
  "https://github.com/google/fonts/raw/main/ofl/greatvibes/GreatVibes-Regular.ttf"

# 2. Install Pillow
pip install pillow

# 3. Render all 26 designs x 2 ink colors (52 files) into ./output/
python3 batch-print.py
```

System fonts used (present on most Linux/macOS machines):
DejaVu Serif Bold, DejaVu Serif, DejaVu Sans Bold.

## Design language

- **Masculine** (`masculine()`): bold serif capitals, letterspaced, hand-drawn
  cross mark above, verse reference below. No florals.
- **Feminine** (`feminine()`): Great Vibes script line over serif capitals,
  hand-drawn laurel wreath with berries around the lockup.
- **Youth** (`youth()`): bold rounded sans with a simple line doodle
  (pumpkin, star).

## Ink colors

Every design renders in two inks — pick per garment color:

| Ink | RGB | Use on |
|-----|-----|--------|
| Cream | 246, 239, 221 | dark garments: Black, Navy, Dark Grey, Forest, Brown, Burnt Orange, Red |
| Espresso | 62, 53, 44 | light garments: White, Vintage White, Natural, Sage, Mauve, Pink, Mustard |

## Current catalog (2026-10-10)

12 masculine, 12 feminine, 2 youth = 26 designs:

- It Is Well (M/W) — $32.99
- Better Together couples pairs x7 (his/hers): Beloved's, Good Thing
  (Prov 18:22), Two Are Better, Love Is Patient/Kind, My House,
  Equally Yoked, Love Your Wife / Respect Your Husband — $29.99
- Gathered in Grace holiday: Give Thanks family set, Blessed/Grateful,
  Christmas family set, New Mercies (New Year) — $29.99 / $24.99 youth

## Files

- `print_art.py` — the design system (canvas, type, wreath, cross, doodles)
- `batch-print.py` — renders the full 26-design catalog
- `fonts/` — GreatVibes-Regular.ttf lives here after step 1
- `output/` — rendered PNGs land here (git-ignored)
