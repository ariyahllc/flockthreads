#!/usr/bin/env python3
"""
Print-ready typographic tee renderer.

Sets type with real fonts instead of an image generator, because AI garbles
letterforms and a broken accent on a sincerity-driven line is a brand defect.

Outputs transparent 300-DPI PNGs sized to a target print width, plus a
side-by-side preview on garment swatches.

Usage:  business-os/design/.venv/bin/python business-os/design/render.py
"""

from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

DPI = 300
ROOT = Path(__file__).parent
FONTS = ROOT / "fonts"
OUT_PRINT = ROOT / "out" / "print"
OUT_PREVIEW = ROOT / "out" / "preview"

# Ink colors — Deep Charcoal, not pure black: reads softer and more expensive.
INK = {
    "charcoal": (0x2B, 0x2B, 0x2B),
    "bone": (0xED, 0xE7, 0xDC),
}

# Garment colors for preview only (approximate Bella+Canvas swatches).
GARMENT = {
    "heather_dust": (0xB9, 0xAF, 0xA2),
    "vintage_white": (0xF2, 0xED, 0xE4),
    "black": (0x1A, 0x1A, 0x1A),
    "heather_olive": (0x6C, 0x6B, 0x55),
}

FONT_MAIN = FONTS / "Spectral-Medium.ttf"
FONT_REF = FONTS / "Spectral-SemiBold.ttf"


def inches(v: float) -> int:
    return int(round(v * DPI))


def track_width(font, text, tracking):
    """Width of text drawn char-by-char with letterspacing."""
    if not text:
        return 0
    w = sum(font.getlength(c) for c in text)
    return int(round(w + tracking * (len(text) - 1)))


def draw_tracked(draw, xy, text, font, fill, tracking=0):
    """Pillow has no letterspacing; advance per glyph manually."""
    x, y = xy
    for c in text:
        draw.text((x, y), c, font=font, fill=fill)
        x += font.getlength(c) + tracking


def fit_font(path, lines, target_px, tracking=0):
    """Binary-search the point size so the widest line hits target_px."""
    lo, hi = 8, 800
    best = lo
    while lo <= hi:
        mid = (lo + hi) // 2
        f = ImageFont.truetype(str(path), mid)
        widest = max(track_width(f, ln, tracking) for ln in lines)
        if widest <= target_px:
            best, lo = mid, mid + 1
        else:
            hi = mid - 1
    return ImageFont.truetype(str(path), best)


def render_design(d, ink_name="charcoal"):
    """Render one design to a tight-cropped transparent 300-DPI PNG."""
    ink = INK[ink_name]
    target_px = inches(d["width_in"])
    lines = d["lines"]

    font = fit_font(FONT_MAIN, lines, target_px)
    ascent, descent = font.getmetrics()
    line_h = ascent + descent
    leading = int(line_h * d.get("leading", 1.12))

    ref = d.get("ref")
    ref_font = None
    ref_tracking = 0
    ref_h = 0
    if ref:
        # Reference line sits ~22% of the main cap height, generously tracked.
        ref_size = max(10, int(font.size * d.get("ref_scale", 0.26)))
        ref_font = ImageFont.truetype(str(FONT_REF), ref_size)
        ref_tracking = ref_size * 0.18
        ref_h = int(ref_font.getmetrics()[0] + ref_font.getmetrics()[1] + font.size * 0.55)

    pad = int(font.size * 0.35)
    block_h = leading * len(lines) + ref_h
    W = target_px + pad * 2
    H = block_h + pad * 2

    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    align = d.get("align", "center")
    y = pad
    for ln in lines:
        w = int(font.getlength(ln))
        x = pad if align == "left" else pad + (target_px - w) // 2
        draw.text((x, y), ln, font=font, fill=ink)
        y += leading

    if ref:
        y += int(font.size * 0.30)
        rw = track_width(ref_font, ref, ref_tracking)
        x = pad if align == "left" else pad + (target_px - rw) // 2
        draw_tracked(draw, (x, y), ref, ref_font, ink, ref_tracking)

    # Tight-crop to the actual marks, then re-pad evenly.
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        bleed = int(DPI * 0.08)
        canvas = Image.new("RGBA", (img.width + bleed * 2, img.height + bleed * 2), (0, 0, 0, 0))
        canvas.paste(img, (bleed, bleed), img)
        img = canvas

    return img


def preview_tile(art, garment_key, label, tile_w=1000, tile_h=1150):
    """Composite art onto a garment-colored swatch for eyeballing."""
    tile = Image.new("RGB", (tile_w, tile_h), GARMENT[garment_key])
    scale = min((tile_w * 0.74) / art.width, (tile_h * 0.52) / art.height)
    a = art.resize((max(1, int(art.width * scale)), max(1, int(art.height * scale))), Image.LANCZOS)
    tile.paste(a, ((tile_w - a.width) // 2, int(tile_h * 0.30)), a)

    d = ImageDraw.Draw(tile)
    lf = ImageFont.truetype(str(FONT_REF), 34)
    tw = d.textlength(label, font=lf)
    # Label in a contrasting tone against the swatch.
    lab = (0x33, 0x33, 0x33) if garment_key != "black" else (0xDD, 0xDD, 0xDD)
    d.text(((tile_w - tw) // 2, int(tile_h * 0.90)), label, font=lf, fill=lab)
    return tile


# ---------------------------------------------------------------------------
# The pair device: the punchline lives on the second garment.
# Proverbs 18:22 in the KJV is public domain — no translation licensing.
# ---------------------------------------------------------------------------

HIS = {
    "id": "CPL_his_findeth",
    "lines": ["whoso findeth a wife", "findeth a good thing"],
    "ref": "PROV. 18:22",
    "width_in": 9.0,
    "align": "center",
}

PAIRS = {
    "A": {
        "label": "Version A — completes the verse",
        "his": HIS,
        "hers": {
            "id": "CPL_hers_favour",
            "lines": ["favour of the LORD"],
            "ref": "PROV. 18:22",
            "width_in": 8.0,
            "align": "center",
        },
    },
    "B": {
        "label": "Version B — she gets the punchline",
        "his": HIS,
        "hers": {
            "id": "CPL_hers_foundfirst",
            "lines": ["she found him first"],
            "width_in": 8.0,
            "align": "center",
        },
    },
}


def main():
    OUT_PRINT.mkdir(parents=True, exist_ok=True)
    OUT_PREVIEW.mkdir(parents=True, exist_ok=True)

    rendered = {}
    for ver, pair in PAIRS.items():
        for role in ("his", "hers"):
            d = pair[role]
            for ink_name in ("charcoal", "bone"):
                art = render_design(d, ink_name)
                name = f"{d['id']}_{ink_name}_front.png"
                path = OUT_PRINT / name
                art.save(path, dpi=(DPI, DPI))
                if ink_name == "charcoal":
                    rendered[(ver, role)] = art
                print(f"  {name:44} {art.width}x{art.height}px  "
                      f"({art.width/DPI:.2f}\" x {art.height/DPI:.2f}\" @ {DPI}dpi)")

    # Two-up comparison sheet: each row is a pair, read left-to-right.
    tiles = []
    for ver in ("A", "B"):
        row = [
            preview_tile(rendered[(ver, "his")], "heather_dust", "HIS"),
            preview_tile(rendered[(ver, "hers")], "vintage_white", "HERS"),
        ]
        tiles.append((PAIRS[ver]["label"], row))

    gap, head = 40, 90
    tw, th = tiles[0][1][0].width, tiles[0][1][0].height
    W = tw * 2 + gap * 3
    H = (th + head) * len(tiles) + gap * (len(tiles) + 1)
    sheet = Image.new("RGB", (W, H), (0xFA, 0xF8, 0xF5))
    d = ImageDraw.Draw(sheet)
    hf = ImageFont.truetype(str(FONT_REF), 40)

    y = gap
    for label, row in tiles:
        d.text((gap, y + 20), label, font=hf, fill=(0x2B, 0x2B, 0x2B))
        y += head
        x = gap
        for t in row:
            sheet.paste(t, (x, y))
            x += tw + gap
        y += th + gap

    out = OUT_PREVIEW / "couples_pair_comparison.png"
    sheet.save(out, dpi=(DPI, DPI))
    print(f"\n  preview -> {out}  ({sheet.width}x{sheet.height})")


if __name__ == "__main__":
    main()
