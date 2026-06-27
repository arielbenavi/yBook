# yBook

A Twitter-style feed that surfaces the most interesting reader comments on
[Ynet](https://www.ynet.co.il) articles. Each feed item is a **comment rendered
as a post**, with the source article **embedded beneath it as a quoted card** —
the same shape as a Twitter quote-tweet. An interest score ranks the feed so the
sharpest takes rise to the top.

## Quick start

```bash
npm install
npm run dev        # → http://localhost:5179
```

The app loads comments from `data/feed.json`. A seed file ships with the repo so
the UI works out of the box.

## Scraping a live article

First time only — install the Playwright browser:

```bash
npx playwright install chromium
```

Then scrape any Ynet article:

```bash
npm run scrape -- https://www.ynet.co.il/news/article/sywkiqzmgx
```

The scraper opens the article in headless Chromium, intercepts the talkback API
responses (paginating until `hasMore === 0`), extracts article metadata from
`<meta>` tags, maps everything to the app's `Post[]` shape, validates the output,
and writes `data/feed.json`. The dev server hot-reloads the new data on save.

## Swapping the score formula

All ranking lives in one pure function:

```
src/scoring/scoreComment.ts → scoreComment(c: Comment, ctx?: ScoreContext): number
```

The current formula is a placeholder: `(likes − dislikes) + 1.5 × replyCount`
with a mild recency boost. Replace the body — the export name is the contract.
Every consumer (sorting, the score badge) picks up the change automatically.
Unit tests are in `scoreComment.test.ts`; run `npm test` after swapping.

## Project structure

```
src/
  components/       UI components (PostCard, QuotedArticleCard, SortToggle, …)
  scoring/          scoreComment + sortPosts (the pluggable ranking layer)
  data/feed.ts      Data access — loads & validates feed.json
  types.ts          Comment, ArticleRef, Post, Feed type definitions
  App.tsx           Root: load → score → sort → render
scripts/
  scrape.ts         Playwright scraper (never imported by the app)
data/
  feed.json         The feed file — output of the scraper, input to the app
```

## Stack

| Layer       | Tool                                    |
|-------------|-----------------------------------------|
| Build       | Vite 6                                  |
| UI          | React 18 + TypeScript (strict)          |
| Styling     | Tailwind CSS v4 (`@tailwindcss/vite`)   |
| Motion      | Framer Motion 11                        |
| Scraper     | Playwright (headless Chromium)          |
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
