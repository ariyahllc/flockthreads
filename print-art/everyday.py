"""Everyday faith tees: bold illustration + big headline + verse reference.

Input : print-art/illustrations/<key>.png (black art on white, from Recraft via ElevenLabs)
Output: print-art/print-ready/<key>-cream.png and <key>-espresso.png
        Transparent, 300 dpi, 3000 px (10 in) wide, cropped tight. Cream prints on dark
        shirts, espresso on light ones (same inks as print_art.py).
Run   : python print-art/everyday.py   (needs Pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
HEAD = os.path.join(HERE, "fonts/BebasNeue-Regular.ttf")
REF = os.path.join(ROOT, "business-os/design/fonts/Spectral-SemiBold.ttf")
INKS = {"cream": (246, 239, 221), "espresso": (62, 53, 44)}
W = 3000  # 10 in at 300 dpi

DESIGNS = {
    "grace": (["GRACE UPON GRACE"], "JOHN 1:16"),
    "lift": (["I LIFT MY EYES"], "PSALM 121:1"),
    "joy": (["JOY COMES", "IN THE MORNING"], "PSALM 30:5"),
    "lamp": (["LAMP UNTO MY FEET"], "PSALM 119:105"),
    "light": (["LIGHT OF THE WORLD"], "JOHN 8:12"),
    "shepherd": (["THE LORD IS", "MY SHEPHERD"], "PSALM 23:1"),
    "way": (["THE WAY", "THE TRUTH · THE LIFE"], "JOHN 14:6"),
}


def art_mask(path, width):
    """Black-on-white art -> crisp alpha mask at print size (upscale, then re-threshold)."""
    g = np.asarray(Image.open(path).convert("L"))
    ys, xs = np.where(g < 200)
    g = Image.fromarray(g[ys.min():ys.max() + 1, xs.min():xs.max() + 1])
    g = g.resize((width, round(g.height * width / g.width)), Image.LANCZOS)
    return Image.fromarray(np.where(np.asarray(g) < 140, 255, 0).astype("uint8"))


def text_mask(text, font_path, max_w, max_h, tracking=0.0):
    """Largest size of `text` that fits max_w x max_h, as a tight alpha mask."""
    size = max_h
    while True:
        f = ImageFont.truetype(font_path, size)
        sp = tracking * size
        w = sum(f.getlength(c) for c in text) + sp * (len(text) - 1)
        if w <= max_w or size < 20:
            break
        size -= 4
    asc, desc = f.getmetrics()
    m = Image.new("L", (int(w) + 10, asc + desc), 0)
    d, x = ImageDraw.Draw(m), 0.0
    for c in text:
        d.text((x, 0), c, font=f, fill=255)
        x += f.getlength(c) + sp
    return m.crop(m.getbbox())


def build(key, lines, ref):
    art = art_mask(os.path.join(HERE, f"illustrations/{key}.png"), W)
    if art.height > 2100:  # tall art: cap height, keep it centred
        art = art_mask(os.path.join(HERE, f"illustrations/{key}.png"), round(W * 2100 / art.height))
    heads = [text_mask(t, HEAD, W, 520 if len(lines) == 1 else 420) for t in lines]
    # Multi-line headlines share one size: the line that fits smallest sets it.
    if len(heads) > 1:
        h = min(m.height for m in heads)
        heads = [m.resize((round(m.width * h / m.height), h), Image.LANCZOS) for m in heads]
    refm = text_mask(ref, REF, W * 0.5, 130, tracking=0.25)
    gap, lgap = 120, 50
    H = art.height + gap + sum(m.height for m in heads) + lgap * (len(heads) - 1) + 90 + refm.height
    mask, y = Image.new("L", (W, H), 0), 0
    for m in [art] + heads + [refm]:
        mask.paste(m, ((W - m.width) // 2, y))
        y += m.height + (gap if m is art else 90 if m is heads[-1] else lgap)
    for ink, rgb in INKS.items():
        out = Image.new("RGBA", (W, H), rgb + (0,))
        out.putalpha(mask)
        out.save(os.path.join(HERE, f"print-ready/{key}-{ink}.png"), dpi=(300, 300))
    return W, H


if __name__ == "__main__":
    for key, (lines, ref) in DESIGNS.items():
        print(key, build(key, lines, ref))
