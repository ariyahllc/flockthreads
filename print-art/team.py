"""Church team tees: big bold role + church name, for group orders.
Run: python print-art/team.py "WORSHIP TEAM" "GRACE COMMUNITY CHURCH" cream out.png
"""
import sys, os
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from everyday import text_mask, HEAD, REF, INKS, W

def team(role, church, ink, out):
    words = role.upper().split()
    # One word fills the width; two words stack so each line stays huge.
    lines = [" ".join(words)] if len(words) == 1 else words
    heads = [text_mask(t, HEAD, W, 900) for t in lines]
    h = min(m.height for m in heads)
    heads = [m.resize((round(m.width * h / m.height), h), Image.LANCZOS) for m in heads]
    top = text_mask(church.upper(), REF, W * 0.9, 150, tracking=0.3)
    gap = 60
    H = top.height + 110 + sum(m.height for m in heads) + gap * (len(heads) - 1)
    mask, y = Image.new("L", (W, H), 0), 0
    for i, m in enumerate([top] + heads):
        mask.paste(m, ((W - m.width) // 2, y))
        y += m.height + (110 if i == 0 else gap)
    img = Image.new("RGBA", (W, H), INKS[ink] + (0,)); img.putalpha(mask)
    img.save(out, dpi=(300, 300))

if __name__ == "__main__":
    team(*sys.argv[1:5])
