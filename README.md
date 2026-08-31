# Standing Room Society | The Cheap Seats Directory

A dynamically-updated table of currently running Broadway and Off-Broadway shows:
theater + address, run dates, weekly schedule, and lottery/rush info.


```
index.html               → markup only
styles.css               → all styling
app.js                   → fetch/render logic + embedded fallback data
data/shows.json          → the live dataset (auto-updated daily)
scraper/scrape.js        → scrapes IBDB (Broadway) + Playbill (Off-Broadway)
.github/workflows/       → runs the scraper every day, commits changes
```

No database, no server. GitHub Actions runs the scraper on a cron schedule,
commits the updated `data/shows.json` straight to the repo, redeployed by Vercel automatically.
