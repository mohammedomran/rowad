// Cut a subject out of a near-white background (flood fill from the borders),
// optionally add a white "sticker" outline, and trim to the bounding box.
// Usage: node cutout.mjs <in.rgba> <width> <height> <out.rgba> [--thr 250.5] [--stroke 14] [--pad 6] [--min 40]
// Prints the trimmed size as JSON so the caller can hand it to ffmpeg.
import fs from 'node:fs';

const [, , inPath, wArg, hArg, outPath, ...rest] = process.argv;
const opt = { thr: 250.5, stroke: 14, pad: 6, min: 40 };
for (let i = 0; i < rest.length; i += 2) opt[rest[i].replace(/^--/, '')] = parseFloat(rest[i + 1]);

const W = +wArg, H = +hArg, N = W * H;
const src = fs.readFileSync(inPath);
if (src.length !== N * 4) throw new Error(`size mismatch: ${src.length} vs ${N * 4}`);

// 1) brightness field = min(r,g,b), 3x3 box-blurred to tame noise
const mn = new Float32Array(N);
for (let i = 0; i < N; i++) mn[i] = Math.min(src[i * 4], src[i * 4 + 1], src[i * 4 + 2]);
const sm = new Float32Array(N);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    let s = 0, c = 0;
    for (let dy = -1; dy <= 1; dy++) {
      const yy = y + dy; if (yy < 0 || yy >= H) continue;
      for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx; if (xx < 0 || xx >= W) continue;
        s += mn[yy * W + xx]; c++;
      }
    }
    sm[y * W + x] = s / c;
  }
}

// 2) flood fill the background from every border pixel (4-connected)
const bg = new Uint8Array(N);
const stack = new Int32Array(N);
let sp = 0;
const push = (i) => { if (!bg[i] && sm[i] >= opt.thr) { bg[i] = 1; stack[sp++] = i; } };
for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
while (sp) {
  const i = stack[--sp], x = i % W, y = (i / W) | 0;
  if (x > 0) push(i - 1);
  if (x < W - 1) push(i + 1);
  if (y > 0) push(i - W);
  if (y < H - 1) push(i + W);
}

// 3) drop tiny foreground specks (noise islands)
const fg = new Uint8Array(N);
for (let i = 0; i < N; i++) fg[i] = bg[i] ? 0 : 1;
const seen = new Uint8Array(N);
for (let i = 0; i < N; i++) {
  if (!fg[i] || seen[i]) continue;
  let head = 0, tail = 0; stack[tail++] = i; seen[i] = 1;
  while (head < tail) {
    const j = stack[head++], x = j % W, y = (j / W) | 0;
    const nb = [x > 0 ? j - 1 : -1, x < W - 1 ? j + 1 : -1, y > 0 ? j - W : -1, y < H - 1 ? j + W : -1];
    for (const k of nb) if (k >= 0 && fg[k] && !seen[k]) { seen[k] = 1; stack[tail++] = k; }
  }
  if (tail < opt.min) for (let k = 0; k < tail; k++) fg[stack[k]] = 0;
}

// 4) chamfer (3-4) distance to the foreground, for the outline + anti-aliasing
const INF = 1e9;
const d = new Float32Array(N);
for (let i = 0; i < N; i++) d[i] = fg[i] ? 0 : INF;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x; let v = d[i]; if (v === 0) continue;
  if (x > 0) v = Math.min(v, d[i - 1] + 3);
  if (y > 0) { v = Math.min(v, d[i - W] + 3); if (x > 0) v = Math.min(v, d[i - W - 1] + 4); if (x < W - 1) v = Math.min(v, d[i - W + 1] + 4); }
  d[i] = v;
}
for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
  const i = y * W + x; let v = d[i]; if (v === 0) continue;
  if (x < W - 1) v = Math.min(v, d[i + 1] + 3);
  if (y < H - 1) { v = Math.min(v, d[i + W] + 3); if (x < W - 1) v = Math.min(v, d[i + W + 1] + 4); if (x > 0) v = Math.min(v, d[i + W - 1] + 4); }
  d[i] = v;
}

// 5) compose RGBA
const out = Buffer.alloc(N * 4);
let x0 = W, y0 = H, x1 = -1, y1 = -1;
for (let i = 0; i < N; i++) {
  let a;
  if (fg[i]) {
    out[i * 4] = src[i * 4]; out[i * 4 + 1] = src[i * 4 + 1]; out[i * 4 + 2] = src[i * 4 + 2]; a = 255;
  } else {
    const dist = d[i] / 3;
    const cover = opt.stroke > 0 ? Math.max(0, Math.min(1, opt.stroke + 0.5 - dist)) : Math.max(0, Math.min(1, 1 - dist));
    out[i * 4] = 255; out[i * 4 + 1] = 255; out[i * 4 + 2] = 255; a = Math.round(cover * 255);
    if (opt.stroke <= 0 && a > 0) { // no outline: feather with the original edge colour
      out[i * 4] = src[i * 4]; out[i * 4 + 1] = src[i * 4 + 1]; out[i * 4 + 2] = src[i * 4 + 2];
    }
  }
  out[i * 4 + 3] = a;
  if (a > 8) { const x = i % W, y = (i / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
}

// 6) trim to bbox (+pad)
x0 = Math.max(0, x0 - opt.pad); y0 = Math.max(0, y0 - opt.pad);
x1 = Math.min(W - 1, x1 + opt.pad); y1 = Math.min(H - 1, y1 + opt.pad);
const tw = x1 - x0 + 1, th = y1 - y0 + 1;
const trimmed = Buffer.alloc(tw * th * 4);
for (let y = 0; y < th; y++) out.copy(trimmed, y * tw * 4, ((y + y0) * W + x0) * 4, ((y + y0) * W + x0 + tw) * 4);
fs.writeFileSync(outPath, trimmed);
console.log(JSON.stringify({ w: tw, h: th, x0, y0 }));
