// Builds assets/js/icons.js: an inline SVG sprite made from Phosphor Icons (MIT).
// Usage: node build-icons.mjs <out.js>
import fs from 'node:fs';

const VERSION = '2.1.1';
const BASE = `https://cdn.jsdelivr.net/npm/@phosphor-icons/core@${VERSION}/assets`;

const bold = [
  'house', 'book-open', 'heart', 'download-simple', 'user', 'bell', 'arrow-right', 'arrow-left',
  'caret-left', 'caret-right', 'caret-down', 'bookmark-simple', 'share-fat', 'magnifying-glass', 'x',
  'check', 'eye', 'eye-slash', 'envelope-simple', 'lock-key', 'trash', 'sign-out', 'pencil-simple',
  'plus', 'question', 'gear-six', 'clock', 'users-three', 'user-circle', 'stack', 'list', 'smiley',
  'arrow-counter-clockwise', 'cake', 'table', 'chart-bar'
];
const fill = [
  'house', 'book-open', 'heart', 'download-simple', 'user', 'bell', 'star', 'play', 'pause',
  'bookmark-simple', 'check-circle', 'warning-circle', 'info', 'sparkle', 'shield-check', 'trophy',
  'medal', 'fire', 'rocket-launch', 'moon-stars', 'compass', 'paw-print', 'crown', 'play-circle',
  'calendar-check', 'calendar-star', 'timer', 'chart-bar', 'cloud-arrow-down', 'clock', 'users-three',
  'lightbulb', 'hand-waving', 'gift', 'lightning', 'smiley', 'squares-four', 'lock-key', 'hard-drives',
  'stack', 'magic-wand', 'mountains', 'lamp', 'hourglass-medium', 'device-mobile', 'television-simple',
  'x-circle', 'share-fat', 'trash', 'gear-six', 'hand-heart', 'cloud-check', 'wifi-slash', 'seal-check'
];

const jobs = [
  ...bold.map((n) => ({ id: `i-${n}`, url: `${BASE}/bold/${n}-bold.svg` })),
  ...fill.map((n) => ({ id: `i-${n}-fill`, url: `${BASE}/fill/${n}-fill.svg` }))
];

const symbols = [];
const missing = [];
for (const job of jobs) {
  const res = await fetch(job.url);
  if (!res.ok) { missing.push(job.id); continue; }
  const svg = await res.text();
  const m = svg.match(/<svg[^>]*viewBox="([^"]+)"[^>]*>([\s\S]*)<\/svg>/);
  if (!m) { missing.push(job.id + ' (parse)'); continue; }
  // keep only shape elements; refuse anything script-like
  const inner = m[2].trim();
  if (/<script|on\w+=|href=|<foreignObject/i.test(inner)) { missing.push(job.id + ' (unsafe)'); continue; }
  symbols.push(`<symbol id="${job.id}" viewBox="${m[1]}">${inner}</symbol>`);
}

const sprite = `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden">${symbols.join('')}</svg>`;
const out = `/*
 * رواد — أيقونات الواجهة (SVG sprite)
 * المصدر: Phosphor Icons v${VERSION} — رخصة MIT — https://phosphoricons.com
 * الاستخدام: <svg class="ico" aria-hidden="true"><use href="#i-heart-fill"/></svg>
 * الأسماء: i-<name> للخط العريض، i-<name>-fill للمصمت.
 */
(function () {
  var sprite = ${JSON.stringify(sprite)};
  function inject() { document.body.insertAdjacentHTML('afterbegin', sprite); }
  if (document.body) inject(); else document.addEventListener('DOMContentLoaded', inject);
})();
`;
fs.writeFileSync(process.argv[2], out);
console.log(JSON.stringify({ built: symbols.length, missing, kb: Math.round(out.length / 1024) }));
