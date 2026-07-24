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
      updatedEl.textContent = `Data current as of ${data.lastUpdated} — always confirm on the show's official site before you go`;
    }
  }catch(err){
    console.warn('Could not load data/shows.json, using embedded fallback data.', err);
    if(updatedEl){
      updatedEl.textContent = `Showing built-in fallback data (couldn't reach data/shows.json) — always confirm on the show's official site before you go`;
    }
  }
  render();
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

// Turn bare domains/URLs in already-escaped text into hyperlinks,
// e.g. "lottery at hamiltonmusical.com" → clickable link.
// Runs AFTER esc() so the only HTML in the string is what we add here.
function linkify(escaped){
  return escaped.replace(
    /(https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z]{2,})(\/[^\s,)]*)?/gi,
    (match, proto, domain, pathPart) => {
      const href = (proto || 'https://') + domain + (pathPart || '');
      return `<a href="${href}" target="_blank" rel="noopener">${match}</a>`;
    }
  );
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

function render(){
  let filtered = shows.filter(s => activeFilter === 'all' || s.kind === activeFilter);
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
        <div>
          <div class="col-label">Show</div>
          <div class="show-title">${esc(s.title)}</div>
        </div>
        <div>
          <div class="col-label">Theater</div>
          <div class="theater-name">${esc(s.theater)}</div>
          <div class="theater-addr">${esc(s.address)}</div>
        </div>
        <div>
          <div class="col-label">Run</div>
          <div class="dates-row"><span class="lbl">Opened</span>${esc(s.opened)}</div>
          <div class="dates-row"><span class="lbl">Closes</span>${s.closes ? esc(s.closes) : '<span class="open-ended">Open run</span>'}${s.closes && isClosingSoon(s.closes) ? '<span class="closing-soon-badge">Closing Soon</span>' : ''}</div>
        </div>
        <div>
          <div class="col-label">Schedule</div>
          <div class="schedule">${linkify(esc(s.schedule))}</div>
        </div>
        <div>
          <div class="col-label">Lottery / Rush</div>
          <div class="discount">${s.discount.map(d=>`<div>${linkify(esc(d))}</div>`).join('')}</div>
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

loadShowData();
