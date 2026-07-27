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
 * POSTERS: each show's poster art is downloaded and cached locally to
 * ../posters/<playbill-slug>.<ext> rather than hotlinked from
 * Playbill's CDN. The URL is pulled from the og:image meta tag on each
 * show's OWN production page — NOT from an <img> tag on the listing page.
 * This was confirmed necessary by fetching a production page directly:
 * the listing page's thumbnail images are lazy-loaded via JS and come
 * back with an empty src in raw HTML, which Cheerio can't resolve, while
 * og:image is server-rendered and reliably present. This does mean one
 * extra HTTP request per NEW show (fetching its production page) — but
 * cachePoster() checks the local cache first and skips that fetch
 * entirely for any show already cached, so a normal day's run only pays
 * that cost for shows that are new since the last scrape.
 *
 * IMPORTANT: og:image itself is NOT used as-is. It points at Playbill's
 * CDN-transformed 1200x630 landscape crop (built for social-share link
 * previews), not the actual vertical Playbill cover. stripPlaybillImageTransform()
 * strips that transform segment out of the URL before downloading, which
 * — confirmed by testing directly — resolves to the original untransformed
 * cover art. Skipping this step is what produced visibly wrong/cropped
 * images in an earlier version of this scraper.
 *
 * Cache key is the Playbill production slug (from the /production/... URL),
 * NOT a title-derived slug — this avoids collisions between revivals of
 * the same title and avoids orphaning a cached poster if a title's
 * punctuation/casing shifts between scrapes. Posters for shows that drop
 * out of the merged list (closed, delisted, etc.) are deleted at the end
 * of each run. --dry-run skips both the download and the cleanup step,
 * since neither should touch disk during a dry run.
 *
 * Usage:
 *   node scrape.js                 → scrapes live, overwrites ../data/shows.json
 *   node scrape.js --dry-run       → scrapes live, prints result, does NOT write the file
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { extractSchedule, formatSchedule } = require('./schedule');

const BROADWAY_URL = 'https://playbill.com/shows/broadway';
const OFFBROADWAY_URL = 'https://playbill.com/shows/offbroadway';
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'shows.json');
const POSTER_DIR = path.join(__dirname, '..', 'posters');
const DRY_RUN = process.argv.includes('--dry-run');

// Default schedule text before a show's production page has been fetched
// (or if that fetch/parse fails). Used as a sentinel in two places: (1)
// mergeWithExisting() checks against it to decide whether to keep a prior
// hand-curated schedule instead of clobbering it, and (2) cachePoster()
// checks against it to decide whether a freshly-parsed schedule is safe to
// write in — i.e. never overwrite something a person already edited by hand.
const SCHEDULE_PLACEHOLDER = "Standard 8-show week, dark Mon — confirm exact days on the show's own site";

// Shown alongside schedule text on the site. Schedules are refreshed
// periodically (see SCHEDULE_REFRESH_DAYS) rather than every run, and
// Playbill's own schedule blocks don't reflect holiday one-offs anyway.
const SCHEDULE_DISCLAIMER = "Schedule reflects a typical week and may not include holiday performances or one-off changes — confirm before you go.";

// How often a show's schedule gets re-fetched, independent of poster
// caching. A show's production page may get fetched for its poster (new
// show) without its schedule being due for a refetch, or vice versa
// (long-running show, poster already cached, but its schedule.js result is
// getting stale) — these are two separate concerns now, tracked separately.
const SCHEDULE_REFRESH_DAYS = 14;

function daysSince(isoDateStr) {
  if (!isoDateStr) return Infinity;
  const then = new Date(isoDateStr);
  if (Number.isNaN(then.getTime())) return Infinity;
  return (Date.now() - then.getTime()) / (1000 * 60 * 60 * 24);
}

// A show's schedule is due for a refresh if it's never been successfully
// scraped, or it's been >= SCHEDULE_REFRESH_DAYS since the last successful
// scrape — UNLESS scheduleSource is 'manual', meaning a person edited the
// schedule text directly in shows.json, which this scraper must never
// overwrite regardless of age.
function scheduleNeedsRefresh(show) {
  if (show.scheduleSource === 'manual') return false;
  return daysSince(show.scheduleUpdatedAt) >= SCHEDULE_REFRESH_DAYS;
}

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

function extractPlaybillSlug(href) {
  // e.g. "/production/hadestownwalter-kerr-theatre-2018-2019" or a full URL
  // with the same path — either way, take everything after "/production/".
  const match = href.match(/\/production\/([^/?#]+)/);
  return match ? match[1] : null;
}

/**
 * Fetch a show's own Playbill production page ONCE and pull two things off
 * it: the poster URL (og:image meta tag) and the schedule block (the
 * "<p><strong>SCHEDULE:</strong>..." paragraph, parsed by ./schedule.js).
 * Combined into one function specifically so schedule extraction rides
 * along on the same fetch as poster lookup instead of adding a second
 * request per show — this only runs at all for shows whose poster isn't
 * already cached (see cachePoster()), which is the same request-minimizing
 * approach already used for posters.
 *
 * og:image is server-rendered (confirmed by fetching
 * playbill.com/production/hadestownwalter-kerr-theatre-2018-2019 directly
 * and inspecting the raw HTML head), unlike the listing page's thumbnail
 * <img> tags, which come back with an empty src because they're populated
 * client-side by JS after load.
 *
 * Schedule extraction is best-effort: not every production page has a
 * "SCHEDULE:" paragraph in the exact expected shape (closed shows, shows
 * that haven't announced performance times yet, plays that format it
 * differently — unconfirmed). extractSchedule() returns null rather than
 * throwing when it can't find/parse one, so a schedule miss never blocks
 * the poster lookup that this function is also responsible for.
 */
async function fetchProductionPageExtras(productionUrl) {
  const html = await fetchHtml(productionUrl);
  const $ = cheerio.load(html);
  const posterUrl = $('meta[property="og:image"]').attr('content') || null;

  let schedule = null;
  try {
    schedule = extractSchedule(html);
  } catch (err) {
    console.warn(`  ! schedule parse failed for ${productionUrl}: ${err.message}`);
  }

  return { posterUrl, schedule };
}

/**
 * Playbill's CDN serves cover images through a Craft CMS image-transform
 * URL segment — e.g. "_1200x630_crop_center-center_82_none/" — inserted
 * right before the filename. og:image always points at the 1200x630
 * variant (built for social-share link previews), which is a landscape
 * crop of the actual vertical Playbill cover, not the cover itself.
 *
 * CONFIRMED by testing directly: dropping the transform segment entirely
 * (https://assets.playbill.com/playbill-covers/<filename>, no folder in
 * between) still resolves and serves the original, untransformed cover —
 * the real portrait artwork, not a pre-cropped landscape slice of it.
 */
function stripPlaybillImageTransform(url) {
  return url.replace(/\/_\d+x\d+_[a-z0-9_-]+\//i, '/');
}

/**
 * Cache one show's poster image AND refresh its schedule if due — these are
 * now two independent decisions sharing one page fetch when both (or
 * either) are needed, so a long-running show with an already-cached poster
 * still gets its schedule rechecked every SCHEDULE_REFRESH_DAYS, and a
 * brand-new show gets both on its first pass.
 *
 * Failures here are non-fatal on purpose: a bad/missing poster or schedule
 * for one show shouldn't abort the whole scrape the way a zero-shows parse
 * does.
 */
async function cachePoster(show) {
  if (!show.slug || !show.productionUrl) return null;

  const cachedFile = fs.existsSync(POSTER_DIR)
    ? fs.readdirSync(POSTER_DIR).find(f => f.startsWith(`${show.slug}.`))
    : null;
  const posterCached = Boolean(cachedFile);
  const needsSchedule = scheduleNeedsRefresh(show);

  // Nothing to do at all: poster's on disk and the schedule isn't due yet.
  if (posterCached && !needsSchedule) {
    return `/posters/${cachedFile}`;
  }

  try {
    const { posterUrl: rawPosterUrl, schedule } = await fetchProductionPageExtras(show.productionUrl);

    if (needsSchedule) {
      if (schedule) {
        const darkNote = schedule.darkDays.length ? ` — dark ${schedule.darkDays.join(', ')}` : '';
        show.schedule = formatSchedule(schedule) + darkNote;
        show.scheduleSource = 'auto';
        show.scheduleUpdatedAt = new Date().toISOString().slice(0, 10);
      } else {
        console.warn(`  ! no schedule block found for "${show.title}" (${show.productionUrl}) — will retry next run`);
      }
    }

    // Poster: only act on it if it wasn't already cached. A page fetch
    // triggered purely by a due schedule refresh must NOT re-download or
    // replace an already-cached poster image.
    if (posterCached) {
      return `/posters/${cachedFile}`;
    }

    if (!rawPosterUrl) {
      console.warn(`  ! no og:image found for "${show.title}" (${show.productionUrl})`);
      return null;
    }
    const posterUrl = stripPlaybillImageTransform(rawPosterUrl);
    const ext = path.extname(new URL(posterUrl).pathname) || '.jpg';
    const filename = `${show.slug}${ext}`;

    // The page fetch above always runs, dry-run or not — only the actual
    // image download/write is skipped here, since that's the part that
    // touches disk. Returned path is what it WOULD be, so --dry-run output
    // still shows a realistic localPosterPath.
    if (DRY_RUN) {
      return `/posters/${filename}`;
    }

    const destPath = path.join(POSTER_DIR, filename);
    const res = await fetch(posterUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(destPath, buffer);
    return `/posters/${filename}`;
  } catch (err) {
    console.warn(`  ! page fetch failed for "${show.title}": ${err.message}`);
    // Poster was already on disk even though this run's attempt (poster
    // and/or schedule) failed — keep it rather than blanking it out.
    return posterCached ? `/posters/${cachedFile}` : null;
  }
}

async function cachePosters(shows) {
  if (!DRY_RUN && !fs.existsSync(POSTER_DIR)) fs.mkdirSync(POSTER_DIR, { recursive: true });

  let cached = 0;
  let fetched = 0;
  for (const show of shows) {
    const wasAlreadyCached = fs.existsSync(POSTER_DIR)
      && fs.readdirSync(POSTER_DIR).some(f => f.startsWith(`${show.slug}.`));

    show.localPosterPath = await cachePoster(show);

    if (show.localPosterPath) {
      cached++;
      if (!wasAlreadyCached) fetched++;
    }
  }
  console.log(`  → ${cached}/${shows.length} posters cached (${fetched} newly fetched this run)`);
}

/**
 * Delete any cached poster whose slug is no longer in the current merged
 * show list — i.e. the show has closed (or dropped out of Playbill's
 * listings for some other reason). Runs against the final MERGED list, not
 * the raw scrape, so it only ever acts on a known-good, fully-resolved show
 * set — never against a partial/failed scrape (which would already have
 * aborted before this point, per the zero-shows guard in main()).
 */
function cleanupClosedShowPosters(currentShows) {
  if (!fs.existsSync(POSTER_DIR)) return;

  const activeFilenames = new Set(
    currentShows
      .filter(show => show.localPosterPath)
      .map(show => path.basename(show.localPosterPath))
  );

  const existingFiles = fs.readdirSync(POSTER_DIR);
  let removed = 0;

  for (const file of existingFiles) {
    if (!activeFilenames.has(file)) {
      fs.unlinkSync(path.join(POSTER_DIR, file));
      removed++;
    }
  }

  console.log(`  → poster cleanup: removed ${removed}, ${activeFilenames.size} active`);
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
  const missingAddresses = new Set();

  // Badge labels that sit inside the SAME link as a show's thumbnail image
  // (e.g. "Trending", "2026 Tony Winner") and would otherwise get mistaken
  // for the title if we just grabbed the first link with any text.
  const BADGE_WORDS = /^(Trending|20\d\d Tony Winner)$/i;

  // Collect distinct show URLs first, THEN decide which of possibly several
  // links to that URL is the real title link — rather than processing link
  // elements one at a time, which is what let a badge label "claim" a show
  // before its real heading link was ever seen.
  const hrefs = new Set();
  $('a[href*="/production/"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) hrefs.add(href);
  });

  hrefs.forEach(href => {
    const $anchorsForHref = $(`a[href="${href}"]`);

    // The confirmed pattern on both listing pages is a heading link:
    // "### [Title](/production/...)" — i.e. the real title is wrapped in
    // an h1–h5. Prefer that anchor specifically over a thumbnail/badge link
    // that happens to share the same href.
    let $titleLink = $anchorsForHref.filter((_, a) => $(a).closest('h1,h2,h3,h4,h5').length > 0).first();

    if (!$titleLink.length) {
      // No heading match — fall back to the longest non-badge text among
      // this show's links (badge words are short, real titles are longer).
      let best = null;
      $anchorsForHref.each((_, a) => {
        const text = $(a).text().trim();
        if (!text || BADGE_WORDS.test(text)) return;
        if (!best || text.length > best.length) best = text;
      });
      if (!best) return; // every link for this show was empty or a badge word — skip rather than guess
      $titleLink = $anchorsForHref.filter((_, a) => $(a).text().trim() === best).first();
    }

    const title = $titleLink.text().trim();
    if (!title || BADGE_WORDS.test(title)) return;

    // Climb from the title link toward a card boundary. The correct
    // stopping rule is structural: never climb into a container that holds
    // links to MORE THAN ONE DISTINCT show. A single card typically has
    // several links to its OWN show (thumbnail, heading, "View Details"
    // button) — so we count distinct hrefs, not raw anchor count, or every
    // card would look "multi-show" after just one climb.
    let $card = $titleLink;
    for (let i = 0; i < 6; i++) {
      const parent = $card.parent();
      if (!parent.length) break;
      const hrefsInParent = new Set(
        parent.find('a[href*="/production/"]').map((_, a) => $(a).attr('href')).get()
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
      .replace(/Trending/gi, '')
      .replace(/20\d\d Tony Winner/gi, '')
      .trim();

    const theater = remainder || null;
    if (!theater) return;

    const address = THEATER_ADDRESSES[theater];
    if (!address) missingAddresses.add(theater);

    // Slug is the stable per-production identifier Playbill itself uses —
    // e.g. "/production/hadestownwalter-kerr-theatre-2018-2019" →
    // "hadestownwalter-kerr-theatre-2018-2019". Used as the poster cache
    // key instead of a title-derived slug: it's guaranteed unique (handles
    // revivals of the same title) and stable across minor title-text
    // changes, so cached posters don't get orphaned/re-downloaded for no
    // reason and the closed-show cleanup step can't misfire on a rename.
    const slug = extractPlaybillSlug(href);
    const productionUrl = href.startsWith('http') ? href : `https://playbill.com${href}`;

    // NOTE on poster art: the listing page's thumbnail <img> tags are
    // lazy-loaded via JS and come back with an EMPTY src in raw HTML
    // (confirmed by fetching a production page directly and inspecting
    // the markup — every gallery image rendered as `![alt](<>)`). Cheerio
    // never executes JS, so that src is unusable here. Poster URLs are
    // instead fetched per-show from each production page's og:image meta
    // tag (see fetchPosterUrl() below), which IS server-rendered and
    // confirmed present in the raw HTML. That happens later, in
    // cachePosters(), not here — this parser just records the URL to visit.

    shows.push({
      title,
      kind,
      slug,
      theater,
      productionUrl,
      address: address || `${theater}, New York, NY`,
      opened: 'TBD — not available from this source',
      closes,
      schedule: SCHEDULE_PLACEHOLDER,
      scheduleSource: null,       // 'auto' once the scraper successfully sets it, 'manual' if hand-edited
      scheduleUpdatedAt: null,    // ISO date of last successful auto-scrape; null = never fetched, always due
      discount: ["Check the show's official site or TodayTix for lottery/rush availability"],
      localPosterPath: null // filled in by cachePosters() after parsing
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
      schedule: prior.schedule || fresh.schedule,
      scheduleSource: prior.scheduleSource || fresh.scheduleSource || null,
      scheduleUpdatedAt: prior.scheduleUpdatedAt || fresh.scheduleUpdatedAt || null,
      discount: fresh.discount[0].startsWith("Check the show's official site")
        ? prior.discount
        : fresh.discount,
      // If this run's poster caching failed (bad og:image, network error,
      // etc.), fall back to whatever we already had cached rather than
      // blanking it out — cachePosters() will overwrite this with a fresh
      // value next run if the fetch succeeds.
      localPosterPath: fresh.localPosterPath || prior.localPosterPath || null
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

  console.log(DRY_RUN
    ? 'Fetching poster + schedule info (dry run — not writing image files)…'
    : 'Caching poster images…');
  await cachePosters(merged);

  if (!DRY_RUN) {
    console.log('Cleaning up posters for closed/delisted shows…');
    cleanupClosedShowPosters(merged);
  } else {
    console.log('--dry-run set, skipping poster cleanup (disk-only step).');
  }

  const output = {
    lastUpdated: new Date().toISOString().slice(0, 10),
    source: 'auto-generated by scraper/scrape.js (Playbill /shows/broadway + /shows/offbroadway)',
    scheduleDisclaimer: SCHEDULE_DISCLAIMER,
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
