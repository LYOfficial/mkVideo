// Generate icon assets for Tauri build using a simple PNG generator.
// Creates 32x32, 128x128, 128x128@2x (256x256), .ico, and .icns placeholders.
// This script uses Node's built-in zlib + manual PNG writing to avoid native deps.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT_DIR = path.join(__dirname, '..', 'src-tauri', 'icons');
fs.mkdirSync(OUT_DIR, { recursive: true });

// CRC32 table
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

// Generate RGBA pixels for icon - simple gradient with "mk" letters rendered as blocks.
function renderIcon(size) {
  const pixels = Buffer.alloc(size * size * 4);

  // Background gradient (dark blue to purple)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = (x + y) / (size * 2);
      const r = Math.round(14 + (139 - 14) * t);
      const g = Math.round(165 + (92 - 165) * t);
      const b = Math.round(233 + (246 - 233) * t);
      const a = 255;
      const idx = (y * size + x) * 4;
      pixels[idx] = r;
      pixels[idx + 1] = g;
      pixels[idx + 2] = b;
      pixels[idx + 3] = a;
    }
  }

  // Draw rounded rectangle border for "card" feel
  const radius = Math.floor(size * 0.18);
  const pad = Math.floor(size * 0.08);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      // Inset border
      const inX = x >= pad && x < size - pad;
      const inY = y >= pad && y < size - pad;
      if (inX && inY) {
        const onCorner =
          (x < pad + radius && (y < pad + radius || y >= size - pad - radius)) ||
          (x >= size - pad - radius && (y < pad + radius || y >= size - pad - radius));
        if (onCorner) {
          const cx = x < pad + radius ? pad + radius : size - pad - radius - 1;
          const cy = y < pad + radius ? pad + radius : size - pad - radius - 1;
          const dx = x - cx;
          const dy = y - cy;
          if (dx * dx + dy * dy > radius * radius) {
            pixels[idx + 3] = 0;
            continue;
          }
        }
        pixels[idx] = 245;
        pixels[idx + 1] = 245;
        pixels[idx + 2] = 250;
      }
    }
  }

  // Draw "mk" text using simple block letters
  // Letter is rendered with size-based scaling
  const cx = Math.floor(size / 2);
  const cy = Math.floor(size / 2);
  const fontH = Math.floor(size * 0.32);
  const fontW = Math.floor(size * 0.42);
  const top = cy - Math.floor(fontH / 2);
  const left = cx - Math.floor(fontW / 2);

  // 'm' shape: 3 vertical bars with top connector
  // We'll draw a stylized mk by hand:
  function setPixel(x, y, r, g, b, a = 255) {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const idx = (y * size + x) * 4;
    pixels[idx] = r;
    pixels[idx + 1] = g;
    pixels[idx + 2] = b;
    pixels[idx + 3] = a;
  }

  const textR = 255, textG = 255, textB = 255;
  const stroke = Math.max(2, Math.floor(size * 0.06));
  const innerPad = Math.floor(size * 0.04);

  // 'm' letter
  const mLeft = left + innerPad;
  const mTop = top + innerPad;
  const mBottom = top + fontH - innerPad;
  const mW = Math.floor(fontW * 0.5);
  // 3 vertical strokes
  for (let y = mTop; y < mBottom; y++) {
    for (let dx = 0; dx < stroke; dx++) {
      setPixel(mLeft + dx, y, textR, textG, textB);
      setPixel(mLeft + Math.floor(mW * 0.5) + dx, y, textR, textG, textB);
      setPixel(mLeft + mW - dx - 1, y, textR, textG, textB);
    }
  }
  // top connector (V shape)
  for (let dx = 0; dx < mW; dx++) {
    const yOffset = Math.abs(dx - mW / 2) / (mW / 2);
    const yPos = mTop + Math.floor(yOffset * fontH * 0.3);
    for (let sy = 0; sy < stroke; sy++) {
      setPixel(mLeft + dx, yPos + sy, textR, textG, textB);
    }
  }

  // 'k' letter
  const kLeft = left + fontW - innerPad - Math.floor(fontW * 0.3);
  const kTop = top + innerPad;
  const kBottom = top + fontH - innerPad;
  const kW = Math.floor(fontW * 0.3);
  // vertical stroke
  for (let y = kTop; y < kBottom; y++) {
    for (let dx = 0; dx < stroke; dx++) {
      setPixel(kLeft + dx, y, textR, textG, textB);
    }
  }
  // diagonal arms
  const midY = Math.floor((kTop + kBottom) / 2);
  const armLen = Math.floor(kBottom - kTop) * 0.5;
  for (let i = 0; i < armLen; i++) {
    // Upper arm
    const x = kLeft + stroke + i;
    const y = midY - i;
    for (let dx = 0; dx < stroke; dx++) {
      setPixel(x + dx, y, textR, textG, textB);
    }
    // Lower arm
    const y2 = midY + i;
    for (let dx = 0; dx < stroke; dx++) {
      setPixel(x + dx, y2, textR, textG, textB);
    }
  }

  // Soft shadow at edges
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = Math.min(x, size - 1 - x);
      const dy = Math.min(y, size - 1 - y);
      const d = Math.min(dx, dy);
      if (d < 2 && pixels[idx + 3] > 0) {
        pixels[idx + 3] = Math.round(pixels[idx + 3] * 0.85);
      }
    }
  }

  return pixels;
}

function encodePng(size, pixels) {
  // Filter byte 0 (None) per scanline
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
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

// Generate icon files
function writePng(name, size) {
  const png = encodePng(size, renderIcon(size));
  const file = path.join(OUT_DIR, name);
  fs.writeFileSync(file, png);
  console.log(`Wrote ${file} (${size}x${size}, ${png.length} bytes)`);
}

writePng('32x32.png', 32);
writePng('128x128.png', 128);
writePng('128x128@2x.png', 256);

// Write .ico with embedded 32x32 PNG (Windows accepts PNG-in-ICO)
function writeIco() {
  const png = encodePng(32, renderIcon(32));
  // ICO header: 6 bytes
  // ICONDIR: reserved(2)=0, type(2)=1, count(2)=1
  // ICONDIRENTRY (16 bytes): width(1), height(1), colorCount(1), reserved(1),
  //   planes(2), bitCount(2), bytesInRes(4), imageOffset(4)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const entry = Buffer.alloc(16);
  entry[0] = 32; // width 32
  entry[1] = 32; // height 32
  entry[2] = 0;  // colors
  entry[3] = 0;  // reserved
  entry.writeUInt16LE(1, 4); // planes
  entry.writeUInt16LE(32, 6); // bit count
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(6 + 16, 12);

  const ico = Buffer.concat([header, entry, png]);
  fs.writeFileSync(path.join(OUT_DIR, 'icon.ico'), ico);
  console.log(`Wrote icon.ico (${ico.length} bytes)`);
}
writeIco();

// Write .icns (basic Apple icon set with single 128x128 PNG entry)
function writeIcns() {
  const png = encodePng(128, renderIcon(128));
  // ICNS file format:
  // header: 'icns' (4) + filesize (4)
  // entry: type (4) + size (4) + data
  // We'll use 'ic07' for 128x128 PNG.
  const entryHeader = Buffer.alloc(8);
  entryHeader.write('ic07', 0, 'ascii');
  entryHeader.writeUInt32BE(8 + png.length, 4);
  const entry = Buffer.concat([entryHeader, png]);

  const fileHeader = Buffer.alloc(8);
  fileHeader.write('icns', 0, 'ascii');
  fileHeader.writeUInt32BE(8 + entry.length, 4);
  const icns = Buffer.concat([fileHeader, entry]);
  fs.writeFileSync(path.join(OUT_DIR, 'icon.icns'), icns);
  console.log(`Wrote icon.icns (${icns.length} bytes)`);
}
writeIcns();

console.log('All icons generated.');