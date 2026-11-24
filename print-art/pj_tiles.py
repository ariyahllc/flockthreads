"""Christmas family PJ pattern tiles (seamless repeats for Printful's all-over-print Pattern Tool).

Plaid: red + evergreen tartan, a tiny cream cross where the cream lines cross.
Output: print-ready/pj-tile-<name>.png, 2400 px square at 300 dpi (an 8 in repeat), plus a 2x2 preview,
        and print-ready/pj/plaid-<w>x<h>.jpg: one full Printful panel per print area (150 dpi, same 8 in repeat).
Run   : python print-art/pj_tiles.py
"""
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
S = 2400
RED, GREEN, CREAM = (204, 32, 44), (20, 104, 62), (240, 230, 208)  # bright enough to read as red + green, not brown, once the twill mixes them


def plaid():
    # One sett (stripe sequence, px) repeated 3 times across the tile so the edges meet.
    sett = [(RED, 200), (GREEN, 90), (RED, 30), (CREAM, 10), (RED, 30), (GREEN, 90), (RED, 70), ((20, 20, 20), 10), (RED, 70)]
    unit = sum(w for _, w in sett)
    assert S % unit == 0, unit
    col = []
    for c, w in sett:
        col += [c] * w
    col *= S // unit
    im = Image.new("RGB", (S, S)); px = im.load()
    for y in range(S):
        for x in range(S):
            # 2/2 twill: alternate warp and weft on diagonals, which gives tartan its woven look
            a, b = col[x], col[y]
            px[x, y] = a if ((x + y) // 4) % 2 else b
    d = ImageDraw.Draw(im)
    cream_at = [i for i in range(S) if col[i] == CREAM and (i == 0 or col[i - 1] != CREAM)]
    for cx in cream_at:
        for cy in cream_at:  # small cross on each cream-line crossing
            x, y = cx + 5, cy + 5
            d.rectangle((x - 3, y - 18, x + 3, y + 18), fill=CREAM)
            d.rectangle((x - 11, y - 8, x + 11, y - 2), fill=CREAM)
    return im


def main():
    tiles = {"plaid": plaid()}
    for name, t in tiles.items():
        t.save(os.path.join(HERE, f"print-ready/pj-tile-{name}.png"), dpi=(300, 300))
        prev = Image.new("RGB", (S * 2, S * 2))
        for ox in (0, S):
            for oy in (0, S):
                prev.paste(t, (ox, oy))
        prev.resize((900, 900), Image.LANCZOS).save(os.path.join(HERE, f"print-ready/pj-tile-{name}-preview.jpg"), quality=88)
    # Printful all-over-print panels (printfile sizes from /mockup-generator/printfiles/<product>)
    rep = tiles["plaid"].resize((1200, 1200), Image.LANCZOS)  # 8 in at 150 dpi
    os.makedirs(os.path.join(HERE, "print-ready/pj"), exist_ok=True)
    for w, h in [(4950, 7500), (6000, 6000), (5400, 4650)]:  # joggers (401, 400), youth leggings (323), kids leggings (322)
        im = Image.new("RGB", (w, h))
        for y in range(0, h, 1200):
            for x in range(0, w, 1200):
                im.paste(rep, (x, y))
        im.save(os.path.join(HERE, f"print-ready/pj/plaid-{w}x{h}.jpg"), quality=86, dpi=(150, 150))
    print("ok")


if __name__ == "__main__":
    main()
