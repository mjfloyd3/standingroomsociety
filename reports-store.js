// Visitor reports, stored in Supabase (table + access rules: supabase/schema.sql).
// The publishable key is meant to be public; the database's row level
// security is what protects the data.
const SUPABASE_URL = 'https://hislyjocmhuozgxyyltw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_q1Ut_sj4I-NbNMRFciGOSQ_XPcnuWGs';
// If the supabase-js script failed to load (CDN outage, content blocker),
// db is null: the show list still renders, reports just don't load and
// saving shows the usual "couldn't save" message.
const db = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
function requireDb(){
  if (!db) throw new Error('Supabase client unavailable');
}

const TICKET_METHODS = {
  rush: 'Rush',
  standing_room: 'Standing room',
  lottery: 'Lottery'
};

const REPORT_COLUMNS = 'id, show_slug, method, got_ticket, price_paid, standing_room_available, shared_by, created_at';

// Every report, grouped by show slug, newest first. Loaded once per page
// view (fetchAllReports) so the listing can render synchronously.
const reportsBySlug = new Map();

function fromRow(row){
  return {
    id: row.id,
    method: row.method,
    gotTicket: row.got_ticket,
    pricePaid: row.price_paid === null ? null : Number(row.price_paid),
    standingRoomAvailable: row.standing_room_available,
    sharedBy: row.shared_by,
    submittedAt: row.created_at
  };
}

async function fetchAllReports(){
  requireDb();
  const { data, error } = await db.from('reports').select(REPORT_COLUMNS).order('created_at', { ascending: false });
  if (error) throw error;
  reportsBySlug.clear();
  for (const row of data) {
    if (!reportsBySlug.has(row.show_slug)) reportsBySlug.set(row.show_slug, []);
    reportsBySlug.get(row.show_slug).push(fromRow(row));
  }
}

function loadReports(slug){
  return reportsBySlug.get(slug) || [];
}

// Anonymous sign-in happens only when someone actually reports, not on
// every page view. supabase-js keeps the session in the browser, so the
// same device can keep editing / undoing its own reports.
async function ensureSignedIn(){
  requireDb();
  const { data } = await db.auth.getSession();
  if (data.session) return;
  const { error } = await db.auth.signInAnonymously();
  if (error) throw error;
}

// Error text the inline questions can show as-is.
function reportErrorMessage(error){
  return error?.code === 'P0001'
    ? 'You’ve shared a lot in the last hour. Please try again later.'
    : 'Couldn’t save that. Check your connection and try again.';
}

// Saves the two core answers and returns the new report's id, which the
// optional follow-ups and Undo use. Throws on failure.
async function saveReport(slug, report){
  await ensureSignedIn();
  const { data, error } = await db.from('reports').insert({
    show_slug: slug,
    method: report.method,
    got_ticket: report.gotTicket,
    shared_by: report.sharedBy
  }).select(REPORT_COLUMNS).single();
  if (error) throw error;
  reportsBySlug.set(slug, [fromRow(data), ...loadReports(slug)]);
  return data.id;
}

// Only the optional answers (pricePaid, standingRoomAvailable) can change.
async function updateReport(slug, id, changes){
  requireDb();
  const row = {};
  if ('pricePaid' in changes) row.price_paid = changes.pricePaid;
  if ('standingRoomAvailable' in changes) row.standing_room_available = changes.standingRoomAvailable;
  const { error } = await db.from('reports').update(row).eq('id', id);
  if (error) throw error;
  reportsBySlug.set(slug, loadReports(slug).map(r => r.id === id ? { ...r, ...changes } : r));
}

async function deleteReport(slug, id){
  requireDb();
  const { error } = await db.from('reports').delete().eq('id', id);
  if (error) throw error;
  reportsBySlug.set(slug, loadReports(slug).filter(r => r.id !== id));
}

// Made-up theater pen names for anonymous reporters — invented, not real
// people. One is picked per device and reused, so a person's reports all
// carry the same name.
const REPORTER_NAMES = [
  'Matinee Mavis', 'Balcony Bartholomew', 'Understudy Ursula', 'Encore Eugene',
  'Mezzanine Marguerite', 'Overture Otis', 'Curtain Call Clementine', 'Footlight Felix',
  'Intermission Ida', 'Spotlight Sylvester', 'Marquee Margot', 'Rush Line Rosalind',
  'Standing Room Stanley', 'Box Office Beatrix', 'Stage Door Dorothea', 'Playbill Penelope',
  'Ghost Light Gideon', 'Half Hour Hazel', 'Callback Cordelia', 'Downstage Delphine',
  'Upstage Ulysses', 'Jazz Hands Jasper', 'Prop Table Prudence', 'Places Please Percival'
];
const REPORTER_NAME_KEY = 'srs-reporter-name';

function reporterName(){
  try{
    let name = localStorage.getItem(REPORTER_NAME_KEY);
    if (!name) {
      name = REPORTER_NAMES[Math.floor(Math.random() * REPORTER_NAMES.length)];
      localStorage.setItem(REPORTER_NAME_KEY, name);
    }
    return name;
  } catch {
    return REPORTER_NAMES[Math.floor(Math.random() * REPORTER_NAMES.length)];
  }
}

function formatPrice(amount){
  return `$${amount.toFixed(2).replace(/\.00$/, '')}`;
}

// e.g. "Shared by Matinee Mavis on Oct 3, 2026"
function formatByline(r){
  const date = new Date(r.submittedAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
  return `Shared by ${r.sharedBy} on ${date}`;
}

// e.g. "Rush · Got a ticket · $40.66 · Standing room available"
function formatReport(r){
  const parts = [TICKET_METHODS[r.method], r.gotTicket ? 'Got a ticket' : 'No ticket'];
  if (r.pricePaid !== null) parts.push(formatPrice(r.pricePaid));
  if (r.standingRoomAvailable !== null) parts.push(r.standingRoomAvailable ? 'Standing room available' : 'Standing room not available');
  return parts.join(' · ');
}
