"""Psalm 127:4 tee. Front: the verse (KJV, public domain). Back: quiver of arrows.
Run: python print-art/arrows.py   ->  print-ready/arrows-front-<ink>.png, arrows-back-<ink>.png
"""
import os
from PIL import Image
from everyday import text_mask, art_mask, HEAD, REF, INKS, HERE

FRONT_W, BACK_W = 2400, 3000  # 8 in and 10 in at 300 dpi
LINES = ["AS ARROWS ARE", "IN THE HAND OF", "A MIGHTY MAN,", "SO ARE CHILDREN"]


def stack(masks, gaps, width):
    H = sum(m.height for m in masks) + sum(gaps)
    out, y = Image.new("L", (width, H), 0), 0
    for i, m in enumerate(masks):
        out.paste(m, ((width - m.width) // 2, y))
        y += m.height + (gaps[i] if i < len(gaps) else 0)
    return out


def save(mask, name):
    for ink, rgb in INKS.items():
        img = Image.new("RGBA", mask.size, rgb + (0,)); img.putalpha(mask)
        img.save(os.path.join(HERE, f"print-ready/{name}-{ink}.png"), dpi=(300, 300))


heads = [text_mask(t, HEAD, FRONT_W, 420) for t in LINES]
h = min(m.height for m in heads)  # equal line height, each line as wide as it naturally is
heads = [m.resize((round(m.width * h / m.height), h), Image.LANCZOS) for m in heads]
ref = text_mask("PSALM 127:4", REF, FRONT_W * 0.45, 120, tracking=0.3)
save(stack(heads + [ref], [45] * (len(heads) - 1) + [110], FRONT_W), "arrows-front")

quiver = art_mask(os.path.join(HERE, "illustrations/arrows.png"), BACK_W)
if quiver.height > 3600:  # keep the back print inside 12 in tall
    quiver = art_mask(os.path.join(HERE, "illustrations/arrows.png"), round(BACK_W * 3600 / quiver.height))
save(stack([quiver, text_mask("PSALM 127:4", REF, BACK_W * 0.4, 120, tracking=0.3)], [140], BACK_W), "arrows-back")
print("ok")
