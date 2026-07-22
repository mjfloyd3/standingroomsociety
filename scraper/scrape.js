/**
 * scrape.js
 * Pulls current show data and writes it to ../data/shows.json
 *
 * Sources:
 *  - IBDB (ibdb.com)   → Broadway shows. IBDB is a database-backed site run by
 *                        the Broadway League, so its markup is far more stable
 *                        than editorial sites like Playbill or BroadwayWorld.
 *  - Playbill          → Off-Broadway shows. IBDB doesn't reliably cover Off-Broadway,
 *                        so Playbill's "Off-Broadway" listings page fills that gap.
 *
 * IMPORTANT — READ BEFORE RUNNING:
 * I built this against my best knowledge of each site's markup, but I could not
 * test it live (my sandbox can't reach ibdb.com or playbill.com). The selectors
 * below are marked with CALIBRATE — run `node scrape.js --dry-run` locally,
 * open the target URL in your browser, inspect the actual DOM with devtools,
 * and adjust those selectors to match. Budget 30–60 min for this the first time.
 * After that, the scraper should keep working until the sites redesign.
 *
 * Usage:
 *   node scrape.js                 → scrapes live, overwrites ../data/shows.json
 *   node scrape.js --dry-run       → scrapes live, prints result, does NOT write the file
 *   node scrape.js --skip-schedules → skips the slow per-show schedule fetch (useful while
 *                                     calibrating the listing-page selectors first)
 *
 * Note: fetching exact weekly schedules means visiting each Broadway show's own
 * IBDB page one at a time (with a delay between requests to be polite), so a
 * full run takes a few minutes rather than a few seconds. That's expected.
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const IBDB_URL = 'https://www.ibdb.com/shows/current'; // CALIBRATE: confirm this is the "currently running" listing URL
const PLAYBILL_OFFBWAY_URL = 'https://playbill.com/theatres/off-broadway'; // CALIBRATE: confirm current URL/slug
const IBDB_BASE = 'https://www.ibdb.com';
const SCHEDULE_FETCH_DELAY_MS = 800; // be polite — one request at a time, not a burst

const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'shows.json');
const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_SCHEDULES = process.argv.includes('--skip-schedules'); // handy while calibrating listing selectors first

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      // A real UA string avoids some basic bot-blocking. Be a good citizen:
      // this scraper runs once a day, not on every page load.
      'User-Agent': 'Mozilla/5.0 (compatible; StandingRoomSocietyBot/1.0; +https://github.com/YOUR_USERNAME/YOUR_REPO)'
    }
  });
  if (!res.ok) {
    throw new Error(`Fetch failed for ${url}: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

/**
 * Parse IBDB's current-shows listing into our show shape.
 * CALIBRATE: the selectors below are placeholders based on typical
 * database-listing markup (a repeated card/row per show). Open the page,
 * find the real container + field selectors, and replace these.
 */
function parseIbdb(html) {
  const $ = cheerio.load(html);
  const shows = [];

  $('.production-listing, .show-card, .listing-row').each((_, el) => {
    const $el = $(el);

    const title = $el.find('.production-title, .show-title, h3').first().text().trim();
    const theater = $el.find('.theatre-name, .venue-name').first().text().trim();
    const address = $el.find('.theatre-address, .venue-address').first().text().trim();
    const opened = $el.find('.opening-date, .opened-date').first().text().trim().replace(/^Opened:?\s*/i, '');
    const closesRaw = $el.find('.closing-date').first().text().trim().replace(/^Closed:?\s*/i, '');
    // CALIBRATE: the link to the show's own IBDB page — usually wraps the title.
    // We need this to visit the page and pull its performance-schedule table.
    const hrefRaw = $el.find('a').first().attr('href') || '';
    const detailUrl = hrefRaw ? new URL(hrefRaw, IBDB_BASE).toString() : null;

    if (!title) return; // skip anything we failed to parse — better to miss a row than write garbage

    shows.push({
      title,
      kind: 'broadway',
      theater: theater || 'TBD — confirm on IBDB',
      address: address || 'TBD — confirm on IBDB',
      opened: opened || 'TBD',
      closes: closesRaw && !/open|ongoing/i.test(closesRaw) ? closesRaw : null,
      schedule: 'Standard 8-show week, dark Mon — confirm exact days on the show\'s own site',
      discount: ['Check the show\'s official site or TodayTix for lottery/rush availability'],
      _detailUrl: detailUrl // internal only — stripped before writing shows.json
    });
  });

  return shows;
}

/**
 * Parse Playbill's Off-Broadway listing.
 * CALIBRATE: same caveat as above — placeholder selectors.
 */
function parsePlaybillOffBroadway(html) {
  const $ = cheerio.load(html);
  const shows = [];

  $('.show-listing, article.show, .card').each((_, el) => {
    const $el = $(el);

    const title = $el.find('.title, h2, h3').first().text().trim();
    const theater = $el.find('.venue, .theatre').first().text().trim();
    const address = $el.find('.address').first().text().trim();

    if (!title) return;

    shows.push({
      title,
      kind: 'off-broadway',
      theater: theater || 'TBD — confirm on Playbill',
      address: address || 'TBD — confirm on Playbill',
      opened: 'TBD — confirm on Playbill',
      closes: null,
      schedule: 'Confirm current weekly schedule on the venue\'s site',
      discount: ['Check TodayTix or the show\'s own site for rush/lottery offers']
    });
  });

  return shows;
}

/**
 * Visit a single show's IBDB page and extract its weekly performance schedule.
 * CALIBRATE: IBDB show pages typically have a "Performance Schedule" or
 * "Schedule" section listing day + time pairs (e.g. "Tuesday 7:00 PM").
 * Inspect a real show page and adjust the selector + row parsing below.
 */
function parseShowSchedule(html) {
  const $ = cheerio.load(html);

  // CALIBRATE: adjust to the real container. Common patterns on
  // database-driven sites are a definition list or table with one
  // row per performance day.
  const rows = $('.performance-schedule tr, .schedule-table tr, .schedule-list li');

  if (rows.length === 0) return null; // couldn't find it — caller keeps the generic placeholder

  const parts = [];
  rows.each((_, row) => {
    const text = $(row).text().replace(/\s+/g, ' ').trim();
    if (text) parts.push(text);
  });

  if (parts.length === 0) return null;

  // Days IBDB doesn't list a performance for are implicitly dark.
  const listedDays = parts.map(p => p.split(' ')[0]);
  const allDays = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const darkDays = allDays.filter(d => !listedDays.includes(d));
  const darkNote = darkDays.length ? ` — dark ${darkDays.map(d => d.slice(0,3)).join('/')}` : '';

  return parts.join(' · ') + darkNote;
}

/**
 * Fetch schedules for each Broadway show one at a time (politeness delay
 * between requests). Mutates each show object in place, then strips the
 * internal _detailUrl field before returning.
 */
async function attachSchedules(broadwayShows) {
  for (const show of broadwayShows) {
    if (!show._detailUrl) continue;
    try {
      await sleep(SCHEDULE_FETCH_DELAY_MS);
      const html = await fetchHtml(show._detailUrl);
      const schedule = parseShowSchedule(html);
      if (schedule) {
        show.schedule = schedule;
      }
      // else: leave the generic placeholder set in parseIbdb() — the
      // merge step will fall back to any prior hand-curated value.
    } catch (err) {
      console.warn(`  ! couldn't fetch schedule for "${show.title}": ${err.message}`);
      // leave the generic placeholder — don't let one bad page abort the run
    }
    delete show._detailUrl;
  }
  return broadwayShows;
}

/**
 * Merge freshly-scraped shows with the existing JSON file:
 *  - Preserve any manually-curated fields (like a hand-written schedule)
 *    for shows we already know about, keyed by title.
 *  - Add new shows we haven't seen before.
 *  - Drop shows no longer present in either source (they've closed).
 */
function mergeWithExisting(scraped, existing) {
  const existingByTitle = new Map(existing.shows.map(s => [s.title, s]));

  const merged = scraped.map(fresh => {
    const prior = existingByTitle.get(fresh.title);
    if (!prior) return fresh; // brand new show
    // Keep the previously curated schedule/discount text if the scraper
    // only returned a generic placeholder — avoids clobbering good data
    // with "TBD" on days the scrape partially fails.
    return {
      ...fresh,
      schedule: fresh.schedule.startsWith('Standard 8-show week, dark Mon — confirm')
        ? prior.schedule
        : fresh.schedule,
      discount: fresh.discount[0].startsWith('Check the show')
        ? prior.discount
        : fresh.discount
    };
  });

  return merged;
}

async function main() {
  console.log('Fetching IBDB (Broadway)…');
  const ibdbHtml = await fetchHtml(IBDB_URL);
  const broadwayShows = parseIbdb(ibdbHtml);
  console.log(`  → parsed ${broadwayShows.length} Broadway shows`);

  if (SKIP_SCHEDULES) {
    broadwayShows.forEach(s => delete s._detailUrl);
    console.log('  --skip-schedules set, leaving generic schedule placeholders');
  } else {
    console.log(`  → fetching individual schedules (${SCHEDULE_FETCH_DELAY_MS}ms delay between requests, this takes a while)…`);
    await attachSchedules(broadwayShows);
  }

  console.log('Fetching Playbill (Off-Broadway)…');
  const playbillHtml = await fetchHtml(PLAYBILL_OFFBWAY_URL);
  const offBroadwayShows = parsePlaybillOffBroadway(playbillHtml);
  console.log(`  → parsed ${offBroadwayShows.length} Off-Broadway shows`);

  const scraped = [...broadwayShows, ...offBroadwayShows];

  if (scraped.length === 0) {
    console.error('Scraped zero shows from both sources — selectors are almost');
    console.error('certainly stale. Aborting without touching shows.json.');
    process.exit(1);
  }

  const existing = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
  const merged = mergeWithExisting(scraped, existing);

  const output = {
    lastUpdated: new Date().toISOString().slice(0, 10),
    source: 'auto-generated by scraper/scrape.js (IBDB + Playbill)',
    shows: merged
  };

  if (DRY_RUN) {
    console.log('--dry-run set, not writing file. Result:');
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n');
  console.log(`Wrote ${merged.length} shows to ${OUTPUT_PATH}`);
}

main().catch(err => {
  console.error('Scrape failed:', err.message);
  // Exit non-zero so the GitHub Action does NOT commit a broken/empty file.
  process.exit(1);
});
