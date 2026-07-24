/**
 * scrape.js
 * Pulls current show data and writes it to ../data/shows.json
 *
 * SOURCE: Playbill (playbill.com) for BOTH Broadway and Off-Broadway.
 *
 * IBDB was the original plan but is dropped entirely — it returns 403
 * Forbidden to automated requests (confirmed with both a plain fetch and a
 * realistic browser User-Agent), which points to real bot-detection
 * infrastructure that a simple HTTP request can't get past. Rather than
 * take on a headless-browser dependency for this, we pivoted to Playbill,
 * which I fetched and read directly — confirmed working, no blocking.
 *
 * CONFIRMED July 2026 (fetched and read directly, not guessed):
 *  - https://playbill.com/shows/broadway and .../shows/offbroadway use the
 *    SAME card-grid layout: each show is a "### [Title](/production/...)"
 *    heading, optionally followed by a "Closes <date>" line (limited-run
 *    shows only — open-ended shows have no closing line), then a theater
 *    name line.
 *  - Neither listing page includes street address or opening date. Street
 *    addresses are supplied from a small static lookup table below (theater
 *    buildings don't move, so this needs updating only when a new venue
 *    opens — far less maintenance than scraping it fresh every day).
 *    Opening dates are NOT available from this source; shows without a
 *    prior known value will show "TBD" until filled in by hand or a future
 *    scraper enhancement pulls them from Playbill's "What's Currently
 *    Playing" article (playbill.com/article/whats-currently-playing-on-broadway),
 *    which does have them but in a harder-to-parse prose format.
 *
 * CALIBRATION STATUS: the card-parsing logic climbs from each show's <a
 * href="/production/..."> link up to a small ancestor container and reads
 * its text — this avoids depending on specific CSS class names (which I
 * could not inspect directly, since my fetch tool renders pages to
 * markdown/text rather than exposing raw HTML with classes). This should
 * be resilient to minor styling changes but has NOT been run against the
 * live site yet. Please run --dry-run and sanity-check a handful of shows
 * before trusting a full run.
 *
 * Usage:
 *   node scrape.js                 → scrapes live, overwrites ../data/shows.json
 *   node scrape.js --dry-run       → scrapes live, prints result, does NOT write the file
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const BROADWAY_URL = 'https://playbill.com/shows/broadway';
const OFFBROADWAY_URL = 'https://playbill.com/shows/offbroadway';
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'shows.json');
const DRY_RUN = process.argv.includes('--dry-run');

// Static theater address lookup. Buildings don't move, so this is a
// one-time cost, not an ongoing scrape target. Add a line here whenever a
// new venue shows up in scraper output as missing an address (the scraper
// will warn you by name when that happens).
const THEATER_ADDRESSES = {
  "Al Hirschfeld Theatre": "302 W 45th St, New York, NY 10036",
  "Ambassador Theatre": "219 W 49th St, New York, NY 10019",
  "August Wilson Theatre": "245 W 52nd St, New York, NY 10019",
  "Belasco Theatre": "111 W 44th St, New York, NY 10036",
  "Bernard B. Jacobs Theatre": "242 W 45th St, New York, NY 10036",
  "Booth Theatre": "222 W 45th St, New York, NY 10036",
  "Broadhurst Theatre": "235 W 44th St, New York, NY 10036",
  "Broadway Theatre": "1681 Broadway (at W. 53rd St.), New York, NY 10019",
  "Circle in the Square Theatre": "235 W 50th St, New York, NY 10019",
  "Ethel Barrymore Theatre": "243 W 47th St, New York, NY 10036",
  "Eugene O'Neill Theatre": "230 W 49th St, New York, NY 10019",
  "Gerald Schoenfeld Theatre": "236 W 45th St, New York, NY 10036",
  "Gershwin Theatre": "222 W 51st St, New York, NY 10019",
  "Hayes Theater": "240 W 44th St, New York, NY 10036",
  "Hudson Theatre": "139-141 W 44th St, New York, NY 10036",
  "Imperial Theatre": "249 W 45th St, New York, NY 10036",
  "James Earl Jones Theatre": "138 W 48th St, New York, NY 10036",
  "John Golden Theatre": "252 W 45th St, New York, NY 10036",
  "Lena Horne Theatre": "256 W 47th St, New York, NY 10036",
  "Longacre Theatre": "220 W 48th St, New York, NY 10036",
  "Lunt-Fontanne Theatre": "205 W 46th St, New York, NY 10036",
  "Lyceum Theatre": "149 W 45th St, New York, NY 10036",
  "Lyric Theatre": "213 W 42nd St, New York, NY 10036",
  "Majestic Theatre": "245 W 44th St, New York, NY 10036",
  "Marquis Theatre": "1535 Broadway (between 45th and 46th Streets), New York, NY 10036",
  "Minskoff Theatre": "200 W 45th St, New York, NY 10036",
  "Music Box Theatre": "239 W 45th St, New York, NY 10036",
  "Nederlander Theatre": "208 W 41st St, New York, NY 10036",
  "Neil Simon Theatre": "250 W 52nd St, New York, NY 10019",
  "New Amsterdam Theatre": "214 W 42nd St, New York, NY 10036",
  "Palace Theatre": "160 W 47th St, New York, NY 10036",
  "Richard Rodgers Theatre": "226 W 46th St, New York, NY 10036",
  "Samuel J. Friedman Theatre": "261 W 47th St, New York, NY 10036",
  "Shubert Theatre": "225 W 44th St, New York, NY 10036",
  "St. James Theatre": "246 W 44th St, New York, NY 10036",
  "Stephen Sondheim Theatre": "124 W 43rd St, New York, NY 10036",
  "Studio 54": "254 W 54th St, New York, NY 10019",
  "Todd Haimes Theatre": "227 W 42nd St, New York, NY 10036",
  "Vivian Beaumont Theater": "150 W 65th St, New York, NY 10023",
  "Vivian Beaumont Theatre": "150 W 65th St, New York, NY 10023",
  "Walter Kerr Theatre": "219 W 48th St, New York, NY 10036",
  "Winter Garden Theatre": "1634 Broadway (at W. 50th St.), New York, NY 10019",
  "New World Stages Stage 1": "340 W 50th St, New York, NY 10019",
  "New World Stages Stage 2": "340 W 50th St, New York, NY 10019",
  "New World Stages Stage 3": "340 W 50th St, New York, NY 10019",
  "New World Stages Stage 4": "340 W 50th St, New York, NY 10019",
  "New World Stages Stage 5": "340 W 50th St, New York, NY 10019",
  "Laura Pels Theatre": "111 W 46th St, New York, NY 10036",
  "Mitzi E. Newhouse Theatre": "150 W 65th St, New York, NY 10023",
  "Claire Tow Theater": "150 W 65th St, New York, NY 10023"
};

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });
  if (!res.ok) {
    throw new Error(`Fetch failed for ${url}: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

/**
 * Parse a Playbill listing page (/shows/broadway or /shows/offbroadway —
 * confirmed identical structure) into our show shape.
 *
 * Strategy: find each show's detail-page link, then climb up a few parent
 * levels to the smallest ancestor whose text is short enough to be a single
 * card (not the whole page). This avoids hardcoding CSS class names I
 * couldn't inspect directly.
 */
function parsePlaybillListing(html, kind) {
  const $ = cheerio.load(html);
  const shows = [];
  const seen = new Set();
  const missingAddresses = new Set();

  $('a[href*="/production/"]').each((_, el) => {
    const $link = $(el);
    const href = $link.attr('href') || '';
    if (!href || seen.has(href)) return;

    const title = $link.text().trim();
    if (!title) return;

    seen.add(href);

    // Climb from the link toward a card boundary. The correct stopping
    // rule is structural: never climb into a container that holds links to
    // MORE THAN ONE DISTINCT show. Note a single card typically has several
    // links to its OWN show (thumbnail image, heading, "View Details"
    // button) — so we count distinct hrefs, not raw anchor count, or every
    // card would look "multi-show" after just one climb.
    let $card = $link;
    for (let i = 0; i < 6; i++) {
      const parent = $card.parent();
      if (!parent.length) break;
      const hrefsInParent = new Set(
        parent.find('a[href*="/production/"]').map((i, a) => $(a).attr('href')).get()
      );
      if (hrefsInParent.size > 1) break; // parent spans multiple shows — stop here
      $card = parent;
    }

    const cardText = $card.text().replace(/\s+/g, ' ').trim();

    const closesMatch = cardText.match(/Closes\s+([A-Z][a-z]{2,8}\s+\d{1,2},\s+\d{4})/);
    const closes = closesMatch ? closesMatch[1] : null;

    let remainder = cardText
      .replace(title, '')
      .replace(/Closes\s+[A-Z][a-z]{2,8}\s+\d{1,2},\s+\d{4}/, '')
      .replace(/Begins Previews\s+[A-Z][a-z]{2,8}\s+\d{1,2},\s+\d{4}/, '')
      .replace(/In Previews\s*\|?\s*Opens\s+[A-Z][a-z]{2,8}\s+\d{1,2},\s+\d{4}/, '')
      .replace(/View Details.*$/, '')
      .replace(/Buy Tickets.*$/, '')
      .replace(/Trending/, '')
      .replace(/2026 Tony Winner/, '')
      .trim();

    const theater = remainder || null;
    if (!theater) return;

    const address = THEATER_ADDRESSES[theater];
    if (!address) missingAddresses.add(theater);

    shows.push({
      title,
      kind,
      theater,
      address: address || `${theater}, New York, NY`,
      opened: 'TBD — not available from this source',
      closes,
      schedule: "Standard 8-show week, dark Mon — confirm exact days on the show's own site",
      discount: ["Check the show's official site or TodayTix for lottery/rush availability"]
    });
  });

  if (missingAddresses.size > 0) {
    console.warn(`  ! no address on file for: ${[...missingAddresses].join(', ')}`);
    console.warn(`    add these to THEATER_ADDRESSES in scrape.js for accurate street addresses`);
  }

  return shows;
}

/**
 * Merge freshly-scraped shows with the existing JSON file: preserve any
 * hand-curated schedule/discount text for shows we already know about
 * (keyed by title) instead of clobbering it with the generic placeholder.
 */
function mergeWithExisting(scraped, existing) {
  const existingByTitle = new Map(existing.shows.map(s => [s.title, s]));

  return scraped.map(fresh => {
    const prior = existingByTitle.get(fresh.title);
    if (!prior) return fresh;
    return {
      ...fresh,
      opened: fresh.opened.startsWith('TBD') && prior.opened ? prior.opened : fresh.opened,
      schedule: fresh.schedule.startsWith('Standard 8-show week, dark Mon — confirm')
        ? prior.schedule
        : fresh.schedule,
      discount: fresh.discount[0].startsWith("Check the show's official site")
        ? prior.discount
        : fresh.discount
    };
  });
}

async function main() {
  console.log('Fetching Playbill (Broadway)…');
  const broadwayHtml = await fetchHtml(BROADWAY_URL);
  const broadwayShows = parsePlaybillListing(broadwayHtml, 'broadway');
  console.log(`  → parsed ${broadwayShows.length} Broadway shows`);

  console.log('Fetching Playbill (Off-Broadway)…');
  const offBroadwayHtml = await fetchHtml(OFFBROADWAY_URL);
  const offBroadwayShows = parsePlaybillListing(offBroadwayHtml, 'off-broadway');
  console.log(`  → parsed ${offBroadwayShows.length} Off-Broadway shows`);

  const scraped = [...broadwayShows, ...offBroadwayShows];

  if (scraped.length === 0) {
    console.error('Scraped zero shows — the card-parsing heuristic is almost');
    console.error('certainly broken against the live page. Aborting without');
    console.error('touching shows.json.');
    process.exit(1);
  }

  const existing = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
  const merged = mergeWithExisting(scraped, existing);

  const output = {
    lastUpdated: new Date().toISOString().slice(0, 10),
    source: 'auto-generated by scraper/scrape.js (Playbill /shows/broadway + /shows/offbroadway)',
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
  process.exit(1);
});
