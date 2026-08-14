# Design renderer

Turns the launch phase's Product & Design Brief into print-ready typographic art.

```bash
node render.js              # width-based: each design at its specced print width
node render.js --normalize  # capsule mode: one type size + per-design multipliers  <- current direction
```

Outputs to `out/`:

| Path | What |
|---|---|
| `print-normalized/` | **Canonical.** 18 print files — transparent PNG, 1200×1200 @300dpi |
| `print/` | Width-based render (superseded — kept for comparison) |
| `contact-sheet-normalized.png` | Review grid on garment swatches |

## Why type is never AI-generated

Brief §4: image generators garble letterforms. A broken `amén` or a mangled
`Prov. 31:25` is a brand defect on a line whose whole proposition is sincerity.
Type here is set from real font outlines and rasterized — deterministic and
reproducible. AI belongs in mockup/lifestyle imagery only.

## Decisions encoded here

**Scaling — hybrid.** Width-based scaling made type size swing 3× across the
capsule (short copy → giant type), so the pieces didn't read as a family and the
hero contradicted the brand's "subtle over loud" rule. Normalised scaling fixes
one body size (107px) and lets print width float; `scaleMultiplier` then gives
the hero deliberate emphasis (Called at 1.4× → 1.43" wide).

**Stroke floor.** `refMinPx` is an absolute floor, not a ratio. The `PROV. 31:25`
line first rendered at 0.96pt — under the brief's 1.5pt DTG minimum — and would
have broken up on heather blends. Because the floor binds, the ref stops scaling
with the body, and on the shorter Spanish line it dominated the glyph population
and pinned that design at 1.44pt. 76px clears every design at 1.68pt.

**Stroke check is a guard rail, not a proof.** It scans horizontal runs of opaque
pixels and reports a low percentile, so glyph tips and terminals read as "thin"
and it under-reports true stem width. It catches real defects; it does not
replace a physical sample.

## Open gates before commercial print

- **Font licensing.** Spectral (OFL) is a stand-in for the brief's picks
  (Untitled Serif / Freight Text Pro / Tiempos Text / GT Sectra). Those need an
  extended merch licence, ~$50–300. Swap `typography.weightFile` and re-run.
- **Physical sample.** The 1.4× hero multiplier and the enlarged reference line
  are screen judgements. Confirm both on a real garment.
- **Garment swatch hexes** in `designs.json` are screen approximations for the
  contact sheet only — never used in print files.
