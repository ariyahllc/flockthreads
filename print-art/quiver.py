"""Psalm 127:4 back print with a chosen number of arrows (1-6), one per child.

Builds every count from two drawings, so the style matches across versions:
  illustrations/quiver-empty.png  (empty quiver, mouth at the top)
  illustrations/arrow.png         (one vertical arrow, feathers up)
Arrows print in the accent colour, quiver + reference in the shirt's ink.
Output: print-ready/arrows-back-<n>-<ink>.png   (3000 px = 10 in wide, 300 dpi)
Run   : python print-art/quiver.py
"""
import math
import os
import numpy as np
from PIL import Image, ImageDraw
from everyday import art_mask, text_mask, REF, INKS, ACCENTS, HERE

W = 3000
ACCENT = "orange"


def silhouette(mask):
    """Solid shape of a line drawing: everything the outside background can't reach."""
    m = mask.convert("L").point(lambda v: 0 if v else 255)  # ink black, paper white
    m = Image.fromarray(np.pad(np.asarray(m), 2, constant_values=255))
    ImageDraw.floodfill(m, (0, 0), 128)
    a = np.asarray(m)[2:-2, 2:-2]
    return Image.fromarray(np.where(a == 128, 0, 255).astype("uint8"))


def back(n):
    q = art_mask(os.path.join(HERE, "illustrations/quiver-empty.png"), 1500)
    qs = np.asarray(silhouette(q)) > 0
    rows = np.where(qs.any(axis=1))[0]
    top = rows[0]
    mouth = qs[top: top + 60].any(axis=0).nonzero()[0]          # x-span of the opening
    mouth_cx, mouth_w = (mouth[0] + mouth[-1]) / 2, mouth[-1] - mouth[0]
    mouth_y = top + int(0.06 * q.height)                          # arrows vanish below this line

    probe = art_mask(os.path.join(HERE, "illustrations/arrow.png"), 100)
    alen = int(q.height * 1.05)
    arrow = art_mask(os.path.join(HERE, "illustrations/arrow.png"), round(alen * 100 / probe.height))
    rise = int(alen * 0.5)  # length of each arrow that shows above the mouth

    pad = int(alen * 0.6)
    H, Wc = q.height + pad, max(W, q.width + 1200)
    ox, oy = (Wc - q.width) // 2, pad
    quiver = Image.new("L", (Wc, H), 0); quiver.paste(q, (ox, oy))
    sil = Image.new("L", (Wc, H), 0); sil.paste(Image.fromarray(qs.astype("uint8") * 255), (ox, oy))
    arrows = Image.new("L", (Wc, H), 0)

    spread = 0 if n == 1 else 8 + 7 * n                            # degrees across the fan
    for i in range(n):
        t = 0.5 if n == 1 else i / (n - 1)
        ang = math.radians(-spread / 2 + spread * t)                # + tilts the feathers right
        mx = ox + mouth_cx + (t - 0.5) * mouth_w * (0.3 if n == 2 else 0.6)  # where it enters the mouth
        # Stagger heights so the feathers don't merge: odd arrows sit lower, middle ones higher.
        my = oy + mouth_y - int(60 * math.cos((t - 0.5) * math.pi)) + (int(0.12 * rise) if i % 2 else 0)
        r = arrow.rotate(-math.degrees(ang), resample=Image.BICUBIC, expand=True)
        d = alen / 2 - rise                                          # mouth -> arrow centre, along the shaft
        cx, cy = mx - math.sin(ang) * d, my + math.cos(ang) * d
        arrows.paste(r, (int(cx - r.width / 2), int(cy - r.height / 2)), r)

    # Hide arrow parts inside the quiver below the mouth line.
    a = np.asarray(arrows).copy()
    hide = np.asarray(sil) > 0
    hide[: oy + mouth_y] = False
    a[hide] = 0
    arrows = Image.fromarray(a)
    qv = np.asarray(quiver).copy(); qv[a > 0] = 0  # arrows sit in front where they overlap the rim
    quiver = Image.fromarray(qv)

    ref = text_mask("PSALM 127:4", REF, W * 0.4, 120, tracking=0.3)
    box = Image.fromarray(np.maximum(np.asarray(quiver), np.asarray(arrows))).getbbox()
    quiver, arrows = quiver.crop(box), arrows.crop(box)
    scale = min(W / quiver.width, 3600 / quiver.height)
    size = (round(quiver.width * scale), round(quiver.height * scale))
    quiver, arrows = quiver.resize(size, Image.LANCZOS), arrows.resize(size, Image.LANCZOS)
    Hh = size[1] + 140 + ref.height
    base, acc = Image.new("L", (W, Hh), 0), Image.new("L", (W, Hh), 0)
    base.paste(quiver, ((W - size[0]) // 2, 0)); acc.paste(arrows, ((W - size[0]) // 2, 0))
    base.paste(ref, ((W - ref.width) // 2, size[1] + 140))
    # On dark shirts a solid-ink mouth reads as a lid: knock out big solid areas near the top.
    from PIL import ImageFilter
    solid = base.filter(ImageFilter.MinFilter(31))
    solid = np.asarray(solid.filter(ImageFilter.MaxFilter(25))).copy()
    solid[int(size[1] * 0.45):] = 0
    base_dark = Image.fromarray(np.where(solid > 0, 0, np.asarray(base)).astype("uint8"))
    for ink, rgb in INKS.items():
        accent = ACCENTS[ACCENT] if ink == "cream" else tuple(round(c * 0.78) for c in ACCENTS[ACCENT])
        out = Image.new("RGBA", (W, Hh), rgb + (0,)); out.putalpha(base_dark if ink == "cream" else base)
        out.paste(Image.new("RGBA", (W, Hh), accent + (255,)), (0, 0), acc)
        out.save(os.path.join(HERE, f"print-ready/arrows-back-{n}-{ink}.png"), dpi=(300, 300))


if __name__ == "__main__":
    for n in range(1, 7):
        back(n)
    print("ok")
