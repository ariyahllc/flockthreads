#!/usr/bin/env node
/**
 * business-os design renderer — print-ready typographic art.
 *
 * Type is set from real font outlines and rasterized. No image generator ever
 * touches the letterforms (Product & Design Brief §4: AI garbles glyphs, and a
 * broken "amén" is a brand defect on a sincerity-driven line).
 *
 * Emits:
 *   out/print/MD27_[##]_[slug]_[color]_leftchest.png   transparent, 1200x1200 @300dpi
 *   out/contact-sheet.png                              review grid on garment swatches
 */

const fs = require('fs')
const path = require('path')
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas')

const DIR = __dirname
const SPEC_ARG = process.argv.find((a) => a.startsWith('--spec='))
const SPEC_FILE = SPEC_ARG ? SPEC_ARG.split('=')[1] : 'designs.json'
const SPEC = JSON.parse(fs.readFileSync(path.join(DIR, SPEC_FILE), 'utf8'))
const OUT = path.join(DIR, 'out')
const PRINT_DIR = path.join(OUT, 'print')

// Brief §4: minimum stroke weight 1.5pt at final size or it breaks up on DTG/heather.
const MIN_STROKE_PT = 1.5
const { px: CANVAS_PX, dpi: DPI } = SPEC.canvas
const MIN_STROKE_PX = (MIN_STROKE_PT / 72) * DPI

const REF_FAMILY = `${SPEC.typography.family} Ref`
GlobalFonts.registerFromPath(path.join(DIR, 'fonts', SPEC.typography.weightFile), SPEC.typography.family)
GlobalFonts.registerFromPath(path.join(DIR, 'fonts', SPEC.typography.refWeightFile), REF_FAMILY)

const inchesToPx = (inches) => inches * DPI

/** Draw a string char-by-char with em-based letterspacing; returns total advance. */
function drawTracked(ctx, text, x, y, spacingPx, measureOnly = false) {
  let cursor = x
  for (const ch of text) {
    if (!measureOnly) ctx.fillText(ch, cursor, y)
    cursor += ctx.measureText(ch).width + spacingPx
  }
  return cursor - x - spacingPx
}

/**
 * Render one design's artwork onto a transparent canvas.
 * Scales type so the widest line lands exactly on the brief's target print width.
 */
/** Type size that makes a design's widest line land exactly on its target print width. */
function widthBasedFontSize(design, ctx) {
  const BASE = 100
  ctx.font = `${BASE}px ${SPEC.typography.family}`
  const widest = Math.max(...design.lines.map((l) => ctx.measureText(l).width))
  return (inchesToPx(design.widthInches) / widest) * BASE
}

function renderArtwork(design, inkHex, fontSizeOverride) {
  const canvas = createCanvas(CANVAS_PX, CANVAS_PX)
  const ctx = canvas.getContext('2d')
  const t = SPEC.typography

  // Width-based scaling honours each design's specified print width but makes
  // type size swing wildly (short copy -> giant type). Normalised scaling fixes
  // type size across the capsule so the pieces read as a family, letting the
  // print width float instead.
  const fontSize = fontSizeOverride || widthBasedFontSize(design, ctx)
  const targetPx = (() => {
    ctx.font = `${fontSize}px ${t.family}`
    return Math.max(...design.lines.map((l) => ctx.measureText(l).width))
  })()

  ctx.font = `${fontSize}px ${t.family}`
  ctx.fillStyle = inkHex
  ctx.textBaseline = 'alphabetic'

  const lineHeight = fontSize * t.leading
  const refSize = Math.max(fontSize * t.refSizeRatio, t.refMinPx || 0)
  const refGap = fontSize * t.refGapEm

  // Total block height: body lines + optional reference line.
  const m = ctx.measureText(design.lines[0])
  const ascent = m.actualBoundingBoxAscent || fontSize * 0.72
  let blockH = ascent + lineHeight * (design.lines.length - 1)
  if (design.ref) blockH += refGap + refSize

  // Centre the block in the safe area; left-align every line to a shared edge.
  const left = (CANVAS_PX - targetPx) / 2
  let y = (CANVAS_PX - blockH) / 2 + ascent

  for (const line of design.lines) {
    ctx.fillText(line, left, y)
    y += lineHeight
  }

  if (design.ref) {
    y += refGap - lineHeight + refSize
    ctx.font = `${refSize}px ${REF_FAMILY}`
    drawTracked(ctx, design.ref, left, y, refSize * t.refLetterSpacingEm)
  }

  return canvas
}

/**
 * Estimate the thinnest rendered stroke by scanning horizontal runs of opaque
 * pixels. Approximate (curves and serif tips read thin), so it's a guard rail,
 * not a substitute for a press proof.
 */
function checkStroke(canvas) {
  const ctx = canvas.getContext('2d')
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const runs = []
  for (let y = 0; y < height; y++) {
    let run = 0
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 128) run++
      else if (run) { runs.push(run); run = 0 }
    }
    if (run) runs.push(run)
  }
  if (!runs.length) return null
  runs.sort((a, b) => a - b)
  const pct = (p) => runs[Math.floor(runs.length * p)]
  const p10 = pct(0.1)
  return {
    p10Px: p10,
    medianPx: pct(0.5),
    p10Pt: +((p10 / DPI) * 72).toFixed(2),
    passes: p10 >= MIN_STROKE_PX,
  }
}

/** PNG carries no DPI by default; inject a pHYs chunk so print tools read 300dpi. */
function withDpi(buffer, dpi) {
  const ppm = Math.round(dpi / 0.0254)
  const data = Buffer.alloc(9)
  data.writeUInt32BE(ppm, 0)
  data.writeUInt32BE(ppm, 4)
  data.writeUInt8(1, 8) // unit: metres
  const type = Buffer.from('pHYs')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(9, 0)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([type, data])) >>> 0, 0)
  const chunk = Buffer.concat([len, type, data, crc])
  // IHDR is always the first chunk: 8 (sig) + 4 (len) + 4 (type) + 13 (data) + 4 (crc)
  const insertAt = 8 + 25
  return Buffer.concat([buffer.subarray(0, insertAt), chunk, buffer.subarray(insertAt)])
}

let CRC_TABLE = null
function crc32(buf) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      CRC_TABLE[n] = c
    }
  }
  let c = -1
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return c ^ -1
}

function buildContactSheet(artworks, widths, normalized) {
  const TILE = 420, LABEL_W = 400, HEADER = 130, FOOT = 56
  const maxCols = Math.max(...SPEC.designs.map((d) => d.colorways.length))
  const W = LABEL_W + maxCols * TILE
  const H = HEADER + SPEC.designs.length * TILE + FOOT
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = '#2B2B2B'
  ctx.font = `44px ${SPEC.typography.family}`
  ctx.fillText(
    `Mother's Day 2027 Faith Capsule — left-chest proofs${normalized ? ' (normalised type size)' : ''}`,
    40, 62
  )
  ctx.font = `24px ${SPEC.typography.family}`
  ctx.fillStyle = '#777'
  ctx.fillText(
    normalized
      ? `${SPEC.typography.family} · one type size across the capsule, print width floats · swatches approximate`
      : `${SPEC.typography.family} · scaled to each design's specified print width · swatches approximate`,
    40, 100
  )

  SPEC.designs.forEach((design, row) => {
    const y = HEADER + row * TILE

    ctx.fillStyle = '#2B2B2B'
    ctx.font = `30px ${SPEC.typography.family}`
    ctx.fillText(`${design.id}. ${design.name}`, 40, y + TILE / 2 - 16)
    ctx.fillStyle = '#888'
    ctx.font = `21px ${SPEC.typography.family}`
    ctx.fillText(design.role, 40, y + TILE / 2 + 16)
    ctx.fillText(`${widths[design.slug].toFixed(2)}" wide`, 40, y + TILE / 2 + 44)

    design.colorways.forEach((cw, col) => {
      const g = SPEC.garments[cw]
      const x = LABEL_W + col * TILE
      ctx.fillStyle = g.hex
      ctx.fillRect(x + 6, y + 6, TILE - 12, TILE - 12)

      const art = artworks[`${design.slug}_${cw}`]
      ctx.drawImage(art, x + 6, y + 6, TILE - 12, TILE - 12)

      ctx.fillStyle = g.ink === 'bone' ? '#EDE7DC' : '#2B2B2B'
      ctx.globalAlpha = 0.65
      ctx.font = `18px ${SPEC.typography.family}`
      ctx.fillText(g.label, x + 20, y + TILE - 24)
      ctx.globalAlpha = 1
    })
  })

  ctx.fillStyle = '#999'
  ctx.font = `19px ${SPEC.typography.family}`
  ctx.fillText(
    'Print files are transparent PNG @300dpi — garment colour shown for review only.',
    40, H - 20
  )
  return canvas
}

function main() {
  const NORMALIZE = process.argv.includes('--normalize')
  const suffix = NORMALIZE ? '-normalized' : ''
  const printDir = NORMALIZE ? path.join(OUT, 'print-normalized') : PRINT_DIR
  fs.mkdirSync(printDir, { recursive: true })
  const artworks = {}
  const report = []

  // Normalised mode: one type size for the whole capsule. Use the smallest
  // width-based size so no design overruns the print width it was specced at.
  let capsuleSize = null
  if (NORMALIZE) {
    const probe = createCanvas(10, 10).getContext('2d')
    capsuleSize =
      SPEC.typography.capsuleBodyPx ||
      Math.min(...SPEC.designs.map((d) => widthBasedFontSize(d, probe)))
    console.log(`\nnormalised: capsule body ${capsuleSize.toFixed(0)}px (per-design multipliers applied)`)
  }

  for (const design of SPEC.designs) {
    for (const cw of design.colorways) {
      const garment = SPEC.garments[cw]
      const ink = SPEC.inks[garment.ink]
      const canvas = renderArtwork(design, ink.hex, capsuleSize && capsuleSize * (design.scaleMultiplier || 1))
      artworks[`${design.slug}_${cw}`] = canvas

      const name = `${SPEC.capsule}_${design.id}_${design.slug}_${cw}_leftchest${suffix}.png`
      fs.writeFileSync(path.join(printDir, name), withDpi(canvas.toBuffer('image/png'), DPI))

      const stroke = checkStroke(canvas)
      report.push({ file: name, design: design.name, ink: ink.label, stroke })
    }
  }

  // Actual rendered width per design (differs from the spec in normalised mode).
  const probe = createCanvas(10, 10).getContext('2d')
  const widths = {}
  for (const d of SPEC.designs) {
    widths[d.slug] = capsuleSize
      ? d.widthInches * ((capsuleSize * (d.scaleMultiplier || 1)) / widthBasedFontSize(d, probe))
      : d.widthInches
  }

  const over = SPEC.designs.filter((d) => widths[d.slug] > (SPEC.typography.maxWidthInches || Infinity))
  if (over.length) {
    console.log(
      `\nWARNING: ${over.map((d) => `${d.name} ${widths[d.slug].toFixed(2)}"`).join(', ')} ` +
        `exceed the ${SPEC.typography.maxWidthInches}" left-chest cap.`
    )
  }

  fs.writeFileSync(
    path.join(OUT, `contact-sheet${suffix}.png`),
    buildContactSheet(artworks, widths, NORMALIZE).toBuffer('image/png')
  )

  // Stroke guard rail — one line per design (identical across colourways).
  console.log(`\nrendered ${report.length} print files -> ${path.relative(process.cwd(), printDir)}/`)
  console.log(`\nstroke check (brief §4 minimum ${MIN_STROKE_PT}pt = ${MIN_STROKE_PX.toFixed(1)}px @${DPI}dpi):`)
  const seen = new Set()
  for (const r of report) {
    if (seen.has(r.design)) continue
    seen.add(r.design)
    const s = r.stroke
    console.log(
      `  ${s.passes ? 'PASS' : 'THIN'}  ${r.design.padEnd(20)} thinnest ~${String(s.p10Px).padStart(2)}px (${s.p10Pt}pt)  median stem ${s.medianPx}px`
    )
  }
  const thin = report.filter((r) => !r.stroke.passes)
  console.log(thin.length ? `\n${thin.length} file(s) under the minimum — bump weight or size.` : '\nall designs clear the DTG minimum.')
  console.log(`contact sheet -> out/contact-sheet${suffix}.png\n`)
}

main()
