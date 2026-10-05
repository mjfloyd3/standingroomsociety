// Fallback data — used only if data/shows.json can't be fetched (e.g. this
// file opened directly from disk rather than served over http, or the
// network request fails). The live data normally comes from the JSON file,
// which the scraper keeps current.
const fallbackShows = [
  {"title":"& Juliet","kind":"broadway","theater":"Stephen Sondheim Theatre","address":"124 W 43rd St, New York, NY 10036","opened":"Nov 17, 2022","closes":null,"schedule":"Standard 8-show week, dark Mon","discount":["$49 digital rush via the TodayTix app (todaytix.com)","$49 general rush at the box office; $45 standing room when sold out"]},
  {"title":"Aladdin","kind":"broadway","theater":"New Amsterdam Theatre","address":"214 W 42nd St, New York, NY 10036","opened":"Mar 20, 2014","closes":null,"schedule":"Standard 8-show week, dark Mon","discount":["$45 digital lottery at aladdinthemusical.com/lottery"]},
  {"title":"The Book of Mormon","kind":"broadway","theater":"Eugene O'Neill Theatre","address":"230 W 49th St, New York, NY 10019","opened":"Mar 24, 2011","closes":null,"schedule":"Standard 8-show week, dark Mon","discount":["$49 digital lottery at luckyseat.com/shows/thebookofmormon-newyork","$53 digital rush via the TodayTix app"]},
  {"title":"Buena Vista Social Club","kind":"broadway","theater":"Gerald Schoenfeld Theatre","address":"236 W 45th St, New York, NY 10036","opened":"Mar 19, 2025","closes":null,"schedule":"Standard 8-show week, dark Mon — confirm exact days on the show's own site","discount":["$49 digital lottery at rush.telecharge.com","$45 general rush at the box office"]},
  {"title":"Cats: The Jellicle Ball","kind":"broadway","theater":"Broadhurst Theatre","address":"235 W 45th St, New York, NY 10036","opened":"Apr 7, 2026","closes":"Aug 8, 2026","schedule":"Standard 8-show week, dark Mon — confirm exact days on the show's own site","discount":["$49 digital lottery at rush.telecharge.com","$45 general rush at the box office"]},
  {"title":"Chicago","kind":"broadway","theater":"Ambassador Theatre","address":"219 W 49th St, New York, NY 10019","opened":"Nov 14, 1996","closes":null,"schedule":"Includes Mon performances — one of the only Broadway shows that plays Mondays","discount":["$49 general rush at the box office","$39 standing room at the box office when sold out"]},
  {"title":"Death of a Salesman","kind":"broadway","theater":"Winter Garden Theatre","address":"1634 Broadway (at W. 50th St.), New York, NY 10019","opened":"Apr 9, 2026","closes":null,"schedule":"Standard 8-show week, dark Mon","discount":["$49 digital lottery at rush.telecharge.com"]},
  {"title":"Every Brilliant Thing","kind":"broadway","theater":"Hudson Theatre","address":"141 W 44th St, New York, NY 10036","opened":"Mar 12, 2026","closes":"Aug 9, 2026","schedule":"Limited engagement — standard 8-show week, dark Mon","discount":["$45 digital lottery at luckyseat.com","$45 digital rush via the TodayTix app; $45 general rush at the box office"]},
  {"title":"The Great Gatsby","kind":"broadway","theater":"Broadway Theatre","address":"1681 Broadway (at W. 53rd St.), New York, NY 10019","opened":"Apr 25, 2024","closes":null,"schedule":"Standard 8-show week, dark Mon","discount":["$45 digital lottery at rush.telecharge.com","$40 general rush / $25 student rush at the box office"]},
  {"title":"Hadestown","kind":"broadway","theater":"Walter Kerr Theatre","address":"219 W 48th St, New York, NY 10036","opened":"Apr 17, 2019","closes":null,"schedule":"Standard 8-show week, dark Mon","discount":["$49 digital lottery at luckyseat.com/shows/hadestown-newyork","$39 standing room at the box office when sold out"]},
  {"title":"Hamilton","kind":"broadway","theater":"Richard Rodgers Theatre","address":"226 W 46th St, New York, NY 10036","opened":"Aug 6, 2015","closes":null,"schedule":"Tue 7pm · Wed 2pm & 7pm · Thu 7pm · Fri 8pm · Sat 2pm & 8pm · Sun 3pm — dark Mon","discount":["$10 digital lottery at hamiltonmusical.com or the Hamilton app — front-row orchestra seats"]},
  {"title":"Harry Potter and the Cursed Child","kind":"broadway","theater":"Lyric Theatre","address":"214 W 43rd St, New York, NY 10036","opened":"Apr 22, 2018","closes":null,"schedule":"Standard 8-show week, dark Mon — confirm exact days on the show's own site","discount":["$40 weekly \"Friday Forty\" lottery via the TodayTix app"]},
  {"title":"Joe Turner's Come and Gone","kind":"broadway","theater":"Ethel Barrymore Theatre","address":"243 W 47th St, New York, NY 10036","opened":"Apr 25, 2026","closes":"Jul 26, 2026","schedule":"Limited engagement — standard 8-show week, dark Mon","discount":["$49 digital lottery at rush.telecharge.com","$45 general rush / $35 student rush at the box office"]},
  {"title":"Just in Time","kind":"broadway","theater":"Circle in the Square Theatre","address":"235 W 50th St, New York, NY 10019","opened":"Apr 23, 2025","closes":null,"schedule":"Standard 8-show week, dark Mon — confirm exact days on the show's own site","discount":["$40 general rush at the box office"]},
  {"title":"The Lion King","kind":"broadway","theater":"Minskoff Theatre","address":"1515 Broadway, New York, NY 10036","opened":"Nov 13, 1997","closes":null,"schedule":"Standard 8-show week, dark Mon — confirm exact days on the show's own site","discount":["$60 digital lottery at lottery.broadwaydirect.com/show/the-lion-king"]},
  {"title":"The Lost Boys","kind":"broadway","theater":"Palace Theatre","address":"160 W 47th St, New York, NY 10036","opened":"2026","closes":null,"schedule":"Standard 8-show week, dark Mon — confirm exact days on the show's own site","discount":["$45 digital lottery at lottery.broadwaydirect.com/show/lost-boys","$45 general rush at the box office"]},
  {"title":"Maybe Happy Ending","kind":"broadway","theater":"Belasco Theatre","address":"111 W 44th St, New York, NY 10036","opened":"Nov 12, 2024","closes":null,"schedule":"Standard 8-show week, dark Mon — confirm exact days on the show's own site","discount":["$20.64 digital lottery at rush.telecharge.com","$49 general rush at the box office; $49 digital rush at rush.telecharge.com; $49 standing room when sold out"]},
  {"title":"MJ The Musical","kind":"broadway","theater":"Neil Simon Theatre","address":"250 W 52nd St, New York, NY 10019","opened":"Feb 1, 2022","closes":null,"schedule":"Standard 8-show week, dark Mon — confirm exact days on the show's own site","discount":["$49 digital lottery at lottery.broadwaydirect.com/show/mj-ny"]},
  {"title":"Moulin Rouge! The Musical","kind":"broadway","theater":"Al Hirschfeld Theatre","address":"302 W 45th St, New York, NY 10036","opened":"Jul 25, 2019","closes":"Aug 30, 2026","schedule":"Standard 8-show week, dark Mon — final weeks, expect added demand","discount":["$49 digital lottery at luckyseat.com"]},
  {"title":"Oh, Mary!","kind":"broadway","theater":"Lyceum Theatre","address":"149 W 45th St, New York, NY 10036","opened":"Jul 11, 2024","closes":null,"schedule":"Standard 8-show week, dark Mon — confirm exact days on the show's own site","discount":["$47 digital lottery at rush.telecharge.com","$43 general rush at the box office"]},
  {"title":"Operation Mincemeat","kind":"broadway","theater":"John Golden Theatre","address":"252 W 45th St, New York, NY 10036","opened":"Mar 20, 2025","closes":null,"schedule":"Standard 8-show week, dark Mon — confirm exact days on the show's own site","discount":["$49 digital lottery at rush.telecharge.com","$49 general rush at the box office"]},
  {"title":"The Outsiders","kind":"broadway","theater":"Bernard B. Jacobs Theatre","address":"242 W 45th St, New York, NY 10036","opened":"Apr 11, 2024","closes":null,"schedule":"Standard 8-show week, dark Mon — confirm exact days on the show's own site","discount":["$49 digital lottery at rush.telecharge.com","$45 general rush, $30 under-30 tickets, and $39 standing room at the box office"]},
  {"title":"Proof","kind":"broadway","theater":"Booth Theatre","address":"222 W 45th St, New York, NY 10036","opened":"Apr 16, 2026","closes":"Jul 19, 2026","schedule":"Limited engagement — standard 8-show week, dark Mon","discount":["$49 digital lottery at rush.telecharge.com","$45 general rush at the box office"]},
  {"title":"Ragtime","kind":"broadway","theater":"Vivian Beaumont Theater","address":"150 W 65th St, New York, NY 10023","opened":"Oct 16, 2025","closes":"Aug 16, 2026","schedule":"Limited engagement — standard 8-show week, dark Mon","discount":["$49 digital lottery at rush.telecharge.com"]},
  {"title":"The Rocky Horror Show","kind":"broadway","theater":"Studio 54","address":"254 W 54th St, New York, NY 10019","opened":"2026","closes":null,"schedule":"Standard 8-show week, dark Mon — confirm exact days on the show's own site","discount":["$30 digital lottery via the TodayTix app","50%-off student rush at the box office"]},
  {"title":"Schmigadoon!","kind":"broadway","theater":"Nederlander Theatre","address":"208 W 41st St, New York, NY 10036","opened":"2026","closes":null,"schedule":"Standard 8-show week, dark Mon — confirm exact days on the show's own site","discount":["$45 digital lottery at lottery.broadwaydirect.com/schmigadoon-ny","$40 general rush at the box office"]},
  {"title":"SIX: The Musical","kind":"broadway","theater":"Lena Horne Theatre","address":"256 W 47th St, New York, NY 10036","opened":"Oct 3, 2021","closes":null,"schedule":"Standard 8-show week, dark Mon — confirm exact days on the show's own site","discount":["$45 digital lottery at lottery.broadwaydirect.com/show/six-ny","$35 student rush at the box office; $49 standing room when sold out"]},
  {"title":"Stranger Things: The First Shadow","kind":"broadway","theater":"Marquis Theatre","address":"1535 Broadway (btwn 45th & 46th St.), New York, NY 10036","opened":"Apr 22, 2025","closes":"Jan 3, 2027","schedule":"Standard 8-show week, dark Mon","discount":["No rush or lottery currently listed in Playbill's policy guide — check todaytix.com for offers"]},
  {"title":"Titaníque","kind":"broadway","theater":"St. James Theatre","address":"246 W 44th St, New York, NY 10036","opened":"Apr 12, 2026","closes":null,"schedule":"Standard 8-show week, dark Mon","discount":["$49 digital lottery at luckyseat.com","$49 digital rush via the TodayTix app; $45 general rush at the box office"]},
  {"title":"Two Strangers (Carry a Cake Across New York)","kind":"broadway","theater":"Longacre Theatre","address":"220 W 48th St, New York, NY 10036","opened":"Nov 20, 2025","closes":null,"schedule":"Standard 8-show week, dark Mon","discount":["No rush or lottery currently listed in Playbill's policy guide — check todaytix.com for offers"]},
  {"title":"Wicked","kind":"broadway","theater":"Gershwin Theatre","address":"222 W 51st St, New York, NY 10019","opened":"Oct 30, 2003","closes":null,"schedule":"Standard 8-show week, dark Mon — check gershwintheatre.com for current matinee days","discount":["$55 digital lottery at lottery.broadwaydirect.com/show/wicked","$45 student rush at the box office"]},
  {"title":"Perfect Crime","kind":"off-broadway","theater":"The Theater Center","address":"1627 Broadway, New York, NY 10019","opened":"1987","closes":null,"schedule":"Runs weekly, multiple performances — the longest-running Off-Broadway show ever; check venue for current times","discount":["Frequently discounted via TodayTix and the show's own site"]},
  {"title":"The 25th Annual Putnam County Spelling Bee","kind":"off-broadway","theater":"New World Stages","address":"340 W 50th St, New York, NY 10019","opened":"2026 revival","closes":"Sep 6, 2026","schedule":"Limited engagement — check newworldstages.com for current weekly schedule","discount":["Digital rush/lottery sometimes offered via TodayTix — check the app day-of"]},
  {"title":"Gazillion Bubble Show","kind":"off-broadway","theater":"New World Stages","address":"340 W 50th St, New York, NY 10019","opened":"Long-running","closes":"Sep 7, 2026","schedule":"Family matinees, typically weekends — check venue for current times","discount":["Family/group discounts often listed on the show's own site"]},
  {"title":"Heathers The Musical","kind":"off-broadway","theater":"New World Stages","address":"340 W 50th St, New York, NY 10019","opened":"2025 return engagement","closes":"Sep 6, 2026","schedule":"Standard weekly schedule — check newworldstages.com for current times","discount":["Digital rush sometimes offered via TodayTix — check the app day-of"]},
  {"title":"The Play That Goes Wrong","kind":"off-broadway","theater":"New World Stages","address":"340 W 50th St, New York, NY 10019","opened":"Long-running","closes":null,"schedule":"Standard weekly schedule — check newworldstages.com for current times","discount":["Digital rush sometimes offered via TodayTix — check the app day-of"]},
  {"title":"A Walk on the Moon","kind":"off-broadway","theater":"Laura Pels Theatre (Roundabout)","address":"111 W 46th St, New York, NY 10036","opened":"Jun 29, 2026","closes":"Aug 22, 2026","schedule":"Limited engagement — check roundabouttheatre.org for current schedule","discount":["Roundabout offers rush and under-35 membership pricing — check roundabouttheatre.org"]},
  {"title":"The Whoopi Monologues","kind":"off-broadway","theater":"Mitzi E. Newhouse Theater (Lincoln Center)","address":"150 W 65th St, New York, NY 10023","opened":"Jul 14, 2026","closes":"Aug 22, 2026","schedule":"Limited engagement — check lct.org for current schedule","discount":["Lincoln Center Theater offers rush tickets — check lct.org"]}
];

let shows = fallbackShows; // replaced once data/shows.json loads successfully
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
    console.warn('Could not load data/shows.json, using embedded fallback data.', err);
    if(updatedEl){
      updatedEl.textContent = ``;
    }
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
  if (reports.length === 0) return '';
  const label = reports.length === 1
    ? 'How it went for someone else'
    : `How it went for <span class="experiences__count">${reports.length}</span> others`;
  const long = reports.length >= EXPERIENCES_SUMMARY_MIN;
  const hiddenCount = long ? reports.length - EXPERIENCES_VISIBLE : 0;
  const sro = standingRoomStat(reports);
  return `
    <details class="experiences">
      <summary class="experiences__toggle">
        <span class="experiences__show">${label}</span>
        <span class="experiences__hide">Hide</span>
      </summary>
      ${sro ? `<p class="experiences__sro"><span class="experiences__method">Standing room available:</span> ${esc(sro)}</p>` : ''}
      ${long ? `<ul class="experiences__summary">${experiencesSummary(reports).map(line => `<li><span class="experiences__method">${esc(line.label)}:</span> ${esc(line.text)}</li>`).join('')}</ul>` : ''}
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
  return `<div class="reports-area" data-slug="${esc(slug)}">${experiencesHtml(slug)}${shareHtml(slug)}</div>`;
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
        <button type="button" class="reports-link" data-action="start"><i class="bi bi-pencil" aria-hidden="true"></i><span>How did it go for you?</span></button>
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
  const area = cardList.querySelector(`.reports-area[data-slug="${CSS.escape(slug)}"]`);
  if (!area) return;
  const wasOpen = area.querySelector('.experiences')?.open;
  area.outerHTML = shareAreaHtml(slug);
  const fresh = cardList.querySelector(`.reports-area[data-slug="${CSS.escape(slug)}"]`);
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
  const box = cardList.querySelector(`.reports-area[data-slug="${CSS.escape(slug)}"] .share-flow`);
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
  const d = new Date(str);
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

function render(){
 let filtered = shows.filter(s => activeFilter === 'all' || s.kind === activeFilter);
 if (searchQuery) {
   filtered = filtered.filter(s => s.title.toLowerCase().includes(searchQuery));
 }
 filtered = filtered.slice().sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

  cardList.innerHTML = '';
  if(filtered.length === 0){
    emptyMsg.style.display = 'block';
    return;
  }
  emptyMsg.style.display = 'none';

  const groups = activeFilter === 'all'
    ? [['Broadway', filtered.filter(s=>s.kind==='broadway')], ['Off-Broadway', filtered.filter(s=>s.kind==='off-broadway')]]
    : [[null, filtered]];

  groups.forEach(([label, list])=>{
    if(list.length === 0) return;
    if(label){
      const gt = document.createElement('div');
      gt.className = 'group-title';
      gt.textContent = label;
      cardList.appendChild(gt);
    }
    list.forEach(s=>{
      const card = document.createElement('div');
      card.className = 'show-card';
      card.innerHTML = `
        <div class="poster-cell">
          ${s.localPosterPath
            ? `<img class="show-poster" src="${esc(s.localPosterPath)}" alt="${esc(s.title)} poster art" width="92" height="143" loading="lazy" onerror="this.remove()">`
            : ''}
        </div>
        <div>
          <div class="col-label">Show</div>
          <div class="show-title">${esc(s.title)}${s.officialUrl ? ` <a class="official-site-link" href="${esc(withUtmSource(s.officialUrl))}" target="_blank" rel="noopener" title="Official site" aria-label="${esc(s.title)} official website"><i class="bi bi-box-arrow-up-right" aria-hidden="true"></i></a>` : ''}</div>
          ${isLimitedEngagement(s.opened, s.closes) ? '<div class="limited-engagement-row"><span class="limited-engagement-badge">Limited Engagement</span></div>' : ''}
        </div>
        <div>
          <div class="col-label">Theater</div>
          <div class="theater-name">${esc(s.theater)}</div>
          <div class="theater-addr">${esc(s.address)}</div>
        </div>
        <div>
          <div class="col-label">Run</div>
          <div class="dates-row"><span class="lbl">Opened</span>${esc(s.opened)}${isComingSoon(s.opened) ? '<span class="coming-soon-badge">Coming Soon</span>' : ''}</div>
          <div class="dates-row"><span class="lbl">Closes</span>${s.closes ? esc(s.closes) : '<span class="open-ended">Open run</span>'}${s.closes && isClosingSoon(s.closes) ? '<span class="closing-soon-badge">Closing Soon</span>' : ''}</div>
        </div>
        <div>
          <div class="col-label">Schedule</div>
          <div class="schedule">${linkify(esc(s.schedule))}</div>
        </div>
        <div>
          <div class="col-label">Lottery / Rush</div>
          <div class="discount">${s.discount.map(d=>{
              const icon = discountIcon(d);
              return `<div class="discount-line">${icon ? `<i class="bi ${icon}" aria-hidden="true"></i> ` : ''}${linkify(esc(d))}</div>`;
            }).join('')}</div>
          ${s.slug ? shareAreaHtml(s.slug) : ''}
        </div>
      `;
      cardList.appendChild(card);
    });
  });
}

document.querySelectorAll('.tab').forEach(tab=>{
  tab.addEventListener('click', ()=>{
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    activeFilter = tab.dataset.filter;
    render();
  });
});

document.getElementById('showSearch').addEventListener('input', (e) => {
  searchQuery = e.target.value.trim().toLowerCase();
  render();
});

// Delegated, since render() rebuilds every card on each search / tab change.
cardList.addEventListener('click', (e) => {
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

cardList.addEventListener('submit', async (e) => {
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
