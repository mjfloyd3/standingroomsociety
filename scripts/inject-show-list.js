// Bakes a plain-HTML show list into index.html (inside <noscript>) so crawlers
// and link previewers that don't run JavaScript still see the listings.
// Runs after the scraper in the nightly workflow. Idempotent: it only rewrites
// the block between the SHOW-LIST markers.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const INDEX = path.join(ROOT, 'index.html');
const DATA = path.join(ROOT, 'data', 'shows.json');
const START = '<!-- SHOW-LIST:START -->';
const END = '<!-- SHOW-LIST:END -->';

const esc = s => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// "[Telecharge Lottery](https://...)" -> "Telecharge Lottery"
const plain = s => String(s).replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');

const { shows } = JSON.parse(fs.readFileSync(DATA, 'utf8'));

function section(heading, list) {
  if (!list.length) return '';
  const items = list.map(s => {
    const offers = (s.discount || []).map(plain).filter(Boolean);
    const meta = [s.theater, ...offers].filter(Boolean).map(esc).join(' — ');
    return `      <li><strong>${esc(s.title)}</strong>${meta ? ' — ' + meta : ''}</li>`;
  }).join('\n');
  return `    <h2>${heading}</h2>\n    <ul>\n${items}\n    </ul>\n`;
}

const block = `${START}
<noscript>
  <section aria-label="Show list">
${section('Broadway', shows.filter(s => s.kind === 'broadway'))}${section('Off-Broadway', shows.filter(s => s.kind !== 'broadway'))}  </section>
</noscript>
${END}`;

let html = fs.readFileSync(INDEX, 'utf8');
const re = new RegExp(`${START}[\\s\\S]*?${END}`);
if (!re.test(html)) {
  console.error('SHOW-LIST markers not found in index.html');
  process.exit(1);
}
html = html.replace(re, () => block);
fs.writeFileSync(INDEX, html);
console.log(`Injected ${shows.length} shows into index.html`);
