"""FlockThreads print-art renderer: 4500x5400 transparent PNGs, 300 DPI."""
import math, os
from PIL import Image, ImageDraw, ImageFont

W, H = 4500, 5400
CX = W // 2
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.path.join(BASE_DIR, "fonts")
OUT_DIR = os.path.join(BASE_DIR, "output")

def _dejavu(name):  # prefer fonts/ (macOS has no DejaVu), else Linux system path
    local = os.path.join(FONT_DIR, name)
    return local if os.path.exists(local) else f"/usr/share/fonts/truetype/dejavu/{name}"

SERIF_BOLD = _dejavu("DejaVuSerif-Bold.ttf")
SERIF_REG = _dejavu("DejaVuSerif.ttf")
SANS_BOLD = _dejavu("DejaVuSans-Bold.ttf")
SCRIPT = os.path.join(FONT_DIR, "GreatVibes-Regular.ttf")

CREAM = (246, 239, 221, 255)
ESPRESSO = (62, 53, 44, 255)
GOLD = (198, 160, 96, 255)

def font(path, size):
    return ImageFont.truetype(path, size)

def text_w(draw, s, f, tracking=0):
    w = 0
    for ch in s:
        w += draw.textlength(ch, font=f) + tracking
    return w - tracking if s else 0

def draw_tracked(draw, cx, y, s, f, fill, tracking=0):
    """Draw letterspaced text centered at cx, top at y. Returns bottom y."""
    w = text_w(draw, s, f, tracking)
    x = cx - w / 2
    ascent, descent = f.getmetrics()
    for ch in s:
        draw.text((x, y), ch, font=f, fill=fill)
        x += draw.textlength(ch, font=f) + tracking
    return y + ascent + descent

def draw_cross(draw, cx, y, size, fill, width=14):
    draw.line([(cx, y), (cx, y + size)], fill=fill, width=width)
    draw.line([(cx - size * 0.32, y + size * 0.30),
               (cx + size * 0.32, y + size * 0.30)], fill=fill, width=width)

def draw_wreath(draw, cx, cy, r, fill, berry_fill=None):
    """Two delicate branches forming an open wreath, fuller foliage."""
    for side in (-1, 1):
        for arc_i, (r_off, w_main) in enumerate([(0, 7), (-46, 5)]):
            rr = r + r_off
            pts = []
            for i in range(61):
                a = -1.15 + (2.30 * i / 60)
                x = cx + side * rr * math.cos(a)
                y = cy + rr * math.sin(a) * 1.06
                pts.append((x, y))
            draw.line(pts, fill=fill, width=w_main, joint="curve")
            step = 6 if arc_i == 0 else 9
            leaf_l, leaf_w = (150, 64) if arc_i == 0 else (110, 48)
            for i in range(4, 57, step):
                x, y = pts[i]
                x2, y2 = pts[i + 1]
                ang = math.degrees(math.atan2(y2 - y, x2 - x))
                for off in (-1, 1):
                    la = math.radians(ang + off * 58)
                    lx = x + 52 * math.cos(la)
                    ly = y + 52 * math.sin(la)
                    leaf = Image.new("RGBA", (leaf_l + 40, leaf_w + 40),
                                     (0, 0, 0, 0))
                    ld = ImageDraw.Draw(leaf)
                    lw2, lh2 = (leaf_l + 40) / 2, (leaf_w + 40) / 2
                    ld.ellipse([lw2 - leaf_l / 2, lh2 - leaf_w / 2,
                                lw2 + leaf_l / 2, lh2 + leaf_w / 2], fill=fill)
                    # pointed tip: small triangle at the outer end
                    ld.polygon([(lw2 + leaf_l / 2 - 6, lh2 - 14),
                                (lw2 + leaf_l / 2 + 34, lh2),
                                (lw2 + leaf_l / 2 - 6, lh2 + 14)], fill=fill)
                    leaf = leaf.rotate(-math.degrees(la), expand=True,
                                       resample=Image.BICUBIC)
                    draw._image.alpha_composite(
                        leaf, (int(lx - leaf.width / 2),
                               int(ly - leaf.height / 2)))
        # berries near the bottom of each branch
        if berry_fill:
            pts0 = []
            for i in range(61):
                a = -1.15 + (2.30 * i / 60)
                pts0.append((cx + side * r * math.cos(a),
                             cy + r * math.sin(a) * 1.06))
            for i in (48, 53):
                x, y = pts0[i]
                draw.ellipse([x - 22, y - 22, x + 22, y + 22],
                             fill=berry_fill)

def new_canvas():
    return Image.new("RGBA", (W, H), (0, 0, 0, 0))

def masculine(save_name, lines, verse_ref=None, ink=CREAM, cross=True):
    """Bold serif caps, letterspaced, cross mark. lines: list of str."""
    img = new_canvas()
    d = ImageDraw.Draw(img)
    y = 1560
    if cross:
        draw_cross(d, CX, y, 210, ink, width=16)
        y += 330
    f = font(SERIF_BOLD, 205)
    for ln in lines:
        y = draw_tracked(d, CX, y, ln, f, ink, tracking=26) + 40
    if verse_ref:
        y = draw_tracked(d, CX, y + 30, verse_ref, font(SERIF_REG, 92),
                         ink, tracking=14) + 20
    img.save(os.path.join(OUT_DIR, save_name), dpi=(300, 300))
    return save_name

def feminine(save_name, script_line, serif_lines, verse_ref=None,
             ink=CREAM, wreath=True):
    """Script over serif caps, botanical wreath."""
    img = new_canvas()
    d = ImageDraw.Draw(img)
    cy = 2500
    if wreath:
        draw_wreath(d, CX, cy, 1180, ink, berry_fill=ink)
    # Text must clear the leaves: shrink any line wider than the wreath's open
    # middle, then center the whole block vertically inside the wreath.
    MAX_W = 1550
    def fit(path, size, s, tracking):
        while size > 40 and text_w(d, s, font(path, size), tracking) > MAX_W:
            size -= 4
        return font(path, size)
    rows = [(script_line, fit(SCRIPT, 330, script_line, 0), 0, 10)]
    serif_size = min(fit(SERIF_BOLD, 168, ln, 22).size for ln in serif_lines)
    rows += [(ln, font(SERIF_BOLD, serif_size), 22, 30) for ln in serif_lines]
    if verse_ref:
        rows.append((verse_ref, fit(SERIF_REG, 88, verse_ref, 12), 12, 0))
    height = sum(sum(f.getmetrics()) + gap for _, f, _, gap in rows) + (40 if verse_ref else 0)
    y = cy - height / 2
    for i, (s, f, tracking, gap) in enumerate(rows):
        if verse_ref and i == len(rows) - 1:
            y += 40
        y = draw_tracked(d, CX, y, s, f, ink, tracking=tracking) + gap
    img.save(os.path.join(OUT_DIR, save_name), dpi=(300, 300))
    return save_name

def youth(save_name, lines, doodle=None, ink=ESPRESSO):
    """Playful bold sans for kids."""
    img = new_canvas()
    d = ImageDraw.Draw(img)
    y = 1900
    f = font(SANS_BOLD, 260)
    for ln in lines:
        y = draw_tracked(d, CX, y, ln, f, ink, tracking=10) + 50
    if doodle == "pumpkin":
        px, py, pr = CX, y + 260, 200
        d.ellipse([px - pr, py - pr, px + pr, py + pr], outline=ink, width=22)
        d.ellipse([px - pr * 0.45, py - pr, px + pr * 0.45, py + pr],
                  outline=ink, width=18)
        d.line([(px, py - pr), (px + 30, py - pr - 90)], fill=ink, width=22)
    elif doodle == "star":
        px, py, pr = CX, y + 260, 190
        pts = []
        for i in range(10):
            rr = pr if i % 2 == 0 else pr * 0.45
            a = -math.pi / 2 + i * math.pi / 5
            pts.append((px + rr * math.cos(a), py + rr * math.sin(a)))
        d.polygon(pts, outline=ink, width=22)
    img.save(os.path.join(OUT_DIR, save_name), dpi=(300, 300))
    return save_name

os.makedirs(OUT_DIR, exist_ok=True)
