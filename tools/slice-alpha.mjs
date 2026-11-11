// Slice a transparent sticker sheet into one square RGBA file per grid cell.
// Pixels are grouped into connected components; each component goes to the cell
// that contains its centroid, so parts that poke over a cell border are kept whole.
// Usage: node slice-alpha.mjs <sheet.rgba> <W> <H> <cols> <rows> <outDir> <name1,name2,...> [pad]
import fs from 'node:fs';
import path from 'node:path';

const [, , inPath, wArg, hArg, cArg, rArg, outDir, namesArg, padArg] = process.argv;
const W = +wArg, H = +hArg, cols = +cArg, rows = +rArg, pad = +(padArg || 10);
const names = namesArg.split(',');
const src = fs.readFileSync(inPath);
const N = W * H;
const solid = (i) => src[i * 4 + 3] > 10;

const label = new Int32Array(N).fill(-1);
const queue = new Int32Array(N);
const comps = []; // { cell, x0, y0, x1, y1 }
for (let i = 0; i < N; i++) {
  if (!solid(i) || label[i] !== -1) continue;
  const id = comps.length;
  let head = 0, tail = 0, sx = 0, sy = 0, x0 = W, y0 = H, x1 = 0, y1 = 0;
  queue[tail++] = i; label[i] = id;
  while (head < tail) {
    const j = queue[head++], x = j % W, y = (j / W) | 0;
    sx += x; sy += y;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const k = yy * W + xx;
      if (label[k] === -1 && solid(k)) { label[k] = id; queue[tail++] = k; }
    }
  }
  const cx = sx / tail, cy = sy / tail;
  const cell = Math.min(rows - 1, Math.floor(cy / (H / rows))) * cols + Math.min(cols - 1, Math.floor(cx / (W / cols)));
  comps.push({ cell, x0, y0, x1, y1, area: tail });
}

fs.mkdirSync(outDir, { recursive: true });
const report = [];
for (let c = 0; c < cols * rows; c++) {
  const mine = comps.map((m, id) => ({ ...m, id })).filter((m) => m.cell === c && m.area >= 12);
  if (!mine.length) { report.push({ name: names[c], empty: true }); continue; }
  const ids = new Set(mine.map((m) => m.id));
  const x0 = Math.min(...mine.map((m) => m.x0)), y0 = Math.min(...mine.map((m) => m.y0));
  const x1 = Math.max(...mine.map((m) => m.x1)), y1 = Math.max(...mine.map((m) => m.y1));
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, side = Math.max(bw, bh) + pad * 2;
  const ox = Math.floor((side - bw) / 2), oy = Math.floor((side - bh) / 2);
  const out = Buffer.alloc(side * side * 4);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * W + x;
    if (!ids.has(label[i])) continue;
    const o = ((y - y0 + oy) * side + (x - x0 + ox)) * 4;
    out[o] = src[i * 4]; out[o + 1] = src[i * 4 + 1]; out[o + 2] = src[i * 4 + 2]; out[o + 3] = src[i * 4 + 3];
  }
  fs.writeFileSync(path.join(outDir, `${names[c]}.rgba`), out);
  report.push({ name: names[c], side, parts: mine.length });
}
console.log(JSON.stringify(report));
