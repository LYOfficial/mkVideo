// Generate icon assets for Tauri build that match the in-app "mk" logo:
// a rounded-rectangle tile with a blue→purple gradient and a white "mk" wordmark.
// Outputs 32x32.png, 128x128.png, 128x128@2x.png (256x256), icon.ico, icon.icns.
// Uses only Node built-ins (zlib) so no native deps are needed.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT_DIR = path.join(__dirname, '..', 'src-tauri', 'icons');
fs.mkdirSync(OUT_DIR, { recursive: true });

// ---- CRC32 for PNG chunk integrity ----
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  const crcInput = Buffer.concat([typeBuf, data]);
  crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

// ---- Color helpers ----
// Linear interpolation between two RGB triples.
function lerpRgb(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

// Reference gradient stops (matches `linear-gradient(135deg, #0ea5e9, #8b5cf6)`):
//   0%   #0ea5e9  →  (14, 165, 233)
//   100% #8b5cf6  →  (139, 92, 246)
function gradientColor(t) {
  return lerpRgb([14, 165, 233], [139, 92, 246], Math.max(0, Math.min(1, t)));
}

// Distance from point (px, py) to rounded rect's corner.  Returns a value > r
// when outside the rounded corner.  (px, py) are local-to-rect coords in
// the corner's quadrant (i.e. px ∈ [0,r], py ∈ [0,r]).
function outsideCorner(px, py, r) {
  const cx = r, cy = r;
  const dx = px - cx, dy = py - cy;
  // r^2 - dx^2 - dy^2 > 0 ⇒ inside the corner; we want the opposite.
  return r * r - (dx * dx + dy * dy) < 0;
}

// Render the icon to RGBA at the given size.
function renderIcon(size) {
  const pixels = Buffer.alloc(size * size * 4);

  // Tile geometry: rounded square covering the entire image, with radius ~18% of size.
  const radius = Math.max(2, Math.round(size * 0.18));

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Test rounded-rectangle bounds
      const inX = x >= 0 && x < size;
      const inY = y >= 0 && y < size;
      let inside = inX && inY;
      if (inside) {
        // Top-left corner
        if (x < radius && y < radius) {
          inside = !outsideCorner(x, y, radius);
        }
        // Top-right
        else if (x >= size - radius && y < radius) {
          const px = size - 1 - x;
          inside = !outsideCorner(px, y, radius);
        }
        // Bottom-left
        else if (x < radius && y >= size - radius) {
          const py = size - 1 - y;
          inside = !outsideCorner(x, py, radius);
        }
        // Bottom-right
        else if (x >= size - radius && y >= size - radius) {
          const px = size - 1 - x, py = size - 1 - y;
          inside = !outsideCorner(px, py, radius);
        }
      }

      if (!inside) {
        // Fully transparent for area outside the tile.
        pixels[idx] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 0;
        continue;
      }

      // 135° gradient: u = (x + y) / (2 * size).  Range [0, ~1].
      const t = (x + y) / (2 * (size - 1));
      const [r, g, b] = gradientColor(t);

      // Subtle inner highlight on the top edge for a soft "glassy" feel.
      let highlight = 0;
      if (y < size * 0.04) highlight = (size * 0.04 - y) / (size * 0.04);

      pixels[idx] = Math.min(255, r + Math.round(40 * highlight));
      pixels[idx + 1] = Math.min(255, g + Math.round(40 * highlight));
      pixels[idx + 2] = Math.min(255, b + Math.round(40 * highlight));
      pixels[idx + 3] = 255;
    }
  }

  // ---- Draw the white "mk" wordmark in the center ----
  drawMkText(pixels, size);

  // ---- Anti-alias the rounded-corner edges ----
  // Re-walk and soften alpha on corner pixels to avoid jagged edges.
  softenCorners(pixels, size, radius);

  return pixels;
}

// Render "mk" centered on the icon.  The letters are drawn as small filled
// rectangles (a tiny pixel font) so we can scale with `size`.
function drawMkText(pixels, size) {
  // Pick font size ~ 38% of icon size, but clamp to nice round values.
  let fontPx;
  if (size <= 32) fontPx = 8;
  else if (size <= 64) fontPx = 16;
  else if (size <= 128) fontPx = 32;
  else if (size <= 256) fontPx = 64;
  else fontPx = 96;

  // Width per glyph at this scale (rough).  Total wordmark width:
  const charW = Math.round(fontPx * 0.55);
  const charGap = Math.round(fontPx * 0.08);
  const totalW = charW * 2 + charGap;
  const cx = Math.floor(size / 2);
  const cy = Math.floor(size / 2);
  const left = cx - Math.floor(totalW / 2);
  const top = cy - Math.floor(fontPx / 2);

  const setPixel = (x, y, alpha) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const idx = (y * size + x) * 4;
    if (alpha >= 1) {
      pixels[idx] = 255;
      pixels[idx + 1] = 255;
      pixels[idx + 2] = 255;
      pixels[idx + 3] = 255;
    } else if (alpha > 0) {
      // Composite white over existing pixel
      const a = alpha;
      pixels[idx] = Math.round(pixels[idx] * (1 - a) + 255 * a);
      pixels[idx + 1] = Math.round(pixels[idx + 1] * (1 - a) + 255 * a);
      pixels[idx + 2] = Math.round(pixels[idx + 2] * (1 - a) + 255 * a);
      pixels[idx + 3] = Math.round(pixels[idx + 3] * (1 - a) + 255 * a);
    }
  };

  // Stroke width scales with font size
  const stroke = Math.max(1, Math.round(fontPx * 0.18));

  // ---- 'm' glyph: three vertical bars joined by a top arc ----
  const mLeft = left;
  const mTop = top;
  const mBottom = top + fontPx;
  const mW = charW;
  const mMid = Math.round(mW * 0.5);

  // Vertical strokes
  for (let y = mTop; y < mBottom; y++) {
    for (let dx = 0; dx < stroke; dx++) {
      setPixel(mLeft + dx, y, 1);
      setPixel(mLeft + mMid + dx, y, 1);
      setPixel(mLeft + mW - dx - 1, y, 1);
    }
  }
  // Top connectors (V shape) — two diagonal strokes from outer top corners
  // down to mid stroke top.
  for (let i = 0; i < mMid; i++) {
    const y = mTop + Math.round((i / mMid) * (fontPx * 0.3));
    for (let sy = 0; sy < stroke; sy++) {
      setPixel(mLeft + i, y + sy, 1);                      // left diagonal
      setPixel(mLeft + mW - 1 - i, y + sy, 1);             // right diagonal
    }
  }

  // ---- 'k' glyph: one vertical stroke + two diagonal arms meeting at mid ----
  const kLeft = left + charW + charGap;
  const kTop = top;
  const kBottom = top + fontPx;
  const armLen = Math.floor(fontPx * 0.45);

  // Vertical stroke
  for (let y = kTop; y < kBottom; y++) {
    for (let dx = 0; dx < stroke; dx++) {
      setPixel(kLeft + dx, y, 1);
    }
  }
  // Diagonal arms
  const midY = Math.round((kTop + kBottom) / 2);
  for (let i = 0; i < armLen; i++) {
    // upper arm: goes up-right
    const x = kLeft + stroke + i;
    const y = midY - i;
    for (let dx = 0; dx < stroke; dx++) {
      setPixel(x + dx, y, 1);
      setPixel(x + dx, y - 1, i === 0 ? 1 : 0); // thicker join
    }
    // lower arm: goes down-right
    const y2 = midY + i;
    for (let dx = 0; dx < stroke; dx++) {
      setPixel(x + dx, y2, 1);
    }
  }
}

// Soften rounded-corner edges with a 1-pixel anti-alias pass.
function softenCorners(pixels, size, radius) {
  // For each pixel inside the tile whose 4-neighbour is transparent,
  // scale alpha by distance to the corner curve.
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      if (pixels[idx + 3] === 0) continue;
      // distance from edge
      const dLeft = x;
      const dRight = size - 1 - x;
      const dTop = y;
      const dBottom = size - 1 - y;
      let nearest = Math.min(dLeft, dRight, dTop, dBottom);
      // Only soften the actual corner quadrants.
      const inTL = dLeft < radius && dTop < radius;
      const inTR = dRight < radius && dTop < radius;
      const inBL = dLeft < radius && dBottom < radius;
      const inBR = dRight < radius && dBottom < radius;
      if (!(inTL || inTR || inBL || inBR)) continue;

      // Sample 4 outer neighbours; if any are transparent, lower alpha.
      let alphaSum = 0;
      let count = 0;
      const check = (xx, yy) => {
        if (xx < 0 || yy < 0 || xx >= size || yy >= size) return;
        const ii = (yy * size + xx) * 4;
        alphaSum += pixels[ii + 3];
        count++;
      };
      check(x - 1, y);
      check(x + 1, y);
      check(x, y - 1);
      check(x, y + 1);
      const avg = alphaSum / count;
      if (avg < 255) {
        pixels[idx + 3] = Math.round((pixels[idx + 3] + avg) / 2);
      }
      // Also nudge the colour for soft edges so they don't look harsh.
      // (No-op for now; alpha suffices.)
    }
  }
}

// ---- PNG encoding (RGBA, 8-bit) ----
function encodePng(size, pixels) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter byte: None
    pixels.copy(
      raw,
      y * (size * 4 + 1) + 1,
      y * size * 4,
      (y + 1) * size * 4,
    );
  }
  const idatData = zlib.deflateSync(raw);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;     // bit depth
  ihdr[9] = 6;     // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idatData),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- File writers ----
function writePng(name, size) {
  const png = encodePng(size, renderIcon(size));
  const file = path.join(OUT_DIR, name);
  fs.writeFileSync(file, png);
  console.log(`  ${name.padEnd(20)} ${size}x${size}  ${png.length.toString().padStart(7)} bytes`);
}

function writeIco() {
  // Build a multi-resolution .ico containing 16, 32, 48, 64, 128, 256 px images
  // (Windows accepts PNG-encoded images inside ICO containers).
  const sizes = [16, 32, 48, 64, 128, 256];
  const pngs = sizes.map((s) => ({ size: s, data: encodePng(s, renderIcon(s)) }));

  // ICONDIR (6 bytes)
  const dir = Buffer.alloc(6);
  dir.writeUInt16LE(0, 0);     // reserved
  dir.writeUInt16LE(1, 2);     // type: 1 = ICO
  dir.writeUInt16LE(pngs.length, 4);

  // Each ICONDIRENTRY is 16 bytes
  const entries = Buffer.alloc(16 * pngs.length);
  let offset = 6 + 16 * pngs.length;

  pngs.forEach((p, i) => {
    const e = entries.slice(i * 16, (i + 1) * 16);
    e[0] = p.size === 256 ? 0 : p.size; // width (0 means 256)
    e[1] = p.size === 256 ? 0 : p.size; // height
    e[2] = 0;                          // colors (0 = no palette)
    e[3] = 0;                          // reserved
    e.writeUInt16LE(1, 4);             // planes
    e.writeUInt16LE(32, 6);            // bit count
    e.writeUInt32LE(p.data.length, 8); // size of image data
    e.writeUInt32LE(offset, 12);       // offset
    offset += p.data.length;
  });

  const ico = Buffer.concat([dir, entries, ...pngs.map((p) => p.data)]);
  fs.writeFileSync(path.join(OUT_DIR, 'icon.ico'), ico);
  console.log(`  icon.ico${' '.repeat(16)} multi-res  ${ico.length.toString().padStart(7)} bytes  (16/32/48/64/128/256)`);
}

function writeIcns() {
  // Single 256x256 PNG inside an ic07 (128x128 PNG) + ic09 (512x512 PNG) container.
  // For simplicity we use ic08 (256x256) plus ic07 (128x128) for broad support.
  const png128 = encodePng(128, renderIcon(128));
  const png256 = encodePng(256, renderIcon(256));
  const png512 = encodePng(512, renderIcon(512));

  const buildEntry = (type, png) => {
    const header = Buffer.alloc(8);
    header.write(type, 0, 'ascii');
    header.writeUInt32BE(8 + png.length, 4);
    return Buffer.concat([header, png]);
  };

  const entries = Buffer.concat([
    buildEntry('ic07', png128),
    buildEntry('ic08', png256),
    buildEntry('ic09', png512),
  ]);
  const fileHeader = Buffer.alloc(8);
  fileHeader.write('icns', 0, 'ascii');
  fileHeader.writeUInt32BE(8 + entries.length, 4);
  const icns = Buffer.concat([fileHeader, entries]);
  fs.writeFileSync(path.join(OUT_DIR, 'icon.icns'), icns);
  console.log(`  icon.icns${' '.repeat(15)} multi-res  ${icns.length.toString().padStart(7)} bytes  (128/256/512)`);
}

console.log('Generating icons:');
writePng('32x32.png', 32);
writePng('128x128.png', 128);
writePng('128x128@2x.png', 256);
writeIco();
writeIcns();
console.log('Done.');