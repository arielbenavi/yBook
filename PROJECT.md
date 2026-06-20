# PROJECT.md — yBook

> The living source of truth. CLAUDE.md says *how* to work; this file says *what* to build
> and *where we are*. Update the Implementation plan and Progress log every iteration.

---

## Vision

A Twitter-style feed of the **most interesting** reader comments on Ynet articles.
Each feed item is a **comment presented as a post** (the take someone is making), with the
**article embedded beneath it as a quoted card** — the Twitter quote-tweet shape. An
interest **score** ranks the feed so the sharpest comments rise to the top.

This is a UI-course final project: **the grade is the interface and UX**, not the data
pipeline. The app loads from a local JSON file; the scraper that produces it is a fully
separate concern and must never be a runtime dependency of the UI.

---

## Spec

### Stack
Vite + React + TypeScript (strict) + Tailwind + Framer Motion. Playwright for the scraper.
No backend. App runs with `npm i && npm run dev`.

### Data model
The unit of the feed is a `Post`: a comment that quotes an article.

```ts
type Comment = {
  id: string;
  author: string;          // e.g. "אבי"
  timestamp: string;       // ISO 8601
  title?: string;          // Ynet talkbacks have a bold title line
  body: string;
  likes: number;
  dislikes: number;
  replyCount: number;
  replies?: Comment[];     // nested, same shape
  score?: number;          // computed, not stored
};

type ArticleRef = {
  id: string;              // slug, e.g. "sywkiqzmgx"
  url: string;
  title: string;
  source: "ynet";
  author: string;          // article byline, e.g. "ליאור בן ארי"
  publishedAt: string;     // ISO 8601
  imageUrl?: string;
};

type Post = { comment: Comment; quoted: ArticleRef };  // the feed unit

type Feed = { generatedAt: string; posts: Post[] };    // shape of data/feed.json
```

Seed `data/feed.json` with ~15 realistic hand-built Posts so the UI is fully functional
before the scraper exists. The timeline may mix comments quoting different articles (each
Post carries its own `quoted`); single-article mode is just the case where every Post quotes
the same `ArticleRef`.

### Scoring (keep it swappable)
All ranking lives behind one pure function in `src/scoring/`:

```ts
function scoreComment(c: Comment, ctx?: ScoreContext): number
```

Ship a **placeholder** default — `score = (c.likes - c.dislikes) + 1.5 * c.replyCount`,
with an optional mild recency factor. The interface matters more than the formula; the real
score will be designed later by swapping this one function. Unit-test it.

### Scraper (separate from the app)
- `scripts/scrape.ts`, run via `npm run scrape -- <articleUrl>`, writes `data/feed.json`.
- Headless Chromium via Playwright.
- Strategy: navigate to the article; expand all comments (click "הצג עוד" / "להמשך קריאה"
  until none remain); **intercept the network responses** to capture the talkback JSON the
  page fetches — primary path, yields structured data directly. **Fallback:** parse the
  rendered DOM for the same fields.
- Build the `ArticleRef` from page metadata (`og:title`, `og:image`, author byline,
  canonical URL, slug as `id`).
- Map raw → `Post[]` (wrap each top-level comment as a Post quoting this article), including
  nested replies, and write `{ generatedAt, posts }` to `data/feed.json`.
- The talkback endpoint is undocumented and may change — that is exactly why we intercept +
  DOM-fallback rather than hardcode a URL.

### UI / UX
- **Feed of PostCards.** Default sort = interest score desc. Sort toggle: **Top / Newest /
  Most discussed**.
- **PostCard layout** (top → bottom):
  1. Header: colored avatar (author initial), author, relative time.
  2. The comment as the post: bold `title` (if present) + `body`.
  3. **Quoted article card**: image, headline, "ynet" source badge, byline, link-out.
  4. Footer: 👍/👎 counts, reply count, subtle interest-score badge.
  5. Replies expand inline as a thread.
- Header bar: app name (yBook), and when single-article, the article title + comment count.
- Loading skeletons, empty state, graceful error state.
- Fully responsive (mobile-first), **correct RTL throughout**, accessible (semantic HTML,
  keyboard, aria). Optional dark mode.
- Motion: restrained — fade/slide on mount, count tick on like. No gratuitous animation.
- Aim for a **distinctive, intentional visual identity**, not a default Tailwind look.

### Architecture
Small single-responsibility components. Types in `src/types.ts`. Data access in one module.
Scraper code in `scripts/`, never imported by the app.

---

## Acceptance criteria (testable)

- [ ] `npm i && npm run dev` runs with **zero console errors**.
- [ ] Feed renders Posts from `data/feed.json`; each PostCard shows the comment as the post
      and the article as a quoted card beneath it.
- [ ] All three sorts (Top / Newest / Most discussed) work and visibly reorder the feed.
- [ ] Replies expand and collapse inline.
- [ ] Layout is correct in RTL on both mobile (~380px) and desktop widths.
- [ ] `scoreComment` is unit-tested and isolated; swapping it changes ranking only.
- [ ] `npm run scrape -- <ynetArticleUrl>` produces a valid `data/feed.json` the app renders.
- [ ] `npm run typecheck`, `npm run lint`, and `npm run test` all pass.

---

## Implementation plan

> One task per iteration. Implement fully → `typecheck` + `lint` + `test` pass → update
> this file (check the box, add a one-line Progress log entry) → commit → stop. 30 tasks
> total. Plan finalized in plan mode on 2026-06-19.

### Phase 1 — Scaffold & harness
- [x] 1. Init Vite (react-ts) baseline: `npm create vite@latest . -- --template react-ts`, prune starter clutter, `npm i`, confirm `npm run dev` boots.
- [x] 2. Add Tailwind + Framer Motion: install + configure (Tailwind v4 via `@tailwindcss/vite` plugin, `@import "tailwindcss"` + `@theme { ... }` in `src/index.css` — no JS config file).
- [x] 3. Wire scripts: `typecheck` (`tsc -b --noEmit`), `lint` (ESLint flat config with `typescript-eslint` + react-hooks + react-refresh), `test` (vitest run) — all four runnable and clean.
- [x] 4. RTL base + design tokens: `<html dir="rtl" lang="he">`, Hebrew web font (Assistant w/ Heebo/Rubik fallbacks), palette + radii + shadow tokens in `@theme {}` (no JS config — Tailwind v4).
- [x] 5. App shell: reusable `AppShell` (sticky wordmark header + centered max-w-[600px] feed container). App.tsx composes it with a dashed-border placeholder marking the future feed mount point. Browser-verified at 380px / 600px / 1280px; `mx-auto` centers at desktop, gutters take over on mobile.

### Phase 2 — Types & data
- [x] 6. `src/types.ts`: `Comment`, `ArticleRef`, `Post`, `Feed` per spec. `ScoreContext` deferred to task 16 (lives next to the scoring fn).
- [x] 7. Seed `data/feed.json`: 15 hand-built Posts across 3 articles (the real Trump/Netanyahu piece + a plausible cost-of-living one + a plausible northern-border one). Anchored by two verbatim real comments (חחחחחח / אבי). 7 posts with nested replies (1 level deep). Engineered so Top-by-score (רחל), Newest (תומר), Most-replied (אבי) are three different posts.
- [ ] 8. Data-access module `src/data/feed.ts`: imports JSON, runtime-validates the shape, throws a typed error on mismatch, returns `Feed`. Only path the app uses to read feed data.

### Phase 3 — Feed UI (static render)
- [ ] 9. `PostCardHeader`: avatar (initial + deterministic color via `utils/avatarColor`), author, relative time (`utils/time`).
- [ ] 10. `CommentBody`: bold optional `title` + `body`; RTL-correct line wrapping; long text doesn't break layout.
- [ ] 11. `QuotedArticleCard`: image (with fallback), headline, "ynet" badge, byline, external-link icon, link-out (`target=_blank rel=noopener`).
- [ ] 12. `EngagementFooter`: 👍/👎 counts, reply count, subtle interest-score badge. Display-only.
- [ ] 13. `ReplyThread`: inline expand/collapse, recursive with indent/connector and a sane max depth.
- [ ] 14. `PostCard`: compose Header + CommentBody + QuotedArticleCard + Footer + ReplyThread.
- [ ] 15. `FeedList` + wire into `App`: load via `src/data/feed.ts`, render `PostCard[]`. Acceptance criterion "feed renders Posts" hits here.

### Phase 4 — Scoring & controls
- [ ] 16. `src/scoring/scoreComment.ts` + unit tests: pure fn with default formula `(likes − dislikes) + 1.5 * replyCount`. Optional recency factor via `ScoreContext`, off by default. Tests cover: basic math, replies weight, negative net likes, missing fields, determinism.
- [ ] 17. Apply scores; default sort = score desc.
- [ ] 18. `SortToggle`: Top / Newest / Most discussed; wired to feed state, visibly reorders, keyboard-accessible.

### Phase 5 — Polish
- [ ] 19. Loading skeleton (`Skeleton` component during load; small artificial delay to demo, removed in prod build).
- [ ] 20. Empty + error states (`EmptyState`, `ErrorState`) wired into the feed flow.
- [ ] 21. Framer Motion: staggered mount fade/slide on PostCards, count-tick on like (display-only). No layout-shifting motion.
- [ ] 22. Responsive + RTL audit: mobile (~380px) + desktop walkthrough; fix any LTR/RTL regressions (icons, indent direction, scroll-bars).
- [ ] 23. a11y pass: semantic landmarks, focus-visible, aria-labels on icon buttons, keyboard control of SortToggle + ReplyThread, color-contrast check.
- [ ] 24. Distinctive visual identity: custom palette + typography + iconography to escape default Tailwind look.

### Phase 6 — Scraper (offline; not imported by app)
- [ ] 25. `scripts/scrape.ts` baseline: Playwright headless Chromium, CLI arg parsing (`process.argv[2]`), navigate to article URL, write a stub `Feed` to `data/feed.json` so the end-to-end shape is wired.
- [ ] 26. Expand all comments: loop clicking "הצג עוד" / "להמשך קריאה" / "תגובות נוספות" and reply-expanders (match by role+accessible name, not exact text) until none remain or a stable-state heuristic triggers. Polite delays between clicks.
- [ ] 27. Intercept talkback JSON (primary) + DOM fallback: register `page.on('response', ...)` before navigation; capture JSON responses from Ynet talkback endpoints; fall back to DOM scraping if no JSON captured. Log which path was used.
- [ ] 28. Build `ArticleRef` from page metadata: `og:title`, `og:image`, byline, canonical URL, slug from URL path as `id`.
- [ ] 29. Map raw → `Post[]`, write `data/feed.json`: wrap each top-level comment as a `Post` quoting the article, include nested replies, validate output with the same shape check the app uses. End-to-end: `npm run scrape -- <url>` produces a feed the app renders without changes.

### Phase 7 — Docs
- [ ] 30. README: how to run, how to scrape, how to swap the scoring function, project structure overview.

---

## Progress log

- _(seed)_ Repo initialized from PROJECT.md and CLAUDE.md. Plan to be finalized in plan mode.
- 2026-06-19 — Task 1: Vite + React 18 + TS strict scaffold by hand (create-vite@latest needs Node 20). `npm run build` green, `npm run dev` boots clean. Lint + vitest not wired yet (task 3).
- 2026-06-19 — Task 2: Tailwind v4 via `@tailwindcss/vite` + Framer Motion. `@theme` token mechanism wired (placeholder `--color-brand` to be replaced in task 4). Browser-verified: `bg-amber-50`, `text-brand`, RTL layout all rendering.
- 2026-06-19 — Task 3: ESLint 10 flat config (typescript-eslint + react-hooks + react-refresh), `tsc -b --noEmit` typecheck, `vitest run` with one smoke test. All three green. jsdom not installed yet — add when first component test needs the DOM.
- 2026-06-19 — Task 4: warm-paper/ink palette + coral brand + ynet badge color, Assistant font preconnected via Google Fonts, card radius + soft "paper-lift" shadow. Browser-verified at desktop + 380px mobile: rgb tokens match, RTL bidi correct on mixed Hebrew/Latin text, no console errors.
- 2026-06-19 — Task 5: AppShell component (sticky paper/90 + backdrop-blur header, centered max-w-[600px] main). App.tsx composes shell + dashed placeholder. Verified: desktop centers (340px margins each side), mobile fills with 16px gutters, RTL wordmark anchored top-right.
- 2026-06-19 — Task 6: `src/types.ts` — Comment / ArticleRef / Post / Feed exactly per PROJECT.md. ScoreContext deliberately omitted; it ships with `scoreComment.ts` in task 16.
- 2026-06-19 — Task 7: 15-post seed in `data/feed.json` across 3 articles. Ynet og:image didn't come back via WebFetch, so all three images use themed placehold.co URLs (paper-deep bg, ink-subtle fg). 2 net-negative posts, 7 with replies, mix of titled/untitled, Hebrew+Latin embeds (G7, 2026, ynet) for bidi. Verified the three sort axes (score / newest / replies) produce three different winners.
