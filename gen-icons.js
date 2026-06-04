const zlib = require('zlib');
const fs = require('fs');

function crc32buf(buf) { return zlib.crc32(buf); }

function pngChunk(type, data) {
  const typeB = Buffer.from(type);
  const lenB = Buffer.alloc(4);
  lenB.writeUInt32BE(data.length, 0);
  const crcIn = Buffer.concat([typeB, data]);
  const crc = crc32buf(crcIn);
  const crcB = Buffer.alloc(4);
  crcB.writeInt32BE(crc | 0, 0);
  return Buffer.concat([lenB, typeB, data, crcB]);
}

function makeIcon(size) {
  const raw = Buffer.alloc(size * size * 4);
  const cx = size / 2, cy = size * 0.45;
  const scale = size / 512;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Normalize coordinates
      const nx = (x - cx) / scale;
      const ny = (y - cy) / scale;

      // Heart shape: (x^2 + y^2 - 1)^3 - x^2*y^3 <= 0
      const hx = nx / 130, hy = -ny / 130;
      const heart = Math.pow(hx * hx + hy * hy - 1, 3) - hx * hx * hy * hy * hy;

      // Circle background
      const dist = Math.sqrt(nx * nx + ny * ny);
      const r = 220;

      if (heart <= 0.05) {
        // Heart fill - gradient from pink to coral
        const grad = Math.min(1, (ny + 80) / 200);
        const rr = Math.floor(255 * (0.95 - grad * 0.2));
        const gg = Math.floor(150 * (0.4 + grad * 0.2));
        const bb = Math.floor(180 * (0.3 + grad * 0.3));
        raw[i] = rr; raw[i + 1] = gg; raw[i + 2] = bb; raw[i + 3] = 255;
      } else if (dist <= r) {
        // Circle background - soft warm pink
        const g2 = dist / r;
        raw[i] = Math.floor(255 * (0.92 - g2 * 0.15));
        raw[i + 1] = Math.floor(180 * (0.55 + g2 * 0.15));
        raw[i + 2] = Math.floor(200 * (0.45 + g2 * 0.15));
        raw[i + 3] = 255;
      }
      // else: transparent
    }
  }

  // Build filtered scanlines
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0;
    raw.copy(row, 1, y * size * 4, (y + 1) * size * 4);
    rows.push(row);
  }
  const unfiltered = Buffer.concat(rows);
  const compressed = zlib.deflateSync(unfiltered);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

fs.writeFileSync('D:/Yue/better/icon-192.png', makeIcon(192));
fs.writeFileSync('D:/Yue/better/icon-512.png', makeIcon(512));
// Also copy to www
fs.copyFileSync('D:/Yue/better/icon-192.png', 'D:/Yue/better/www/icon-192.png');
fs.copyFileSync('D:/Yue/better/icon-512.png', 'D:/Yue/better/www/icon-512.png');
console.log('✅ Cute heart icons generated!');
