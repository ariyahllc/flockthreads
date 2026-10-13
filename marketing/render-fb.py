"""Facebook Page images for FlockThreads. Run: python3 marketing/render-fb.py (needs Pillow).
Outputs into marketing/: profile picture, brand cover, Thanksgiving cover (1640x924).
Cover text stays inside the middle 1200px so mobile crops don't cut it.
"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "marketing")
SERIF = os.path.join(ROOT, "business-os/design/fonts/EBGaramond.ttf")
CHARCOAL, CREAM, BONE = "#2B2B2B", "#F1EDE4", "#EDE7DC"
W, H = 1640, 924


def tracked(d, cx, y, s, f, fill, tracking):
    w = sum(d.textlength(c, font=f) for c in s) + tracking * (len(s) - 1)
    x = cx - w / 2
    for c in s:
        d.text((x, y), c, font=f, fill=fill)
        x += d.textlength(c, font=f) + tracking


def chevron(d, cx, cy, size, fill):
    # The FlockThreads mark (design-handoff/assets/ft-favicon.svg): open roof chevron.
    k = size / 84
    pts = [(cx - 42 * k, cy + 14 * k), (cx, cy - 14 * k), (cx + 42 * k, cy + 14 * k)]
    w = int(13 * k)
    d.line(pts, fill=fill, width=w, joint="curve")
    for x, y in (pts[0], pts[2]):
        d.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=fill)


# Profile picture: the favicon itself, at Facebook's recommended size.
Image.open(os.path.join(ROOT, "design-handoff/assets/flockthreads-favicon-512.png")).resize(
    (720, 720), Image.LANCZOS).save(os.path.join(OUT, "fb-profile-720.png"))

# Brand cover.
img = Image.new("RGB", (W, H), CHARCOAL)
d = ImageDraw.Draw(img)
chevron(d, W / 2, 330, 120, CREAM)
tracked(d, W / 2, 400, "FLOCKTHREADS", ImageFont.truetype(SERIF, 64), CREAM, 22)
tracked(d, W / 2, 500, "Faith you’ll actually wear.", ImageFont.truetype(SERIF, 44), CREAM, 1)
tracked(d, W / 2, 590, "SCRIPTURE TEES, DESIGNED HIS & HERS  ·  FLOCKTHREADS.COM",
        ImageFont.truetype(SERIF, 24), "#B9B2A4", 4)
img.save(os.path.join(OUT, "fb-cover-brand.png"))

# Thanksgiving cover: his & hers model shots either side, message in the middle.
img = Image.new("RGB", (W, H), BONE)
d = ImageDraw.Draw(img)
shots = os.path.join(ROOT, "assets/model-shots/v5")
for name, x in (("m-givethanks-burntorange.png", 0), ("w-grateful-burntorange.png", W - 520)):
    ph = Image.open(os.path.join(shots, name)).convert("RGB")
    ph = ph.resize((int(ph.width * H / ph.height), H), Image.LANCZOS)  # fill full height
    left = (ph.width - 520) // 2
    ph = ph.crop((left, 0, left + 520, H))
    img.paste(ph, (x, 0))
chevron(d, W / 2, 250, 70, CHARCOAL)
tracked(d, W / 2, 300, "THE THANKSGIVING SHOP", ImageFont.truetype(SERIF, 30), CHARCOAL, 8)
tracked(d, W / 2, 360, "Give thanks.", ImageFont.truetype(SERIF, 92), CHARCOAL, 0)
tracked(d, W / 2, 465, "Wear it.", ImageFont.truetype(SERIF, 92), CHARCOAL, 0)
tracked(d, W / 2, 610, "His, hers & kids’ tees", ImageFont.truetype(SERIF, 34), CHARCOAL, 1)
tracked(d, W / 2, 665, "FLOCKTHREADS.COM", ImageFont.truetype(SERIF, 26), "#6B6457", 6)
img.save(os.path.join(OUT, "fb-cover-thanksgiving.png"))
print("wrote fb-profile-720.png, fb-cover-brand.png, fb-cover-thanksgiving.png")
