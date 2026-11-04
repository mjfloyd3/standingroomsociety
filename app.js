let shows = []; // filled once data/shows.json loads
const cardList = document.getElementById('cardList');
const emptyMsg = document.getElementById('emptyMsg');
const updatedEl = document.getElementById('updatedText');
let activeFilter = 'all';
let searchQuery = '';

async function loadShowData(){
  try{
    const res = await fetch('data/shows.json', { cache: 'no-store' });
    if(!res.ok) throw new Error('Bad response: ' + res.status);
    const data = await res.json();
    if(!Array.isArray(data.shows) || data.shows.length === 0){
      throw new Error('shows.json had no shows');
    }
    shows = data.shows;
    if(updatedEl && data.lastUpdated){
      const formatted = new Date(data.lastUpdated + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      updatedEl.textContent = `Data current as of ${formatted}`;
    }
  }catch(err){
    console.warn('Could not load data/shows.json.', err);
    if(updatedEl){
      updatedEl.textContent = ``;
    }
    emptyMsg.textContent = "Couldn't load shows — try refreshing the page.";
  }
  render();
}

// Visitor reports load separately so the show list never waits on them;
// cards re-render with "How it went for N others" once they arrive.
async function loadReportsData(){
  try{
    await fetchAllReports();
    render();
  }catch(err){
    console.warn('Could not load visitor reports.', err);
  }
}

// Escape data-driven strings before injecting into innerHTML. Critical once
// shows.json is populated by the scraper — never trust scraped text as HTML.
function esc(str){
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Tags an outbound link to a show's own site with our utm_source, so
// their analytics (most sites' do parse this) can attribute the traffic
// to us. Falls back to the original url untouched if it doesn't parse.
function withUtmSource(url){
  try{
    const u = new URL(url);
    u.searchParams.set('utm_source', 'standingroomsociety');
    return u.toString();
  } catch {
    return url;
  }
}

// At this many reports, the open list gets a per-method summary and only
// the newest few reports show until "Show N more" is pressed.
const EXPERIENCES_SUMMARY_MIN = 5;
const EXPERIENCES_VISIBLE = 3;

// One line per ticket method that has reports, counting every report,
// e.g. "Rush: 4 of 6 got a ticket · $38–$45" or "Lottery: 0 of 3 won".
function experiencesSummary(reports){
  return Object.entries(TICKET_METHODS).flatMap(([method, label]) => {
    const forMethod = reports.filter(r => r.method === method);
    if (forMethod.length === 0) return [];
    const got = forMethod.filter(r => r.gotTicket).length;
    const outcome = method === 'lottery' ? 'won' : 'got a ticket';
    const prices = forMethod.filter(r => r.gotTicket && r.pricePaid !== null).map(r => r.pricePaid);
    const min = Math.min(...prices), max = Math.max(...prices);
    const priceText = prices.length === 0 ? '' : min === max ? ` · ${formatPrice(min)}` : ` · ${formatPrice(min)}–${formatPrice(max)}`;
    return [{ label, text: `${got} of ${forMethod.length} ${outcome}${priceText}` }];
  });
}

// How many reports say standing room was available. Counts the "Was
// standing room available?" answers ("Not sure" excluded) plus people who
// tried standing room themselves: getting a ticket means it was available.
function standingRoomStat(reports){
  const answers = reports.flatMap(r => {
    if (r.method === 'standing_room') return [r.gotTicket];
    return r.standingRoomAvailable === true || r.standingRoomAvailable === false ? [r.standingRoomAvailable] : [];
  });
  if (answers.length === 0) return null;
  const yes = answers.filter(Boolean).length;
  return `${yes} of ${answers.length} said yes (${Math.round(yes / answers.length * 100)}%)`;
}

// loadReports / formatByline / formatReport / formatPrice come from
// reports-store.js, loaded before this file. Collapsed by default under the
// show's lottery / rush info; a native <details> needs no JS to open/close
// and is keyboard and screen-reader accessible as-is.
function experiencesHtml(slug){
  const reports = loadReports(slug);
  if (reports.length === 0) return '<p class="reports-empty">No reports yet. Be the first to share how it went.</p>';
  const long = reports.length >= EXPERIENCES_SUMMARY_MIN;
  const hiddenCount = long ? reports.length - EXPERIENCES_VISIBLE : 0;
  const sro = standingRoomStat(reports);
  const lines = experiencesSummary(reports);
  return `
    <ul class="experiences__summary">
      ${lines.map(line => `<li><span class="experiences__method">${esc(line.label)}:</span> ${esc(line.text)}</li>`).join('')}
      ${sro ? `<li><span class="experiences__method">Standing room available:</span> ${esc(sro)}</li>` : ''}
    </ul>
    <details class="experiences">
      <summary class="experiences__toggle">
        <span class="experiences__show">${reports.length === 1 ? 'See the report' : `See all ${reports.length} reports`}</span>
        <span class="experiences__hide">Hide reports</span>
      </summary>
      <ul class="reports-list">${reports.map((r, i) => {
        const extra = long && i >= EXPERIENCES_VISIBLE;
        return `
        <li${extra ? ' hidden tabindex="-1"' : ''}>
          <span class="reports-list__byline">${esc(formatByline(r))}</span>
          <span class="reports-list__details">${esc(formatReport(r))}</span>
        </li>`;
      }).join('')}</ul>
      ${hiddenCount ? `<button type="button" class="experiences__more">Show ${hiddenCount} more</button>` : ''}
    </details>
  `;
}

// ---------- Schedule ----------
// The scraper writes day-by-day schedules as
// "Sun 1pm & 6:30pm · Tue 7pm · … — dark Mon" (or "— dark Sun, Tue").
// Those become one row per day (desktop) / the same single line (mobile,
// via CSS). Anything else, e.g. "Standard 8-show week, dark Mon", isn't a
// list of days and is shown as written.
const SCHEDULE_DAY = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (.+)$/;
const DARK_DAYS = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)(, (Mon|Tue|Wed|Thu|Fri|Sat|Sun))*$/;

function parseSchedule(schedule){
  const [main, dark] = schedule.split(' — dark ');
  if (dark !== undefined && !DARK_DAYS.test(dark)) return null;
  const days = main.split(' · ').map(seg => seg.match(SCHEDULE_DAY));
  if (days.some(d => !d)) return null;
  return { days: days.map(([, day, times]) => ({ day, times })), dark: dark ?? null };
}

// Must match SCHEDULE_PLACEHOLDER in scraper/scrape.js exactly.
const SCHEDULE_NOT_LISTED = "Schedule not listed — check the show's site";

function scheduleHtml(show){
  const schedule = show.schedule;
  if (schedule === SCHEDULE_NOT_LISTED) {
    // No official site on file: fall back to a showtimes search.
    const href = show.officialUrl
      ? withUtmSource(show.officialUrl)
      : 'https://www.google.com/search?q=' + encodeURIComponent(`${show.title} ${show.theater} showtimes`);
    return `<div class="schedule"><a class="schedule-link" href="${esc(href)}" target="_blank" rel="noopener">See showtimes <i class="bi bi-box-arrow-up-right" aria-hidden="true"></i></a></div>`;
  }
  const parsed = parseSchedule(schedule);
  if (!parsed) return `<div class="schedule">${linkify(esc(schedule))}</div>`;
  const row = (label, text, modifier = '') =>
    `<div class="schedule-day${modifier}"><span class="lbl">${label}</span>${esc(text)}</div>`;
  return `
    <div class="schedule schedule--days">
      ${parsed.days.map(d => row(d.day, d.times)).join('')}
      ${parsed.dark ? row('Dark', parsed.dark, ' schedule-day--dark') : ''}
    </div>`;
}

// ---------- "How did it go for you?" ----------
// Asked inline in the card, one tap per question, modeled on Google Maps'
// crowd-sourced prompts: the report is saved as soon as the two core
// answers are in (what they tried + whether they got a ticket), and the
// optional follow-ups update that same report. Stopping early still counts.
//
// Per-show progress lives here rather than in the DOM because render()
// rebuilds every card on each search keystroke / tab change.
// slug -> { step, method, reportId, priceRaw, error }
const shareFlows = new Map();

function shareAreaHtml(slug){
  const count = loadReports(slug).length;
  return `<div class="reports-area" data-slug="${esc(slug)}">
    <h3 class="reports-area__title">Visitor reports${count ? ` <span class="reports-area__count">${count}</span>` : ''}</h3>
    ${experiencesHtml(slug)}${shareHtml(slug)}
  </div>`;
}

function answerButtons(options){
  return options.map(([value, label]) =>
    `<button type="button" class="share-flow__answer" data-answer="${esc(value)}">${esc(label)}</button>`
  ).join('');
}

function shareHtml(slug){
  const flow = shareFlows.get(slug);
  const id = `share-${esc(slug)}`;
  const error = flow?.error
    ? `<p class="share-flow__error" id="${id}-error"><span class="visually-hidden">Error:</span> ${esc(flow.error)}</p>`
    : '';

  if (!flow) {
    // The pencil marks this as "add yours", distinct from reading others'.
    return `
      <div class="share-experience">
        <button type="button" class="reports-link" data-action="start"><i class="bi bi-plus-lg" aria-hidden="true"></i><span>How did it go for you?</span></button>
      </div>`;
  }

  if (flow.step === 'done') {
    return `
      <div class="share-flow share-flow--done">
        <p class="share-flow__thanks" tabindex="-1"><i class="bi bi-check-lg" aria-hidden="true"></i> Thanks, added!</p>
        <button type="button" class="share-flow__secondary" data-action="undo">Undo</button>
      </div>
      ${error}`;
  }

  if (flow.step === 'price') {
    return `
      <form class="share-flow" data-action="price" novalidate>
        <label class="share-flow__question" for="${id}-price">How much did you pay? (optional)</label>
        ${error}
        <div class="share-flow__price">
          <span class="share-flow__currency" aria-hidden="true">$</span>
          <input class="share-flow__input" id="${id}-price" type="text" inputmode="decimal" autocomplete="off"
            value="${esc(flow.priceRaw || '')}"${flow.error ? ` aria-invalid="true" aria-describedby="${id}-error"` : ''}>
        </div>
        <div class="share-flow__actions">
          <button type="submit" class="share-flow__answer">Add</button>
          <button type="button" class="share-flow__secondary" data-action="skip">Skip</button>
        </div>
      </form>`;
  }

  const QUESTIONS = {
    method: ['What did you try?', Object.entries(TICKET_METHODS), 'cancel', 'Cancel'],
    ticket: ['Did you get a ticket?', [['yes', 'Yes'], ['no', 'No']], 'cancel', 'Cancel'],
    sro: ['Was standing room available?', [['yes', 'Yes'], ['no', 'No']], 'skip', 'Not sure']
  };
  const [question, options, secondaryAction, secondaryLabel] = QUESTIONS[flow.step];
  return `
    <div class="share-flow">
      <p class="share-flow__question" id="${id}-q" tabindex="-1">${question}</p>
      ${error}
      <div class="share-flow__answers" role="group" aria-labelledby="${id}-q">${answerButtons(options)}</div>
      <button type="button" class="share-flow__secondary" data-action="${secondaryAction}">${secondaryLabel}</button>
    </div>`;
}

function parsePrice(raw){
  const cleaned = raw.trim().replace(/^\$/, '').replace(/,/g, '').trim();
  if (cleaned === '') return { value: null };
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return { error: true };
  return { value: Number(cleaned) };
}

// After the price question (or straight after "No ticket"): standing room is
// asked about unless that's what they tried.
function stepAfterPrice(flow){
  return flow.method === 'standing_room' ? 'done' : 'sro';
}

// Re-renders one card's reports area in place, keeping the shared
// experiences list open if it was, then moves focus to the new content.
function refreshShareArea(slug, focusSelector){
  const area = detailEl.querySelector(`.reports-area[data-slug="${CSS.escape(slug)}"]`);
  if (!area) return;
  const wasOpen = area.querySelector('.experiences')?.open;
  area.outerHTML = shareAreaHtml(slug);
  const fresh = detailEl.querySelector(`.reports-area[data-slug="${CSS.escape(slug)}"]`);
  if (wasOpen && fresh.querySelector('.experiences')) fresh.querySelector('.experiences').open = true;
  fresh.querySelector(focusSelector)?.focus();
}

const SHARE_FOCUS = {
  start: '[data-action="start"]',
  question: '.share-flow__question',
  price: '.share-flow__input',
  done: '.share-flow__thanks'
};

// Runs one database call for a show's questions. While it's in flight the
// box is dimmed and further taps are ignored (flow.pending), so a double
// tap can't create two reports. On failure the error is put on the flow
// for the caller to show, and the step doesn't advance.
async function persist(slug, flow, work){
  flow.pending = true;
  const box = detailEl.querySelector(`.reports-area[data-slug="${CSS.escape(slug)}"] .share-flow`);
  box?.classList.add('is-saving');
  box?.setAttribute('aria-busy', 'true');
  try {
    await work();
    return true;
  } catch (err) {
    console.warn('Saving report failed.', err);
    flow.error = reportErrorMessage(err);
    return false;
  } finally {
    flow.pending = false;
  }
}

async function answerShare(slug, answer){
  const flow = shareFlows.get(slug);
  flow.error = null;

  if (flow.step === 'method') {
    flow.method = answer;
    flow.step = 'ticket';
    refreshShareArea(slug, SHARE_FOCUS.question);
    return;
  }

  if (flow.step === 'ticket') {
    const gotTicket = answer === 'yes';
    const saved = await persist(slug, flow, async () => {
      flow.reportId = await saveReport(slug, { method: flow.method, gotTicket, sharedBy: reporterName() });
    });
    if (!saved) { refreshShareArea(slug, SHARE_FOCUS.question); return; }
    flow.step = gotTicket ? 'price' : stepAfterPrice(flow);
    refreshShareArea(slug, flow.step === 'price' ? SHARE_FOCUS.price : flow.step === 'done' ? SHARE_FOCUS.done : SHARE_FOCUS.question);
    return;
  }

  if (flow.step === 'sro') {
    const saved = await persist(slug, flow, () => updateReport(slug, flow.reportId, { standingRoomAvailable: answer === 'yes' }));
    if (!saved) { refreshShareArea(slug, SHARE_FOCUS.question); return; }
    flow.step = 'done';
    refreshShareArea(slug, SHARE_FOCUS.done);
  }
}

// Turn "[label](url)" markdown-style links and bare domains/URLs in
// already-escaped text into hyperlinks, e.g. "via [Lucky Seat](https://...)"
// → a link reading "Lucky Seat", and "lottery at hamiltonmusical.com" →
// a link reading the domain itself. Runs AFTER esc() so the only HTML in
// the string is what we add here.
function linkify(escaped){
  const mdLinkRe = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  const bareUrlRe = /(https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z]{2,})(\/[^\s,)]*)?/gi;
  const linkifyBareUrls = text => text.replace(
    bareUrlRe,
    (match, proto, domain, pathPart) => {
      const href = (proto || 'https://') + domain + (pathPart || '');
      return `<a href="${href}" target="_blank" rel="noopener">${match}</a>`;
    }
  );

  let result = '';
  let lastIndex = 0;
  let match;
  while ((match = mdLinkRe.exec(escaped)) !== null) {
    const [full, label, url] = match;
    result += linkifyBareUrls(escaped.slice(lastIndex, match.index));
    result += `<a href="${url}" target="_blank" rel="noopener">${label}</a>`;
    lastIndex = match.index + full.length;
  }
  result += linkifyBareUrls(escaped.slice(lastIndex));
  return result;
}

function discountIcon(entry){
  const text = entry.toLowerCase();
  if (text.includes('lottery')) return 'bi-dice-5-fill';
  if (text.includes('rush')) return 'bi-lightning-fill';
  if (text.includes('standing room')) return 'bi-person-standing';
  return null;
}

// Sort by title, ignoring a leading "The " so e.g. "The Book of Mormon"
// files under B, the way theater listings conventionally sort.
function sortKey(s){
  return s.title.replace(/^the\s+/i, '').toLowerCase();
}

// Parses strings like "Aug 16, 2026" into a Date. Returns null if the
// string doesn't parse — callers should treat that as "unknown", not "far off".
function parseShowDate(str){
  if (!str) return null;
  const d = new Date(str.replace(/^opens\s+/i, ''));
  return isNaN(d.getTime()) ? null : d;
}

// A show counts as "closing soon" if its closing date is today or within
// the next 21 days. Already-past dates don't count — that's a stale-data
// problem, not an urgency signal, and showing "closing soon" on a show
// that already closed would be actively misleading.
function isClosingSoon(closesStr){
  const closeDate = parseShowDate(closesStr);
  if (!closeDate) return false;
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysUntil = (closeDate - new Date()) / msPerDay;
  return daysUntil >= 0 && daysUntil <= 21;
}

// A show counts as "coming soon" if its opening date is in the future.
// Unparseable/vague opening strings ("2026", "Long-running", "1987")
// correctly fall through to false via parseShowDate returning null.
function isComingSoon(openedStr){
  const openDate = parseShowDate(openedStr);
  if (!openDate) return false;
  return openDate > new Date();
}

// A show counts as "limited engagement" if it has a known closing date
// and the total run (opened → closes) is under 21 days. Open-ended runs
// (closes === null) and unparseable dates never qualify.
function isLimitedEngagement(openedStr, closesStr){
  const openDate = parseShowDate(openedStr);
  const closeDate = parseShowDate(closesStr);
  if (!openDate || !closeDate) return false;
  const msPerDay = 1000 * 60 * 60 * 24;
  const runLength = (closeDate - openDate) / msPerDay;
  return runLength >= 0 && runLength <= 21;
}

// ---------- Offers ----------
// discount strings look like "Digital Lottery: $35 via [Lucky Seat](url)" or
// "Standing Room: $39 at box office (if sold out)". Pulled apart so the grid
// can show a "from" price and the panel can lay each offer out as a row.
const KIND_NAMES = { lottery: 'Lottery', rush: 'Rush', standing: 'Standing' };
const KIND_ICONS = { lottery: 'bi-dice-5-fill', rush: 'bi-lightning-fill', standing: 'bi-person-standing', other: 'bi-info-circle-fill' };

function offerKind(text){
  const t = text.toLowerCase();
  if (t.includes('lottery')) return 'lottery';
  if (t.includes('standing room')) return 'standing';
  if (t.includes('rush')) return 'rush';
  return null;
}

function parseOffer(raw){
  const m = raw.match(/^([^:$]+?):\s*(.+)$/);
  const label = m ? m[1].trim() : '';
  const rest = m ? m[2].trim() : raw;
  const price = rest.match(/\$(\d+(?:\.\d+)?)(?:\s*[-–]\s*\$?(\d+(?:\.\d+)?))?/);
  const detail = price ? rest.replace(price[0], '').replace(/^\s+/, '').trim() : rest;
  return {
    raw,
    kind: offerKind(label || raw),
    label,
    low: price ? Number(price[1]) : null,
    priceText: price ? price[0] : '',
    detail
  };
}

function offersOf(show){
  return show.discount.map(parseOffer);
}

function fromPrice(offers){
  const lows = offers.map(o => o.low).filter(n => n !== null);
  return lows.length ? Math.min(...lows) : null;
}

// ---------- Poster tiles ----------
const TILE_COLORS = [['#c9a545', '#171614'], ['#a0372e', '#f3efe8'], ['#171614', '#c9a545']];

function tileStyle(title){
  let h = 0;
  for (const ch of title) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const [bg, fg] = TILE_COLORS[h % TILE_COLORS.length];
  return `background:${bg};color:${fg}`;
}

function initials(title){
  const words = title.replace(/^the\s+/i, '').split(/\s+/).filter(w => /[a-z0-9]/i.test(w));
  if (words.length === 1) return words[0][0].toUpperCase();
  return words.slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function posterHtml(s){
  return `<span class="poster__fallback" style="${tileStyle(s.title)}" aria-hidden="true">${esc(initials(s.title))}</span>` +
    (s.localPosterPath
      ? `<img class="poster__img" src="${esc(s.localPosterPath)}" alt="${esc(s.title)} poster" loading="lazy" onerror="this.remove()">`
      : '');
}

// ---------- Grid + panel ----------
const detailEl = document.getElementById('detail');
const scrimEl = document.getElementById('scrim');
const phoneLayout = window.matchMedia('(max-width: 900px)');
let selectedSlug = null;
const offerFilters = new Set();
let visibleShows = [];

function showId(s){ return s.slug || s.title; }

// Status stickers slapped over the poster, most urgent first.
function stickersHtml(s){
  const list = [];
  if (s.closes && isClosingSoon(s.closes)) list.push(['closing', 'Closing Soon!']);
  if (isComingSoon(s.opened)) list.push(['opening', 'Opening Soon!']);
  if (isLimitedEngagement(s.opened, s.closes)) list.push(['limited', 'Limited Engagement!']);
  return list.length
    ? `<span class="stickers">${list.map(([k, t]) => `<span class="sticker sticker--${k}">${t}</span>`).join('')}</span>`
    : '';
}

function cardHtml(s){
  const offers = offersOf(s);
  const price = fromPrice(offers);
  const kinds = [...new Set(offers.map(o => o.kind).filter(Boolean))];
  const id = showId(s);
  return `
    <button type="button" class="show-card${id === selectedSlug ? ' is-selected' : ''}" data-id="${esc(id)}" aria-pressed="${id === selectedSlug}">
      <span class="poster">
        ${posterHtml(s)}
        ${stickersHtml(s)}
        ${price !== null ? `<span class="price-badge"><span class="price-badge__from">from</span><span class="price-badge__amt">$${price}</span></span>` : ''}
      </span>
      <span class="show-title">${esc(s.title)}</span>
      <span class="theater-name">${esc(s.theater)}</span>
      ${kinds.length ? `<span class="kinds">${kinds.map(k => `<span class="kind kind--${k}"><i class="bi ${KIND_ICONS[k]}" aria-hidden="true"></i>${KIND_NAMES[k]}</span>`).join('')}</span>` : ''}
    </button>`;
}

function offerRowHtml(o){
  const kind = o.kind || 'other';
  const title = o.label || (o.kind ? '' : 'Tip');
  return `
    <li class="offer">
      <span class="offer__icon offer__icon--${kind}" aria-hidden="true"><i class="bi ${KIND_ICONS[kind]}"></i></span>
      <span class="offer__body">
        ${title ? `<span class="offer__label">${esc(title)}</span>` : ''}
        <span class="offer__detail">${linkify(esc(o.detail))}</span>
      </span>
      ${o.priceText ? `<span class="offer__price">${esc(o.priceText)}</span>` : ''}
    </li>`;
}

function detailHtml(s){
  const offers = offersOf(s);
  const price = fromPrice(offers);
  const badges = [
    `<span class="tag">${s.kind === 'broadway' ? 'Broadway' : 'Off-Broadway'}</span>`,
    isLimitedEngagement(s.opened, s.closes) ? '<span class="tag tag--limited">Limited Engagement</span>' : '',
    isComingSoon(s.opened) ? '<span class="tag tag--opening">Opening Soon</span>' : '',
    s.closes && isClosingSoon(s.closes) ? '<span class="tag tag--closing">Closing Soon</span>' : ''
  ].join('');
  return `
    <div class="detail__scroll">
      <button type="button" class="detail__close" data-close aria-label="Close details"><i class="bi bi-x-lg" aria-hidden="true"></i></button>
      <div class="detail__hero">
        <span class="poster poster--detail">${posterHtml(s)}</span>
        <div class="detail__head">
          <div class="tags">${badges}</div>
          <h2 class="detail__title">${esc(s.title)}</h2>
          <p class="detail__theater"><strong>${esc(s.theater)}</strong><span>${esc(s.address.replace(/,? New York.*$/, ''))}</span></p>
          ${price !== null ? `<p class="detail__from"><span>From</span> <strong>$${price}</strong></p>` : ''}
        </div>
      </div>
      <ul class="offers">${offers.map(offerRowHtml).join('')}</ul>
      <dl class="facts">
        <div><dt>Opened</dt><dd>${esc(s.opened)}</dd></div>
        <div><dt>Closes</dt><dd>${s.closes ? esc(s.closes) : 'Open run'}</dd></div>
      </dl>
      <h3 class="detail__sub">Schedule</h3>
      ${scheduleHtml(s)}
      ${s.officialUrl ? `<a class="detail__official" href="${esc(withUtmSource(s.officialUrl))}" target="_blank" rel="noopener">Official site <i class="bi bi-box-arrow-up-right" aria-hidden="true"></i></a>` : ''}
    </div>
    ${s.slug ? shareAreaHtml(s.slug) : ''}`;
}

function renderDetail(){
  const s = visibleShows.find(x => showId(x) === selectedSlug);
  if (!s) { detailEl.innerHTML = ''; return; }
  detailEl.innerHTML = detailHtml(s);
}

function setPanelOpen(open){
  document.body.classList.toggle('panel-open', open);
  scrimEl.hidden = !open;
}

function render(){
  let filtered = shows.filter(s => activeFilter === 'all' || s.kind === activeFilter);
  if (searchQuery) filtered = filtered.filter(s => s.title.toLowerCase().includes(searchQuery));
  offerFilters.forEach(kind => {
    filtered = filtered.filter(s => offersOf(s).some(o => o.kind === kind));
  });
  filtered = filtered.slice().sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  visibleShows = filtered;

  cardList.innerHTML = '';
  if (filtered.length === 0) {
    emptyMsg.style.display = 'block';
    detailEl.innerHTML = '';
    setPanelOpen(false);
    return;
  }
  emptyMsg.style.display = 'none';

  // The panel only opens when a card is clicked; drop it if that show got filtered out.
  if (!filtered.some(s => showId(s) === selectedSlug)) selectedSlug = null;
  cardList.innerHTML = filtered.map(cardHtml).join('');
  renderDetail();
  if (!selectedSlug) setPanelOpen(false);
}

function selectShow(id){
  if (id === selectedSlug && document.body.classList.contains('panel-open')) { closePanel(); return; }
  selectedSlug = id;
  cardList.querySelectorAll('.show-card').forEach(c => {
    const on = c.dataset.id === id;
    c.classList.toggle('is-selected', on);
    c.setAttribute('aria-pressed', on);
  });
  renderDetail();
  detailEl.querySelector('.detail__scroll')?.scrollTo(0, 0);
  setPanelOpen(true);
  if (phoneLayout.matches) detailEl.focus();
}

cardList.addEventListener('click', (e) => {
  const card = e.target.closest('.show-card');
  if (card) selectShow(card.dataset.id);
});

function closePanel(){
  const card = cardList.querySelector('.show-card.is-selected');
  selectedSlug = null;
  setPanelOpen(false);
  if (card) {
    card.classList.remove('is-selected');
    card.setAttribute('aria-pressed', 'false');
    card.focus();
  }
}
scrimEl.addEventListener('click', closePanel);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.body.classList.contains('panel-open')) closePanel();
});
phoneLayout.addEventListener('change', closePanel);

document.querySelectorAll('.tab').forEach(tab=>{
  tab.addEventListener('click', ()=>{
    document.querySelectorAll('.tab').forEach(t=>{
      t.classList.remove('active');
      t.setAttribute('aria-pressed', 'false');
    });
    tab.classList.add('active');
    tab.setAttribute('aria-pressed', 'true');
    activeFilter = tab.dataset.filter;
    render();
  });
});

document.querySelectorAll('[data-offer]').forEach(chip => {
  chip.addEventListener('click', () => {
    const kind = chip.dataset.offer;
    const on = !offerFilters.has(kind);
    on ? offerFilters.add(kind) : offerFilters.delete(kind);
    chip.classList.toggle('active', on);
    chip.setAttribute('aria-pressed', on);
    render();
  });
});

document.getElementById('showSearch').addEventListener('input', (e) => {
  searchQuery = e.target.value.trim().toLowerCase();
  render();
});

// Delegated, since the panel is rebuilt whenever the selection changes.
detailEl.addEventListener('click', (e) => {
  if (e.target.closest('[data-close]')) { closePanel(); return; }
  const more = e.target.closest('.experiences__more');
  if (more) {
    const revealed = [...more.closest('.experiences').querySelectorAll('.reports-list li[hidden]')];
    revealed.forEach(li => { li.hidden = false; });
    more.remove();
    revealed[0]?.focus();
    return;
  }

  const area = e.target.closest('.reports-area');
  if (!area) return;
  const slug = area.dataset.slug;
  const flow = shareFlows.get(slug);
  if (flow?.pending) return;

  const answer = e.target.closest('[data-answer]');
  if (answer) { answerShare(slug, answer.dataset.answer); return; }

  const action = e.target.closest('[data-action]')?.dataset.action;
  if (action === 'start') {
    shareFlows.set(slug, { step: 'method' });
    refreshShareArea(slug, SHARE_FOCUS.question);
  } else if (action === 'cancel') {
    // Only offered before anything is saved, so there's nothing to remove.
    shareFlows.delete(slug);
    refreshShareArea(slug, SHARE_FOCUS.start);
  } else if (action === 'skip') {
    flow.error = null;
    flow.step = flow.step === 'price' ? stepAfterPrice(flow) : 'done';
    refreshShareArea(slug, flow.step === 'done' ? SHARE_FOCUS.done : SHARE_FOCUS.question);
  } else if (action === 'undo') {
    flow.error = null;
    persist(slug, flow, () => deleteReport(slug, flow.reportId)).then(removed => {
      if (removed) shareFlows.delete(slug);
      refreshShareArea(slug, removed ? SHARE_FOCUS.start : SHARE_FOCUS.done);
    });
  }
});

detailEl.addEventListener('submit', async (e) => {
  const form = e.target.closest('.share-flow[data-action="price"]');
  if (!form) return;
  e.preventDefault();
  const slug = form.closest('.reports-area').dataset.slug;
  const flow = shareFlows.get(slug);
  if (flow.pending) return;
  flow.priceRaw = form.querySelector('.share-flow__input').value;

  const parsed = parsePrice(flow.priceRaw);
  if (parsed.error) {
    flow.error = 'Enter the price as a number, like 45 or 45.50';
    refreshShareArea(slug, SHARE_FOCUS.price);
    return;
  }
  flow.error = null;
  if (parsed.value !== null) {
    const saved = await persist(slug, flow, () => updateReport(slug, flow.reportId, { pricePaid: parsed.value }));
    if (!saved) { refreshShareArea(slug, SHARE_FOCUS.price); return; }
  }
  flow.step = stepAfterPrice(flow);
  refreshShareArea(slug, flow.step === 'done' ? SHARE_FOCUS.done : SHARE_FOCUS.question);
});

loadShowData();
loadReportsData();
