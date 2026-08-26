#!/usr/bin/env node
/**
 * Builds full-print-area artwork: the existing left-chest design PLUS the
 * FlockThreads mark low on the front — inside ONE 1500x1800 front print file.
 *
 * Why one file: Printful bills per print PLACEMENT, not per element. Keeping
 * the mark inside the existing front placement adds zero fulfilment cost,
 * where a hem or sleeve print would be a second (paid) location.
 *
 * Out: business-os/design/out/print-logo/<same-name>.png
 */
const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("@napi-rs/canvas");

const ROOT = path.resolve(__dirname, "../..");  // repo root
const OUT = path.join(ROOT, "business-os/design/out/print-logo");
fs.mkdirSync(OUT, { recursive: true });

// Print area (Printful front placement for 3001 / 6400) — 10" x 12" @150dpi.
const AREA_W = 1500, AREA_H = 1800;
// Existing left-chest box, matching data/products.json printful_placement.
const ART = { w: 430, h: 430, x: 760, y: 300 };
// Mark placement:
//   "under-chest" — small mark tucked beneath the verse, sharing its optical
//                   centre. Reads as one considered lockup.
//   "low-front"   — mark at the bottom edge of the print area (waist height).
// Both are inside the SAME front placement, so both cost the same: nothing.
const MODE = process.env.MARK_MODE || "under-chest";
const MARK = { underChest: { w: 104, gap: 34 }, lowFront: { w: 330, bottomPad: 26 } };

// Ink per garment, mirroring designs.json: dark ink on light cloth, bone on dark.
const INK = {
  heatherdust: "#2B2B2B", vintagewhite: "#2B2B2B", softpink: "#2B2B2B",
  heatherolive: "#EDE7DC", black: "#EDE7DC", softcream: "#2B2B2B",
};

// ft-mark-mono.svg, viewBox 0 0 112 86 — three chevrons (the flock).
function drawMark(ctx, x, y, w, ink) {
  const s = w / 112;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = ink;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const chevrons = [
    { pts: [[80, 26], [94, 16], [108, 26]], w: 6 },
    { pts: [[42, 46], [58, 34], [74, 46]], w: 7 },
    { pts: [[4, 66], [20, 54], [36, 66]], w: 5.5 },
  ];
  for (const c of chevrons) {
    ctx.lineWidth = c.w;
    ctx.beginPath();
    ctx.moveTo(c.pts[0][0], c.pts[0][1]);
    ctx.lineTo(c.pts[1][0], c.pts[1][1]);
    ctx.lineTo(c.pts[2][0], c.pts[2][1]);
    ctx.stroke();
  }
  ctx.restore();
}

// Bounding box of non-transparent pixels inside a region — lets the mark sit a
// fixed optical gap under the type instead of under the padded canvas edge.
function contentBounds(ctx, x, y, w, h) {
  const { data } = ctx.getImageData(x, y, w, h);
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      if (data[(py * w + px) * 4 + 3] > 12) {
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: x + minX, y: y + minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function inkFor(file) {
  const hit = Object.keys(INK).find((k) => file.toLowerCase().includes(k));
  return INK[hit] || "#2B2B2B";
}

async function main() {
  const srcDir = path.join(ROOT, "business-os/design/out/print");
  const files = fs.readdirSync(srcDir).filter((f) => f.endsWith(".png"));
  for (const file of files) {
    const canvas = createCanvas(AREA_W, AREA_H);
    const ctx = canvas.getContext("2d");

    // 1. Existing design, at its current left-chest position/size.
    const art = await loadImage(path.join(srcDir, file));
    ctx.drawImage(art, ART.x, ART.y, ART.w, ART.h);

    // 2. Mark. Position is measured off the real artwork, not guessed: the
    //    source PNGs are padded canvases, so the visible text sits somewhere
    //    inside the 430x430 box. Find its true bounds first.
    const ink = inkFor(file);
    if (MODE === "low-front") {
      const mw = MARK.lowFront.w, mh = mw * (86 / 112);
      drawMark(ctx, (AREA_W - mw) / 2, AREA_H - MARK.lowFront.bottomPad - mh, mw, ink);
    } else {
      const box = contentBounds(ctx, ART.x, ART.y, ART.w, ART.h);
      const mw = MARK.underChest.w, mh = mw * (86 / 112);
      const cx = box ? box.x + box.w / 2 : ART.x + ART.w / 2;
      const top = (box ? box.y + box.h : ART.y + ART.h) + MARK.underChest.gap;
      drawMark(ctx, cx - mw / 2, top, mw, ink);
    }

    fs.writeFileSync(path.join(OUT, file), canvas.toBuffer("image/png"));
    console.log("  " + file);
  }
  console.log(`Wrote ${files.length} full-area print files -> ${path.relative(ROOT, OUT)}`);
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
