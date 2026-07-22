# Standing Room Society — The Cheap Seats Directory

A dynamically-updated table of currently running Broadway and Off-Broadway shows:
theater + address, run dates, weekly schedule, and lottery/rush info.

## How it's wired together

```
index.html               → markup only
styles.css               → all styling
app.js                   → fetch/render logic + embedded fallback data
data/shows.json          → the live dataset (auto-updated daily)
scraper/scrape.js        → scrapes IBDB (Broadway) + Playbill (Off-Broadway)
.github/workflows/       → runs the scraper every day, commits changes
```

No database, no server. GitHub Actions runs the scraper on a cron schedule,
commits the updated `data/shows.json` straight to the repo, and your host
(Vercel/Netlify) redeploys automatically on that push. The whole pipeline is free.

## First-time setup

1. **Push this repo to GitHub.**
2. **Connect it to Vercel or Netlify** (either one — free tier, auto-deploy
   on push, gives you a URL immediately). No build step needed, it's a
   static site — root directory, no framework.
3. **Calibrate the scraper (~30–60 min, one time):**
   - Open `scraper/scrape.js`.
   - Every selector marked `CALIBRATE` is a placeholder — I wrote this
     without live access to ibdb.com or playbill.com, so these need to match
     the real DOM.
   - Open the target URL (`IBDB_URL`, `PLAYBILL_OFFBWAY_URL` at the top of the
     file) in your browser, right-click a show listing → **Inspect**, and find
     the actual class names / structure wrapping each show.
   - Update the `.find()` selectors in `parseIbdb()` and
     `parsePlaybillOffBroadway()` to match.
   - Test locally:
     ```
     cd scraper
     npm install
     npm run scrape:dry   # prints result, doesn't touch shows.json
     ```
   - Once it looks right, run `npm run scrape` for real, check the diff in
     `data/shows.json`, and commit.
4. **Enable the GitHub Action:** it's already set to run daily at 10:00 UTC
   (~6am ET) via `.github/workflows/update-shows.yml`. You can also trigger
   it manually any time from the **Actions** tab → "Update show data" →
   **Run workflow**.

## Ongoing maintenance

- The scraper **merges** rather than overwrites: if it can't parse a field
  for a show it already knows about, it keeps whatever was there before
  instead of replacing good data with a blank. New shows get added, closed
  shows (no longer on either source) drop off automatically.
- If a site redesigns and the scraper starts returning 0 shows, the workflow
  is set to **fail loudly and not commit** — you'll get a red X in the
  Actions tab rather than a silently broken site. Re-calibrate the selectors
  when that happens.
- To manually correct a field (e.g. you know a show's exact performance
  schedule and the scraper only gives a generic placeholder), edit
  `data/shows.json` directly. The merge logic in `scrape.js` preserves
  hand-edited `schedule`/`discount` fields as long as the scraper's own
  output for that field still looks like the generic placeholder text —
  see `mergeWithExisting()`.

## Adding a new data source later

Same pattern as IBDB/Playbill: write a `parseX(html)` function that returns
an array of `{ title, kind, theater, address, opened, closes, schedule,
discount }` objects, fetch its URL in `main()`, and spread it into `scraped`.
