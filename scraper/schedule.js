const cheerio = require("cheerio");

const DAY_ORDER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_ALIASES = {
  sun: "Sun", sunday: "Sun",
  mon: "Mon", monday: "Mon",
  tue: "Tue", tues: "Tue", tuesday: "Tue",
  wed: "Wed", wednesday: "Wed",
  thu: "Thu", thur: "Thu", thurs: "Thu", thursday: "Thu",
  fri: "Fri", friday: "Fri",
  sat: "Sat", saturday: "Sat",
};

function normalizeDay(token) {
  const key = token.toLowerCase().replace(/[.:]/g, "").trim();
  return DAY_ALIASES[key] || null;
}

function normalizeTime(timeStr) {
  const m = timeStr.trim().match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (!m) return null;
  let [, hour, min, ampm] = m;
  hour = parseInt(hour, 10);
  min = min ? parseInt(min, 10) : 0;
  ampm = ampm.toLowerCase();
  if (ampm === "pm" && hour !== 12) hour += 12;
  if (ampm === "am" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function expandDayRange(rangeStr) {
  const parts = rangeStr.split(/-|–|—/).map(s => s.trim());
  if (parts.length === 1) {
    const d = normalizeDay(parts[0]);
    return d ? [d] : [];
  }
  const start = normalizeDay(parts[0]);
  const end = normalizeDay(parts[1]);
  if (!start || !end) return [];
  const startIdx = DAY_ORDER.indexOf(start);
  const endIdx = DAY_ORDER.indexOf(end);
  const days = [];
  let i = startIdx;
  while (true) {
    days.push(DAY_ORDER[i]);
    if (i === endIdx) break;
    i = (i + 1) % 7;
    if (days.length > 7) break;
  }
  return days;
}

// "Wednesday @1pm and 7pm" -> [{day:"Wed",time:"13:00"},{day:"Wed",time:"19:00"}]
function parseChunk(chunk) {
  const m = chunk.match(/^(.+?)\s*@\s*(.+)$/i);
  if (!m) return [];
  const [, dayPart, timePart] = m;

  const dayGroups = dayPart.split(",").map(s => s.trim());
  const days = dayGroups.flatMap(expandDayRange);

  const times = timePart
    .split(/&|,|\band\b/i)
    .map(normalizeTime)
    .filter(Boolean);

  const results = [];
  for (const day of days) {
    for (const time of times) results.push({ day, time });
  }
  return results;
}

// Parses a plain-text weekly pattern (date range already stripped out), e.g.:
// "Tuesday @7pm, Wednesday @1pm and 7pm, Thursday @7pm, Friday @7pm, Saturday @1pm and 7pm, Sunday @1pm"
function parsePattern(patternText) {
  const chunks = patternText.split(",").map(s => s.trim()).filter(Boolean);
  const performances = chunks.flatMap(parseChunk);

  const coveredDays = new Set(performances.map(p => p.day));
  const darkDays = DAY_ORDER.filter(d => !coveredDays.has(d));

  return { performances, darkDays };
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july",
  "august", "september", "october", "november", "december"];

// "October 8–10" -> 3, "December 29–January 4" -> 7. null if it can't be read.
function rangeLengthInDays(rangeText) {
  const m = rangeText.trim().match(/^([a-z]+)\.?\s+(\d{1,2})\s*[-–—]\s*(?:([a-z]+)\.?\s+)?(\d{1,2})$/i);
  if (!m) return null;
  const startMonth = MONTHS.findIndex(name => name.startsWith(m[1].toLowerCase()));
  const endMonth = m[3] ? MONTHS.findIndex(name => name.startsWith(m[3].toLowerCase())) : startMonth;
  if (startMonth < 0 || endMonth < 0) return null;
  const year = 2001; // any non-leap year; only the gap matters
  const start = Date.UTC(year, startMonth, +m[2]);
  const end = Date.UTC(endMonth < startMonth ? year + 1 : year, endMonth, +m[4]);
  return Math.round((end - start) / 86400000) + 1;
}

// Extracts schedule from Playbill's <p><strong>SCHEDULE:</strong><br><u>date range</u>: pattern</p>
// Takes the FIRST full-week date-range block (most current), strips the <u> date range entirely.
// A block under 6 days (e.g. the first few preview days, "October 8–10") is skipped — 6, not 7,
// because Playbill often lists a Mon-dark week as Tue–Sun ("July 28–August 2"). Without the skip,
// every day the block doesn't mention would be reported as dark. Returns null if no
// full-week block exists, so the show keeps its placeholder rather than a wrong schedule.
// Some pages put the colon outside the bold (<strong>SCHEDULE</strong>:), e.g. Chicago.
function extractSchedule(html) {
  const $ = cheerio.load(html);

  const $scheduleP = $("p").filter((i, el) => {
    return /^SCHEDULE:?$/.test($(el).find("strong").first().text().trim().toUpperCase());
  }).first();

  if (!$scheduleP.length) return null;

  const rawHtml = $scheduleP.html();
  const lines = rawHtml.split(/<br\s*\/?>/i).map(l => l.trim()).filter(Boolean);

  const contentLines = lines.slice(1); // drop "<strong>SCHEDULE:</strong>"
  if (!contentLines.length) return null;

  for (const line of contentLines) {
    const $line = cheerio.load(line);
    const days = rangeLengthInDays($line("u").first().text());
    if (days !== null && days < 6) continue;
    $line("u").remove();
    let patternText = $line.root().text();
    patternText = patternText.replace(/^\s*:\s*/, "").trim();
    return parsePattern(patternText);
  }
  return null;
}

// "Tue 7pm · Wed 1pm & 7pm · Thu 7pm · Fri 7pm · Sat 1pm & 7pm · Sun 1pm"
function formatSchedule({ performances }) {
  const byDay = {};
  for (const { day, time } of performances) {
    (byDay[day] ||= []).push(time);
  }

  const formatTime = (t) => {
    const [h, m] = t.split(":").map(Number);
    const period = h >= 12 ? "pm" : "am";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return m === 0 ? `${hour12}${period}` : `${hour12}:${String(m).padStart(2, "0")}${period}`;
  };

  return DAY_ORDER
    .filter(d => byDay[d])
    .map(d => `${d} ${byDay[d].sort().map(formatTime).join(" & ")}`)
    .join(" · ");
}

module.exports = { parsePattern, extractSchedule, formatSchedule };

if (require.main === module) {
  const realHtml = `<p><strong>SCHEDULE:</strong><br><u>July 28–August 2</u>: Tuesday @7pm, Wednesday @1pm and 7pm, Thursday @7pm, Friday @7pm, Saturday @1pm and 7pm, Sunday @1pm</p>`;

  const multiBlockHtml = `<p><strong>SCHEDULE:</strong><br><u>December 22–28</u>: Monday @7pm, Tuesday @1pm and 7pm, Friday @7pm, Saturday @1pm and 7pm, Sunday @1pm and 7pm<br><br><u>December 29–January 4</u>: Monday @7pm, Tuesday @1pm and 7pm, Thursday @7pm, Friday @7pm, Saturday @1pm and 7pm, Sunday @1pm</p>`;

  console.log("--- Real single-block ---");
  const result1 = extractSchedule(realHtml);
  console.log(JSON.stringify(result1, null, 2));
  console.log("Display:", formatSchedule(result1));

  console.log("\n--- Multi-block (only first block taken) ---");
  const result2 = extractSchedule(multiBlockHtml);
  console.log(JSON.stringify(result2, null, 2));
  console.log("Display:", formatSchedule(result2));

  const partialWeekHtml = `<p><strong>SCHEDULE:</strong><br><u>October 8–10</u>: Thursday @8pm, Friday @8pm, Saturday @8pm</p>`;
  const partialThenFullHtml = `<p><strong>SCHEDULE:</strong><br><u>October 8–10</u>: Thursday @8pm, Friday @8pm, Saturday @8pm<br><br><u>October 11–17</u>: Sunday @3pm, Tuesday @8pm, Wednesday @2pm and 8pm, Thursday @8pm, Friday @8pm, Saturday @2pm and 8pm</p>`;

  console.log("\n--- Partial preview week only (expect null) ---");
  console.log(extractSchedule(partialWeekHtml));

  console.log("\n--- Partial week then full week (expect second block) ---");
  const result4 = extractSchedule(partialThenFullHtml);
  console.log("Display:", formatSchedule(result4), "| dark:", result4.darkDays.join(", "));
}
