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
// Mark, low-centre. 330px ≈ 2.2" wide — small enough to stay tasteful,
// big enough to read as a brand mark from across a room.
const MARK = { w: 330, bottomPad: 26 };

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

    // 2. Mark, centred low on the front — visible to anyone facing the wearer.
    const mw = MARK.w, mh = mw * (86 / 112);
    drawMark(ctx, (AREA_W - mw) / 2, AREA_H - MARK.bottomPad - mh, mw, inkFor(file));

    fs.writeFileSync(path.join(OUT, file), canvas.toBuffer("image/png"));
    console.log("  " + file);
  }
  console.log(`Wrote ${files.length} full-area print files -> ${path.relative(ROOT, OUT)}`);
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
