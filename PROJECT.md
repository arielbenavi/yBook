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
- [x] 8. Data-access module `src/data/feed.ts`: imports JSON, runtime-validates the shape, throws `FeedShapeError` on mismatch, exposes `loadFeed(): Promise<Feed>`. Async on purpose so Phase 6's fetched/live source is a true one-file swap. Validation runs eagerly at module load — bad shape fails the app, not a deep render.

### Phase 3 — Feed UI (static render)
- [x] 9. `PostCardHeader`: avatar (Hebrew-aware initial via `Array.from`[0], deterministic color from a hand-picked 10-step palette via djb2 hash), author, relative time via `Intl.RelativeTimeFormat('he')` with absolute time tucked into the `title` attr. RTL row, avatar at inline-start.
- [x] 10. `CommentBody`: optional title rendered as bold `text-lg leading-snug` lead line, body as `leading-relaxed whitespace-pre-line break-words text-ink`. flex-col with gap so untitled posts have no empty top gap. Verified 9-of-15 untitled-vs-titled both render cleanly at 380px + 600px.
- [x] 11. `QuotedArticleCard`: recessed nested card (bg-paper-deep + border-rule + rounded-card), 16:9 image with paper fallback, ynet badge (bg-ynet) + byline row, line-clamp-2 headline. Whole card is an anchor → article url, target=_blank rel=noopener, aria-label "קרא ב־ynet: <title>", img alt = headline.
- [x] 12. `EngagementFooter`: lucide ThumbsUp/ThumbsDown/MessageCircle + counts in ink-subtle; brand-soft score chip pushed to inline-end via `ms-auto` BUT only rendered when `comment.score` is defined (no fake numbers — scoring lands in task 16/17). Static, no click handlers.
- [x] 13. `ReplyThread`: collapsed-by-default inline thread. Real `<button aria-expanded>` toggle with Hebrew-pluralized labels ("הצג תגובה אחת" / "הצג N תגובות" / "הסתר תגובות"). Indent via `ms-5` + `ps-4` + `border-s border-rule` (all logical → both sit on the right in RTL). One level deep, no recursion; smaller avatar (h-8) + text-sm for visual subordination.
- [ ] 14. `PostCard`: ONE composition component taking a single `Post` prop. Composes `PostCardHeader` + `CommentBody` + `QuotedArticleCard` + `EngagementFooter` + `ReplyThread` into the Twitter card chrome — `bg-surface` + `rounded-card` + `shadow-card` paper-lift + comfortable padding (all from task-4 tokens). Phase-3 acceptance: the feed loop renders `<PostCard post={p}>` — sub-components are NEVER re-assembled inline (this is why the App preview will be replaced wholesale by `<FeedList>` in task 15).
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
- 2026-06-19 — Task 8: `src/data/feed.ts` — async `loadFeed(): Promise<Feed>` backed by an eager runtime validator (`checkFeed → checkPost → checkArticleRef/checkComment`). Throws `FeedShapeError` with path-qualified messages. Also verifies `replyCount === replies.length` per comment. The seed passes; vitest's module load doubled as a parser smoke check.
- 2026-06-20 — Task 9: `PostCardHeader` + utils. `avatarColor` (djb2 over author → fixed 10-color palette, white-text WCAG-AA safe) and `authorInitial` (Array.from for grapheme-safe Hebrew). `relativeTimeHe` / `absoluteTimeHe` via `Intl.RelativeTimeFormat('he')` + `Intl.DateTimeFormat('he-IL')`. Browser: three seed headers rendering "אתמול / שלשום / שלשום" with formatted Hebrew abs-time in title=. Smoke test dropped (real util tests cover it). 12 tests now passing.
- 2026-06-20 — Task 10: `CommentBody` — flex-col with conditional title (`text-lg font-bold leading-snug`) + body (`leading-relaxed whitespace-pre-line break-words text-ink`). App preview composes header + body together per post inside `<article>` wrappers. Untitled posts have no top gap (gap-1.5 only kicks in between siblings).
- 2026-06-20 — Task 11: `QuotedArticleCard` — anchor-as-card, bg-paper-deep + border-rule + rounded-card so it reads as a recessed quote-tweet beneath the comment. 16:9 image (placehold.co for now; paper-block fallback when imageUrl is absent), ynet badge in `bg-ynet`, byline next to it, line-clamp-2 headline. target=_blank + rel=noopener noreferrer, aria-label and img alt both derived from the headline.
- 2026-06-20 — Task 12: `EngagementFooter` — installed `lucide-react` (~6k icons exported, tree-shaken to three). 👍/👎/💬 rows with aria-labels "N אהבתי / N לא אהבתי / N תגובות". Score chip slot uses `ms-auto` so it lands at inline-end when present, but only renders when `comment.score !== undefined` — no fake values until task 16/17 wire real scoring.
- 2026-06-20 — Task 13: `ReplyThread` — collapsed-by-default, real `<button aria-expanded>` toggle, Hebrew pluralization (1 → "תגובה אחת"; N → "N תגובות"). Indent + thread line via `ms-5 + ps-4 + border-s border-rule` — verified via computed styles: `margin-inline-start: 20px`, `padding-inline-start: 16px`, `border-inline-start: 1px` rule color, so RTL puts indent + line on the right. Reduced-scale avatar (h-8) + text-sm for replies. App preview now shows אבי's 4 replies on toggle.
