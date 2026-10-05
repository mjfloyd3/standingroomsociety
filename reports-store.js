// Prototype-only storage for visitor reports. localStorage means each report
// lives on the submitting device and nothing is shared between visitors;
// swap these load/save/update/delete functions for API calls once a real
// backend exists.
const REPORTS_KEY_PREFIX = 'srs-reports-v2:';

const TICKET_METHODS = {
  rush: 'Rush',
  standing_room: 'Standing room',
  lottery: 'Lottery'
};

function loadReports(slug){
  try{
    return JSON.parse(localStorage.getItem(REPORTS_KEY_PREFIX + slug)) || [];
  } catch {
    return [];
  }
}

function writeReports(slug, reports){
  try{
    localStorage.setItem(REPORTS_KEY_PREFIX + slug, JSON.stringify(reports));
    return true;
  } catch {
    return false;
  }
}

// Returns the new report's id, or null if it couldn't be stored. The id lets
// the optional follow-up answers and Undo act on this same report.
function saveReport(slug, report){
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return writeReports(slug, [{ id, ...report }, ...loadReports(slug)]) ? id : null;
}

function updateReport(slug, id, changes){
  return writeReports(slug, loadReports(slug).map(r => r.id === id ? { ...r, ...changes } : r));
}

function deleteReport(slug, id){
  return writeReports(slug, loadReports(slug).filter(r => r.id !== id));
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

// e.g. "Shared by Matinee Mavis on Oct 3, 2026". Reports saved before names
// existed have no sharedBy.
function formatByline(r){
  const date = new Date(r.submittedAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
  return `Shared by ${r.sharedBy || 'Anonymous'} on ${date}`;
}

// e.g. "Rush · Got a ticket · $40.66 · Standing room available"
function formatReport(r){
  const parts = [TICKET_METHODS[r.method], r.gotTicket ? 'Got a ticket' : 'No ticket'];
  if (r.pricePaid !== null) parts.push(formatPrice(r.pricePaid));
  if (r.standingRoomAvailable !== null) parts.push(r.standingRoomAvailable ? 'Standing room available' : 'Standing room not available');
  return parts.join(' · ');
}
