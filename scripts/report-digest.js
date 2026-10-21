/**
 * report-digest.js
 * Emails a summary of the previous day's visitor reports (midnight to
 * midnight, New York time). Run daily by .github/workflows/update-shows.yml.
 *
 * Reads reports with the site's public key — the same read access every
 * visitor has (see supabase/schema.sql) — so no Supabase secret is needed.
 * Sends through Resend (resend.com). Using Resend's onboarding@resend.dev
 * sender needs no domain setup but only delivers to the address the Resend
 * account was created with.
 *
 * Env:
 *   RESEND_API_KEY  (required) Resend API key
 *   DIGEST_TO       (required) where the digest goes
 *   DIGEST_DATE     (optional) YYYY-MM-DD to report on instead of yesterday
 *   DRY_RUN=1       (optional) print the email instead of sending it
 *
 * No email is sent on days with no reports.
 */

const fs = require('fs');
const path = require('path');

// Same values as reports-store.js.
const SUPABASE_URL = 'https://hislyjocmhuozgxyyltw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_q1Ut_sj4I-NbNMRFciGOSQ_XPcnuWGs';
const SITE_TZ = 'America/New_York';
const SHOWS_PATH = path.join(__dirname, '..', 'data', 'shows.json');

const METHODS = { rush: 'Rush', standing_room: 'Standing room', lottery: 'Lottery' };

const DRY_RUN = process.env.DRY_RUN === '1';

// "GMT-4" → -240: New York's UTC offset in minutes at a given instant.
function nyOffsetMinutes(date) {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: SITE_TZ, timeZoneName: 'shortOffset' })
    .formatToParts(date).find(p => p.type === 'timeZoneName').value;
  const m = name.match(/GMT([+-]\d+)(?::(\d+))?/);
  if (!m) return 0;
  const sign = m[1].startsWith('-') ? -1 : 1;
  return Number(m[1]) * 60 + sign * Number(m[2] || 0);
}

// The UTC instant of midnight in New York on a YYYY-MM-DD date.
function nyMidnight(ymd) {
  const asUtc = new Date(`${ymd}T00:00:00Z`);
  return new Date(asUtc.getTime() - nyOffsetMinutes(asUtc) * 60000);
}

function nyDate(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: SITE_TZ }).format(date); // YYYY-MM-DD
}

function addDays(ymd, n) {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

async function fetchReports(start, end) {
  const params = new URLSearchParams({
    select: 'show_slug, method, got_ticket, price_paid, standing_room_available, shared_by, created_at',
    order: 'created_at.asc'
  });
  params.append('created_at', `gte.${start.toISOString()}`);
  params.append('created_at', `lt.${end.toISOString()}`);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/reports?${params}`, {
    headers: { apikey: SUPABASE_KEY }
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

// e.g. "Rush · Got a ticket · $40 · Standing room available" — same wording as the site.
function describe(r) {
  const parts = [METHODS[r.method] || r.method, r.got_ticket ? 'Got a ticket' : 'No ticket'];
  if (r.price_paid !== null) parts.push(`$${Number(r.price_paid).toFixed(2).replace(/\.00$/, '')}`);
  if (r.standing_room_available !== null) {
    parts.push(r.standing_room_available ? 'Standing room available' : 'Standing room not available');
  }
  return parts.join(' · ');
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function buildEmail(reports, titleBySlug, label) {
  const bySlug = new Map();
  for (const r of reports) {
    if (!bySlug.has(r.show_slug)) bySlug.set(r.show_slug, []);
    bySlug.get(r.show_slug).push(r);
  }
  const groups = [...bySlug].map(([slug, rows]) => ({ title: titleBySlug.get(slug) || slug, rows }))
    .sort((a, b) => a.title.localeCompare(b.title));

  const time = iso => new Date(iso).toLocaleTimeString('en-US', { timeZone: SITE_TZ, hour: 'numeric', minute: '2-digit' });
  const n = reports.length;
  const subject = `${n} new visitor report${n === 1 ? '' : 's'} — ${label}`;

  const text = [
    `${n} report${n === 1 ? '' : 's'} on ${label} (New York time):`,
    ...groups.flatMap(g => ['', g.title, ...g.rows.map(r => `  ${time(r.created_at)}  ${describe(r)}  (${r.shared_by})`)])
  ].join('\n');

  const html = `<p>${n} report${n === 1 ? '' : 's'} on ${esc(label)} (New York time):</p>` +
    groups.map(g => `<h3 style="margin:16px 0 4px">${esc(g.title)}</h3><ul style="margin:0;padding-left:20px">` +
      g.rows.map(r => `<li>${esc(time(r.created_at))} · ${esc(describe(r))} <span style="color:#666">(${esc(r.shared_by)})</span></li>`).join('') +
      '</ul>').join('');

  return { subject, text, html };
}

async function sendEmail({ subject, text, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Standing Room Society <onboarding@resend.dev>',
      to: [process.env.DIGEST_TO],
      subject, text, html
    })
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

async function main() {
  if (!DRY_RUN && (!process.env.RESEND_API_KEY || !process.env.DIGEST_TO)) {
    throw new Error('RESEND_API_KEY and DIGEST_TO must be set (GitHub repo → Settings → Secrets and variables → Actions)');
  }

  const day = process.env.DIGEST_DATE || addDays(nyDate(new Date()), -1);
  const reports = await fetchReports(nyMidnight(day), nyMidnight(addDays(day, 1)));
  const label = new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' });
  console.log(`${reports.length} report(s) on ${day}`);
  if (reports.length === 0) return;

  const shows = JSON.parse(fs.readFileSync(SHOWS_PATH, 'utf8')).shows;
  const titleBySlug = new Map(shows.filter(s => s.slug).map(s => [s.slug, s.title]));
  const email = buildEmail(reports, titleBySlug, label);

  if (DRY_RUN) {
    console.log(`Subject: ${email.subject}\n\n${email.text}`);
    return;
  }
  await sendEmail(email);
  console.log(`Sent to digest recipient: ${email.subject}`);
}

main().catch(err => {
  console.error('Digest failed:', err.message);
  process.exit(1);
});
