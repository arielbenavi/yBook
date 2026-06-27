# yBook

A Twitter-style feed that surfaces the funniest, sharpest reader comments on
[Ynet](https://www.ynet.co.il) articles. Each feed item is a **comment rendered
as a post**, with the source article **embedded beneath it as a quoted card** —
the same shape as a Twitter quote-tweet. An AI humor score (powered by Gemini
Flash) ranks the feed so the best takes rise to the top and the generic filler
fades out. Think of it as a curated highlight reel of Israeli internet culture:
the blunt dismissals, the conspiracy uncles, the users whose username *is* the
joke.

## How it works

A Playwright scraper captures every comment on a Ynet article via its talkback
API. Before writing the feed, Gemini 2.5 Flash scores each comment 0–10 for
humor using a prompt calibrated for Israeli internet culture — it rewards punchy
one-liners, sardonic commentary, "aunt/uncle internet energy," and
username-as-performance. The React UI renders the scored feed with sort, filter,
and visual treatments that make the interesting stuff impossible to miss.

## Quick start

```bash
npm install
npm run dev        # → http://localhost:5179
```

The app loads from `data/feed.json`. A scored feed ships with the repo so the UI
works out of the box.

## Scraping a live article

First time only — install the Playwright browser:

```bash
npx playwright install chromium
```

Set up your Gemini API key (get one at
[aistudio.google.com](https://aistudio.google.com)):

```bash
echo "GEMINI_API_KEY=your-key-here" > .env
```

Then scrape any Ynet article:

```bash
npm run scrape -- https://www.ynet.co.il/news/article/sywkiqzmgx
```

The scraper opens the article in headless Chromium, paginates the talkback API
until every comment is captured, scores them via Gemini, and writes
`data/feed.json`. The dev server hot-reloads on save.

**Append mode** — scraping a second article merges its comments into the existing
feed. Comments are deduplicated by ID (existing entries win, preserving their
scores). Scrape the same article again and nothing changes.

**No API key?** The scraper still works — it skips scoring, and comments appear
without humor badges.

## Humor scoring methodology

Every new comment is scored 0–10 by Gemini 2.5 Flash using a calibrated prompt
that understands Israeli talkback culture:

| Score | What it means | Example |
|-------|--------------|---------|
| 7–10  | A comment with a *voice* — blunt dismissals, sardonic commentary, username-as-joke combos | **חחחחחח**: "שמישהו יגיד לו המלך עירום (טיפש גמור)" |
| 3–6   | Some personality — a real person talking, political opinions with flair | **יודקה**: repeated psychological observation with odd formatting |
| 0–2   | Personality-free filler — generic takes, bot-like approvals, interchangeable text | **אנונימי**: bland political comparison |

The scoring prompt considers usernames as context: a funny username (שמאלני
מזוקק, רפובליקנים יוק, ברדוגית) elevates a comment if the text itself has voice
too, but doesn't automatically make a 10.

The humor threshold is `HUMOR_THRESHOLD = 5` in `src/scoring/humorThreshold.ts`.
Comments below this threshold appear at 50% opacity with a "נסתר" chip when the
filter shows all posts, and are hidden entirely in "מצחיק בלבד" mode (the
default).

## UI features

- **Feed of quote-tweet cards** — each comment is a post, each article is a
  quoted card beneath it, with image, headline, and ynet badge.
- **4 sort modes**: מעניין (interest score), חדש (newest), הכי נדון (most
  discussed), מצחיק (humor score desc).
- **Filter toggle**: "מצחיק בלבד" (default) hides low-humor comments; "הכל"
  shows everything with opacity treatment on below-threshold posts.
- **Humor badges**: color-scaled 😂 chip per post (coral for 7–10, neutral for
  3–6, subtle for 0–2). Hover for the AI's one-sentence Hebrew reasoning.
- **Replies** expand inline as threaded conversations.
- **RTL-first** — everything renders correctly in Hebrew, right-to-left.

## Tuning the scoring

Three knobs, all independent:

1. **Interest score formula** — `src/scoring/scoreComment.ts`. Pure function,
   swappable body. Current placeholder: `(likes − dislikes) + 1.5 × replyCount`
   with a mild recency boost. Unit tests in `scoreComment.test.ts`.
2. **Humor threshold** — `src/scoring/humorThreshold.ts`. Change the constant to
   raise or lower the bar for what counts as "funny."
3. **Gemini prompt** — `scripts/scrape.ts`, the `buildScoringPrompt` function.
   The prompt defines what scores high vs. low. Edit it, clear `data/feed.json`,
   and re-scrape to re-score everything.

## Project structure

```
src/
  components/       UI (PostCard, QuotedArticleCard, SortToggle, FeedList, …)
  scoring/          scoreComment, sortPosts, humorThreshold
  data/feed.ts      Data access — loads & validates feed.json
  types.ts          Comment, ArticleRef, Post, Feed type definitions
  App.tsx           Root: load → score → filter → sort → render
scripts/
  scrape.ts         Playwright scraper + Gemini scoring (never imported by app)
data/
  feed.json         The feed file — scraper output, app input
```

## Stack

| Layer       | Tool                                    |
|-------------|-----------------------------------------|
| Build       | Vite 6                                  |
| UI          | React 18 + TypeScript (strict)          |
| Styling     | Tailwind CSS v4 (`@tailwindcss/vite`)   |
| Motion      | Framer Motion 11                        |
| Scraper     | Playwright (headless Chromium)           |
| Scoring     | Gemini 2.5 Flash (`@google/generative-ai`) |
| Test        | Vitest                                  |

## Scripts

| Command              | What it does                                   |
|----------------------|------------------------------------------------|
| `npm run dev`        | Start dev server (port 5179)                   |
| `npm run build`      | Type-check + production build                  |
| `npm run preview`    | Serve the production build locally             |
| `npm run typecheck`  | `tsc --noEmit` across all project references   |
| `npm run lint`       | ESLint (flat config, TS + React rules)         |
| `npm run test`       | Vitest (unit tests, single run)                |
| `npm run scrape`     | Run the Ynet scraper (pass `-- <url>`)         |
