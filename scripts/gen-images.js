import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const OUT_DIR = path.join(import.meta.dirname, "..", "assets");
const W = 1200;
const H = 630;
const BG = [24, 24, 27];
const COLORS = {
  orange: [245, 158, 11],
  blue: [59, 130, 246],
  green: [34, 197, 94],
  red: [239, 68, 68],
};

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

// Diagonal stripes so each color variant is easy to tell apart in a chat bubble.
function makePng([r1, g1, b1], [r2, g2, b2]) {
  const stride = W * 3 + 1;
  const raw = Buffer.alloc(stride * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const on = Math.floor((x + y) / 60) % 2 === 0;
      const i = y * stride + 1 + x * 3;
      raw[i] = on ? r1 : r2;
      raw[i + 1] = on ? g1 : g2;
      raw[i + 2] = on ? b1 : b2;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const [name, rgb] of Object.entries(COLORS)) {
  const png = makePng(rgb, BG);
  fs.writeFileSync(path.join(OUT_DIR, `${name}.png`), png);
  console.log(`assets/${name}.png  ${png.length} bytes`);
}
