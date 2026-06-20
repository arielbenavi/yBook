# yBook — finalized plan (pre-implementation)

## Context

The yBook repo currently contains only `CLAUDE.md` and `PROJECT.md`. The spec is fully
written; this plan refines PROJECT.md's Phase 1–7 task list into concrete, one-task-per-
iteration steps, proposes the repo file tree, and flags risks before any code is written.

The user-facing goal: a Twitter-style feed where each item is a **Ynet reader comment
rendered as a post**, with the **article quoted beneath it**, ranked by an interest score.
The grade is the UI/UX. The scraper is a separate, offline concern that produces
`data/feed.json`.

After approval, I will:
1. Write the refined task list into `PROJECT.md` under the **Implementation plan** section
   (replacing the current Phase 1–7 bullets).
2. Stop and wait for an explicit go-ahead.
3. Then work the CLAUDE.md loop: one task → typecheck + lint + test → update PROJECT.md →
   commit → stop.

---

## Proposed repo file tree

```
yBook/
├── .gitignore
├── .eslintrc.cjs            # or eslint.config.js (flat config)
├── .nvmrc                   # optional — Node 20+
├── CLAUDE.md                # exists
├── PROJECT.md               # exists
├── README.md                # Phase 7
├── index.html               # <html dir="rtl" lang="he">
├── package.json
├── package-lock.json
├── postcss.config.js
├── tailwind.config.js       # design tokens (palette, type, spacing)
├── tsconfig.json            # strict: true
├── tsconfig.node.json       # for vite.config.ts + scripts/
├── vite.config.ts           # vitest config merged here
├── data/
│   └── feed.json            # the only data file the app reads
├── public/
│   └── favicon.svg
├── scripts/
│   └── scrape.ts            # Playwright; never imported by the app
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css            # @tailwind base/components/utilities + base styles
    ├── types.ts             # Comment, ArticleRef, Post, Feed, ScoreContext
    ├── data/
    │   └── feed.ts          # the single data-access module (JSON import + validate)
    ├── scoring/
    │   ├── scoreComment.ts  # pure scoreComment() + default formula
    │   └── scoreComment.test.ts
    ├── components/
    │   ├── AppHeader.tsx
    │   ├── FeedList.tsx
    │   ├── PostCard.tsx
    │   ├── PostCardHeader.tsx
    │   ├── CommentBody.tsx
    │   ├── QuotedArticleCard.tsx
    │   ├── EngagementFooter.tsx
    │   ├── ReplyThread.tsx
    │   ├── SortToggle.tsx
    │   ├── Skeleton.tsx
    │   ├── EmptyState.tsx
    │   └── ErrorState.tsx
    ├── hooks/
    │   └── useFeed.ts       # load + sort state
    └── utils/
        ├── time.ts          # Hebrew relative time ("לפני 3 שעות")
        └── avatarColor.ts   # deterministic color per author
```

Notes:
- One data-access module (`src/data/feed.ts`) makes the JSON → live-source swap a one-file
  change, per CLAUDE.md.
- Scraper sits in `scripts/`. App never imports anything from there; `tsconfig.json`
  excludes `scripts/`, which has its own `tsconfig.node.json`.

---

## Refined Phase 1–7 — one task per iteration

Each numbered item is one iteration: implement fully → typecheck + lint + test pass →
update PROJECT.md → commit → stop.

### Phase 1 — Scaffold & harness
1. **Init Vite (react-ts) baseline.** `npm create vite@latest . -- --template react-ts`,
   prune the starter clutter, `npm i`, confirm `npm run dev` boots.
2. **Add Tailwind + Framer Motion.** Install + configure Tailwind (`tailwind.config.js`,
   `postcss.config.js`), add `@tailwind` directives to `src/index.css`, install
   `framer-motion`.
3. **Wire scripts.** Add `typecheck` (`tsc --noEmit`), `lint` (ESLint flat config with
   `@typescript-eslint` + `react` + `react-hooks`), `test` (vitest + jsdom). All four
   (`dev` / `typecheck` / `lint` / `test`) must run clean.
4. **RTL base + design tokens.** Set `<html dir="rtl" lang="he">` in `index.html`, add a
   Hebrew web font (e.g. Heebo or Assistant via Google Fonts), define palette / type
   scale / spacing tokens in `tailwind.config.js`.
5. **App shell.** Minimal `App.tsx` with `AppHeader` placeholder and a centered, mobile-
   first container. Confirm `dev` renders the shell with no console errors.

### Phase 2 — Types & data
6. **`src/types.ts`.** `Comment`, `ArticleRef`, `Post`, `Feed`, `ScoreContext` exactly per
   the spec.
7. **Seed `data/feed.json`.** ~15 hand-built Posts in realistic Hebrew, mixing two or
   three articles so the multi-article shape is exercised. Include at least 3 posts with
   nested replies (one nested 2 levels deep).
8. **Data-access module `src/data/feed.ts`.** Imports `data/feed.json`, runtime-validates
   the shape, throws a typed error on mismatch, returns `Feed`. This is the only path the
   app uses to read feed data.

### Phase 3 — Feed UI (static render)
9. **`PostCardHeader`.** Avatar (initial + deterministic color via `utils/avatarColor`),
   author name, relative time (`utils/time`).
10. **`CommentBody`.** Bold optional `title`, then `body`. RTL-correct line wrapping; long
    text doesn't break layout.
11. **`QuotedArticleCard`.** Image (with empty/fallback handling), headline, "ynet" source
    badge, byline, external-link icon, link-out (target=_blank, rel=noopener).
12. **`EngagementFooter`.** 👍/👎 counts, reply count, subtle interest-score badge.
    Display-only.
13. **`ReplyThread`.** Inline expand/collapse for nested replies; recursive render with a
    visible indent / connector and a sane max depth.
14. **`PostCard`.** Compose Header + CommentBody + QuotedArticleCard + Footer + optional
    ReplyThread.
15. **`FeedList` + wire into `App`.** Load via `src/data/feed.ts`, render `PostCard[]`.
    The acceptance criterion "feed renders Posts" is hit at this step.

### Phase 4 — Scoring & controls
16. **`src/scoring/scoreComment.ts` + tests.** Pure function with the default formula
    `(likes − dislikes) + 1.5 * replyCount`. Optional recency factor lives behind
    `ScoreContext`; default is no recency. Unit tests cover: basic math, replies weight,
    negative net likes, missing fields, and that two calls with the same input are equal.
17. **Apply scores; default sort = score desc.** Compute scores in the data module (or a
    selector hook), set the initial sort.
18. **`SortToggle`** — Top / Newest / Most discussed; wired to feed state, visibly
    reorders, keyboard-accessible.

### Phase 5 — Polish
19. **Loading skeleton.** `Skeleton` component used while feed loads (small artificial
    delay to demo; remove on prod build).
20. **Empty + error states.** `EmptyState` (no posts) and `ErrorState` (load/validate
    fail) wired into the feed flow.
21. **Framer Motion.** Mount fade/slide on PostCards (staggered, restrained); count tick
    on like (display-only, triggered by a placeholder action). No layout-shifting motion.
22. **Responsive + RTL audit.** Walk mobile (~380px) and desktop, fix any LTR/RTL
    regressions (icons, indent direction, scroll-bars).
23. **a11y pass.** Semantic landmarks, focus-visible, aria-labels on icon buttons,
    keyboard control of SortToggle and ReplyThread, color-contrast check.
24. **Distinctive visual identity.** Custom palette + typography + iconography choices to
    escape default Tailwind feel (per the spec's "intentional visual identity").

### Phase 6 — Scraper (offline; not imported by app)
25. **`scripts/scrape.ts` baseline.** Playwright headless Chromium, CLI arg parsing
    (`process.argv[2]`), navigate to the article URL, write a stub `Feed` to
    `data/feed.json` so the end-to-end shape is wired.
26. **Expand all comments.** Loop clicking "הצג עוד" / "להמשך קריאה" / "תגובות נוספות"
    (and any reply-expanders) until none remain or a stable-state heuristic triggers.
    Polite delays between clicks.
27. **Intercept talkback JSON (primary) + DOM fallback.** Register
    `page.on('response', ...)` before navigation; capture JSON responses from
    Ynet talkback endpoints; fall back to DOM scraping if no JSON is captured. Log which
    path was used.
28. **`ArticleRef` from page metadata.** `og:title`, `og:image`, byline, canonical URL,
    slug from the URL path as `id`.
29. **Map raw → `Post[]` and write `data/feed.json`.** Wrap each top-level comment as a
    `Post` quoting the article; include nested replies. Validate the output with the same
    shape check used by the app's data module. End-to-end: `npm run scrape -- <url>`
    produces a feed the app renders without changes.

### Phase 7 — Docs
30. **README.** How to run, how to scrape, how to swap the scoring function, project
    structure overview.

Result: 30 iterations. Each is atomic, fully implemented, ends with `typecheck` + `lint`
+ `test` green and a commit.

---

## Risks & ambiguities to flag

1. **Ynet talkback XHR shape is unknown.** PROJECT.md says comments load via a talkback
   XHR. The endpoint is undocumented and the field names will be discovered on first
   scrape. Phase 6 task 27 will need a one-time debug pass (log every response URL +
   content-type) to identify the right XHR before mapping fields. The intercept-primary
   / DOM-fallback strategy is correct precisely because of this uncertainty.

2. **Expand-button text variants.** "הצג עוד" and "להמשך קריאה" are the documented hints,
   but the actual button labels may differ ("תגובות נוספות", a numeric count, etc.) and
   reply-expanders are often a separate control. Task 26 should match by role+accessible
   name rather than exact text.

3. **Comment timestamps.** Ynet talkbacks often render relative times ("לפני שעה"). The
   XHR likely carries ISO timestamps; the DOM fallback may need to parse Hebrew relative
   time anchored to scrape time. If the XHR path works, this becomes a non-issue.

4. **Bidi text inside RTL.** Hebrew bodies frequently embed Latin words, URLs, and
   numbers. Most cases resolve correctly with `dir="rtl"`, but headers with mixed content
   (e.g. author name + timestamp) may need `dir="auto"` on individual spans. Will be
   caught in the Phase 5 RTL audit.

5. **Avatar color stability.** Avatar color must be deterministic per author so the same
   author looks the same across the feed. `utils/avatarColor` hashes the author string
   into a fixed palette — flagged so the choice is explicit, not accidental.

6. **Score recency factor.** PROJECT.md mentions an "optional mild recency factor". I'll
   keep it **off by default** and exposed via `ScoreContext`. Default formula stays pure
   and trivially testable. The real model can be swapped in later without touching the
   call sites.

7. **Single-article vs mixed-article feed.** The data model supports both. The header
   shows article title + comment count only when every Post in the feed shares the same
   `quoted.id` — small derived state, no separate "mode".

8. **Display-only engagement.** Like / dislike / reply counts and the like-tick animation
   are display-only — no real interaction with Ynet, no persistence. This is implied by
   the spec but worth being explicit so we don't accidentally build an action layer.

9. **Strict TS + JSON imports.** Vite supports `import feed from '../../data/feed.json'`
   with `resolveJsonModule: true`. The runtime validator in the data module is what
   guarantees correctness — TS will only widen to `unknown`-ish shapes from JSON.

10. **No secrets, polite scraping.** Per CLAUDE.md: one article per scraper invocation,
    sane timeouts (e.g. 30 s nav, 500 ms between expand clicks), no parallel hammering,
    a `User-Agent` that identifies the project. Scraped data beyond `data/feed.json` is
    never committed.

11. **`data/feed.json` is committed.** The seed (~15 hand-built posts) ships in git.
    Scraper output overwrites it. `.gitignore` covers everything else under `data/`.

12. **Visual identity vs. Ynet trademark.** The "ynet" badge will read as an obvious
    source indicator (small wordmark in the ynet orange), but I'll keep it generic
    enough that it doesn't pretend to be official Ynet UI.

---

## Verification (end-to-end, after the final phase)

- `npm i && npm run dev` boots with zero console errors.
- Feed renders ~15 PostCards from `data/feed.json`.
- Sort toggle visibly reorders by Top / Newest / Most discussed.
- Replies expand and collapse inline.
- Resize to ~380px: RTL layout still correct; resize to desktop: still correct.
- Tab through the page: SortToggle, reply expanders, and link-outs are reachable + visible.
- `npm run typecheck`, `npm run lint`, `npm run test` all pass.
- `npm run scrape -- <a real Ynet article URL>` overwrites `data/feed.json`; reload the
  dev server and the feed renders the scraped posts without any code change.

---

## What gets written into PROJECT.md after approval

Only the **Implementation plan** section (lines 125–173 of PROJECT.md) is rewritten —
its current Phase 1–7 sub-bullets are replaced with the 30 numbered checkboxes above,
preserving the section heading and the existing intro line. The Vision, Spec, Acceptance
criteria, and Progress log sections are not touched (Progress log will be appended to as
each iteration completes).
