const zlib = require('zlib');
const fs = require('fs');

function pngChunk(type, data) {
  const typeB = Buffer.from(type);
  const lenB = Buffer.alloc(4);
  lenB.writeUInt32BE(data.length, 0);
  const crc = zlib.crc32(Buffer.concat([typeB, data]));
  const crcB = Buffer.alloc(4);
  crcB.writeInt32BE(crc | 0, 0);
  return Buffer.concat([lenB, typeB, data, crcB]);
}

function makeIcon(size) {
  const raw = Buffer.alloc(size * size * 4);
  const cx = size / 2, cy = size / 2;
  const scale = size / 512;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const nx = (x - cx) / scale;
      const ny = (y - cy) / scale;

      // Circle background - soft green
      const dist = Math.sqrt(nx * nx + ny * ny);
      const r = 225;

      if (dist <= r) {
        // Background gradient
        const bg = dist / r;
        raw[i] = Math.floor(180 * (0.38 - bg * 0.1));
        raw[i + 1] = Math.floor(210 * (0.45 + bg * 0.05));
        raw[i + 2] = Math.floor(180 * (0.35 - bg * 0.05));
        raw[i + 3] = 255;

        // Tree trunk (brown rectangle)
        const trunkW = 25, trunkH = 130;
        const trunkTop = 20;
        if (Math.abs(nx) < trunkW && ny > trunkTop && ny < trunkTop + trunkH) {
          const grad = (ny - trunkTop) / trunkH;
          raw[i] = Math.floor(140 - grad * 30);
          raw[i + 1] = Math.floor(100 - grad * 20);
          raw[i + 2] = Math.floor(60 - grad * 10);
          raw[i + 3] = 255;
        }

        // Tree crown - three overlapping circles (layered green)
        // Bottom layer (largest)
        const crowns = [
          { cx: 0, cy: -50, r: 90, rr: 80, gg: 170, bb: 70 },
          { cx: -35, cy: -90, r: 75, rr: 70, gg: 180, bb: 80 },
          { cx: 35, cy: -90, r: 75, rr: 75, gg: 175, bb: 75 },
          { cx: 0, cy: -130, r: 65, rr: 90, gg: 190, bb: 90 },
          { cx: -20, cy: -140, r: 55, rr: 65, gg: 185, bb: 70 },
          { cx: 20, cy: -140, r: 55, rr: 80, gg: 180, bb: 80 },
        ];

        for (const c of crowns) {
          const cd = Math.sqrt((nx - c.cx) ** 2 + (ny - c.cy) ** 2);
          if (cd <= c.r) {
            const g = cd / c.r;
            raw[i] = Math.floor(c.rr * (0.9 - g * 0.3));
            raw[i + 1] = Math.floor(c.gg * (0.9 - g * 0.2));
            raw[i + 2] = Math.floor(c.bb * (0.9 - g * 0.3));
            raw[i + 3] = 255;
          }
        }
      }
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
fs.copyFileSync('D:/Yue/better/icon-192.png', 'D:/Yue/better/www/icon-192.png');
fs.copyFileSync('D:/Yue/better/icon-512.png', 'D:/Yue/better/www/icon-512.png');
console.log('✅ Tree icons generated!');
