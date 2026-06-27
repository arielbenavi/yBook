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

- [x] `npm i && npm run dev` runs with **zero console errors**.
- [x] Feed renders Posts from `data/feed.json`; each PostCard shows the comment as the post
      and the article as a quoted card beneath it.
- [x] All three sorts (Top / Newest / Most discussed) work and visibly reorder the feed.
- [x] Replies expand and collapse inline.
- [x] Layout is correct in RTL on both mobile (~380px) and desktop widths.
- [x] `scoreComment` is unit-tested and isolated; swapping it changes ranking only.
- [x] `npm run scrape -- <ynetArticleUrl>` produces a valid `data/feed.json` the app renders.
- [x] `npm run typecheck`, `npm run lint`, and `npm run test` all pass.

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
- [x] 14. `PostCard`: ONE composition component taking a single `Post` prop. Composes `PostCardHeader` + `CommentBody` + `QuotedArticleCard` + `EngagementFooter` + `ReplyThread`. Card chrome: `bg-surface` + `rounded-card` (14px) + `shadow-card` paper-lift + `p-5` (20px) padding. Vertical rhythm: inner `gap-3` (12px) tighter than the feed-level outer `gap-5` (20px) per gestalt proximity. App now renders the full 15-post feed via `posts?.map(p => <PostCard post={p} />)` — no inline reassembly.
- [x] 15. `FeedList` + wire into `App`: pure refactor — extracted the gap-5 `<PostCard>` map loop from App.tsx into `src/components/FeedList.tsx` taking `posts: Post[]`. App.tsx is now load + `<AppShell><FeedList posts={posts ?? []}/>`. Stable key = `post.comment.id`. Identical render verified (15 articles, same wrapper class+gap, same author order).

### Phase 4 — Scoring & controls
- [x] 16. `src/scoring/scoreComment.ts` + unit tests: pure `scoreComment(c, ctx?)` with `ScoreContext = { now?: Date }`. Default formula `(likes − dislikes) + 1.5 * replyCount`. Optional mild recency boost (1 / (1 + ageHours/72)) × 5 — gated on `ctx.now`, so the fn is pure-by-default and tests inject `now` for determinism. Marked clearly as the swappable placeholder. 10 new tests cover net-negative, replies weight, determinism, purity, recency mildness, future-stamps don't crash.
- [x] 17. Apply scores; default sort = score desc. In App.tsx, one `new Date()` per load is shared across the whole feed inside a `useMemo`, then each post gets `comment.score = scoreComment(c, { now })` and posts are sorted by score desc. EngagementFooter chip styling re-tuned to subtle (`bg-rule/40` + `text-ink-subtle`), rounded integer display. Verified: רחל leads (89), אבי מ. second (75), net-negatives sink (דורון_ירושלים −8, אילן ש. −19).
- [x] 18. `SortToggle`: segmented pill (מעניין / חדש / הכי נדון) at the top of the feed. `role="radiogroup"` + `role="radio"` + `aria-checked`, active tab in `bg-brand text-white`. ONE selector `sortPosts(posts, mode)` over the already-scored posts; FeedList stays a dumb renderer. Tie-break by score desc + stable Array.prototype.sort = no jitter between toggles. Browser-verified: מעניין → רחל, חדש → תומר, הכי נדון → אבי (three different leaders, as the seed engineered).

### Phase 5 — Polish
- [x] 19. Loading skeleton — `PostCardSkeleton` mirrors the real PostCard chrome and slot shapes so layout doesn't shift (no CLS), wrapped by `FeedSkeleton` (4 placeholders, `role="status" aria-label="טוען פיד"`). Pulse via `motion-safe:animate-pulse` so `prefers-reduced-motion` users get static placeholders. App now drives a real `FeedState` discriminated union (`loading | loaded | error`) off loadFeed's promise — error branch reserved for task 20. Verified mid-load (temp 10s delay, reverted before commit) and at load: SortToggle stays in place across the transition.
- [x] 20. Empty + error states. `EmptyState` (`role="status"`, card-chromed) when `loaded && posts.length === 0`. `ErrorState` (`role="alert"`, card-chromed, retry button) when loadFeed rejects — including FeedShapeError. App.tsx branches across loading / loaded-empty / loaded-non-empty / error as mutually-exclusive UI. Retry handler resets to loading and re-runs fetchFeed. Restructured fetch flow so setState never fires synchronously inside the useEffect body (silences eslint-plugin-react-hooks v7's `set-state-in-effect`).
- [x] 21. Framer Motion: PostCard wrapped in `motion.article` with `initial={opacity:0, y:8} → animate={opacity:1, y:0}` over 280ms easeOut. FeedList passes `mountDelay = min(i*0.04, 0.32)` so stagger reads but doesn't tail out into a long feed. Score chip in `EngagementFooter` gets a 220ms scale-pop on first mount. `MotionConfig reducedMotion="user"` at the root drops everything to a no-op when prefers-reduced-motion is set. Sort reorders preserve component identity via the post.comment.id key — verified post-toggle that all articles stay at end state (`opacity:1, transform:none`), no re-animation. Pinned framer-motion to ^11 because v12 requires React 19.
- [x] 22. Responsive + RTL audit at 360/390/768/1024/1440. **Found**: sort pill h=28px, reply toggle h=20px, retry button h≈32px — all below the 44px mobile touch target. **Fixed**: `min-h-[44px] md:min-h-0` on each so mobile gets a proper hitbox and desktop shrinks back. Verified: sort pill 44→28, reply toggle 44→20 across the breakpoint. Also pinned Vite to a dedicated port 5179 (`strictPort: true`) so neighbouring previews can't steal the tab. Everything else clean across all widths: no h-scroll, 16px gutters below 600, centred above; RTL on every asymmetric element; mixed bidi (ynet/G7/2026/numbers) holds; longest body/author/headline don't overflow; אבי's 4-reply thread expands cleanly; sticky header + backdrop-blur intact.
- [x] 23. a11y pass. Found + fixed 6 issues: (1) no `<h1>` — wordmark `<span>` → `<h1>`; (2) feed not a list — `<div>` → `<ul role="list">` with `<li>` wrappers; (3) PostCards had no accessible name — added `aria-label="{author} ב-ynet"`; (4) SortToggle had no arrow-key nav — added RTL-aware handler (ArrowLeft/Down advance, ArrowRight/Up go back); (5) `--color-ink-subtle: #8e8e8e` failed AA on paper (3.01:1) → `#6b6b6b` (4.90:1); (6) white on `--color-ynet: #ee6004` failed AA (3.32:1) → darkened to `#be4d00` (4.94:1). Verified via inspect: lang/dir, all aria labels, computed colors.
- [x] 24. Distinctive visual identity: custom palette + typography + iconography to escape default Tailwind look.

### Phase 6 — Scraper (offline; not imported by app)
- [x] 25. `scripts/scrape.ts` baseline: Playwright headless Chromium, CLI arg parsing (`process.argv[2]`), navigate to article URL, write a stub `Feed` to `data/feed.json` so the end-to-end shape is wired.
- [x] 26. Expand all comments: loop clicking "הצג עוד" / "להמשך קריאה" / "תגובות נוספות" and reply-expanders (match by role+accessible name, not exact text) until none remain or a stable-state heuristic triggers. Polite delays between clicks.
- [x] 27. Intercept talkback JSON (primary) + DOM fallback: register `page.on('response', ...)` before navigation; capture JSON responses from Ynet talkback endpoints; fall back to DOM scraping if no JSON captured. Log which path was used.
- [x] 28. Build `ArticleRef` from page metadata: `og:title`, `og:image`, byline, canonical URL, slug from URL path as `id`.
- [x] 29. Map raw → `Post[]`, write `data/feed.json`: wrap each top-level comment as a `Post` quoting the article, include nested replies, validate output with the same shape check the app uses. End-to-end: `npm run scrape -- <url>` produces a feed the app renders without changes.

### Phase 7 — Docs
- [x] 30. README: how to run, how to scrape, how to swap the scoring function, project structure overview.

### Phase 8 — Post-MVP: humor scoring + append-mode scraper
- [x] 31. Append-mode scraper: load existing feed.json, merge new posts, dedup by comment.id (existing wins), preserve posts from other articles.
- [x] 32. Types update: add `humor?: number` and `humorReason?: string` to Comment. Update validators in src/data/feed.ts and scripts/scrape.ts.
- [x] 33. Gemini scoring: integrate `@google/generative-ai` SDK in scraper. Score new comments for humor (0–10) using Gemini 2.5 Flash before writing feed.json. API key from `GEMINI_API_KEY` env var; skip if missing. Only score comments without a `humor` field.
- [x] 34. Humor badge + opacity: color-scaled badge per PostCard (7–10 brand/coral, 3–6 neutral, 0–2 ink-subtle). humorReason on hover. Below-threshold (5) comments at 50% opacity with "נסתר" chip.
- [x] 35. Filter toggle + sort: "הכל" / "מצחיק בלבד" toggle (default = funny only). 4th sort mode "מצחיק" sorting by humor desc. Threshold (5) as named constant in src/scoring/.
- [x] 36. README update: GEMINI_API_KEY setup, humor scoring explanation, filter usage.

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
- 2026-06-22 — Task 14: `PostCard` — single Post prop composes all five sub-components into the card chrome. Verified via computed styles: `bg-surface #ffffff`, padding 20px, radius 14px (rounded-card), paper-lift box-shadow, inner row-gap 12px, outer feed gap 20px. App.tsx now renders the FULL 15-post feed (no preview wrapper, no slicing); scrollHeight ≈ 7574px at 380px mobile.
- 2026-06-22 — Task 15: `FeedList` — pure refactor pulling the loop out of App.tsx. No behavioral or visual delta; same 15-article DOM, same `flex flex-col gap-5` wrapper, same `post.comment.id` keys, same post order. Phase 3 acceptance ("feed renders Posts from data/feed.json") satisfied.
- 2026-06-22 — Task 16: `src/scoring/scoreComment.ts` — placeholder pure fn `(likes − dislikes) + 1.5 × replyCount` with a mild recency boost (capped at +5, half at 72h) gated on `ctx.now`. `ScoreContext` type defined. 22 tests passing (12 prior + 10 scoring): net-negative, replies weight, determinism, purity, mildness cap, future timestamps. NOT wired into UI yet — that's task 17.
- 2026-06-23 — Task 17: scores wired + default sort by score desc. App.tsx memoises a single `now` per load and produces a ranked Post[] (`comment.score = scoreComment(c, { now })`). FeedList stays a pure renderer. EngagementFooter score chip re-tuned to subtle (`bg-rule/40` + `text-ink-subtle`) with `Math.round`. Browser-verified at 680px: רחל (89) leads, אבי מ. (75) second; net-negatives דורון_ירושלים (−8) and אילן ש. (−19) at the bottom.
- 2026-06-24 — Task 18: `SortToggle` + `sortPosts` selector. Pill-style segmented control (מעניין / חדש / הכי נדון) with proper `role=radiogroup/radio + aria-checked` semantics, active tab in `bg-brand text-white`. Single selector `sortPosts(posts, mode)` handles all three keys; score-desc tie-break + stable native sort = deterministic order under toggling. 6 new tests cover all three modes, tie-break behaviour, non-mutation, and stability. 28 tests total.
- 2026-06-24 — Task 19: Loading skeleton. `PostCardSkeleton` reuses the same `flex flex-col gap-3 rounded-card bg-surface p-5 shadow-card` chrome as PostCard, with paper-palette pulse bars (bg-rule, paper-deep on the quoted-card slot). `FeedSkeleton` renders 4 placeholders with `role="status"`. `motion-safe:animate-pulse` honors `prefers-reduced-motion`. App.tsx now uses a `FeedState` discriminated union (loading | loaded | error); SortToggle renders always so there's no CLS between skeleton and feed.
- 2026-06-25 — Task 20: Empty + error states. `EmptyState` (Hebrew copy, card chrome, `role="status"`) for `loaded && posts.length === 0`. `ErrorState` (`role="alert"`, error message + "נסה שוב" brand button) wired to a `handleRetry` callback that resets to loading and re-runs fetchFeed. Required a small App.tsx restructure: the useEffect now only kicks off `fetchFeed()` (which sets state only asynchronously inside the promise callbacks), and the synchronous "loading" reset moved into `handleRetry` — that pattern satisfies eslint-plugin-react-hooks v7's `set-state-in-effect` rule. **Note**: planned to screenshot both forced states, but the Claude Preview browser tab got stuck on chrome-error after a port swap (savefeed-web held 5173), and Chrome blocks JS navigation away from chrome-error. Verification fell back to typecheck + lint + test + visual code review; both components are tiny + use card chrome correctly.
- 2026-06-25 — Task 21: Framer Motion polish. `MotionConfig reducedMotion="user"` at the React root → every motion component reads prefers-reduced-motion and drops to its end state automatically. `motion.article` in PostCard fades + slides up on mount (280ms easeOut, mount-stagger `min(i*0.04, 0.32)s` from FeedList). `motion.span` on the score chip scale-pops once when score first becomes defined. Sort toggle verified instant: clicking "חדש" reorders the feed (תומר → top) and all articles stay at `opacity:1, transform:none` — React preserves identity via key, no re-mount, no re-animation. Pinned framer-motion to `^11.18.2` (v12 requires React 19; we're on 18).
- 2026-06-26 — Task 22: Responsive + RTL audit at 360/390/768/1024/1440. Found three touch-target violations (sort pill 28px, reply toggle 20px, retry button ~32px) — all below the 44px mobile minimum. Applied `min-h-[44px] md:min-h-0` to each so mobile gets a proper hitbox and desktop shrinks back. Verified via inspect at both breakpoints. Also pinned Vite to dedicated port 5179 (`server.port: 5179, strictPort: true` in vite.config.ts + matching launch.json) so savefeed-web on 5173 can't steal the preview tab again. Everything else clean across all five widths.
- 2026-06-27 — Task 23: a11y pass. 6 findings, 6 fixes: h1 added (wordmark), feed → ul/role=list/li, PostCard aria-label, SortToggle arrow-key nav (RTL-correct: ArrowLeft/Down advance), `--color-ink-subtle` darkened #8e8e8e → #6b6b6b (3.01→4.90:1 on paper), `--color-ynet` darkened #ee6004 → #be4d00 (white-text 3.32→4.94:1). Avatars already aria-hidden, time elements already have datetime, icon controls already had Hebrew aria-labels from task 12 — verified. focus-visible:outline-brand was already on every interactive element (sort pills, reply toggle, retry button, quoted-card link).
- 2026-06-25 — Task 24: Visual identity refinement (6 surgical changes). (1) Wordmark `tracking-tight` → `tracking-tighter` (-0.025em → -0.05em): reads as a logo glyph. (2) Main padding `py-6` → `py-8` (24→32px): first/last card no longer kiss the header/viewport. (3) `--shadow-card` opacity 4% → 6/7%: white cards visibly float on warm paper. (4) QuotedArticleCard `rounded-card` (14px) → `rounded-xl` (12px): 2px smaller radius creates clear nesting hierarchy below PostCard. (5) CommentBody `leading-relaxed` (1.625) → `leading-[1.7]`: Hebrew glyphs sit tall; extra line-height improves readability. (6) SortToggle inactive hover: added `hover:bg-paper-deep` so pills feel interactive on hover, not just text. No new palette tokens, no decorations, no new dependencies.
- 2026-06-26 — Task 25: Scraper scaffold. Installed `playwright` + `tsx` + `@types/node` as devDependencies, installed Chromium. Created `scripts/scrape.ts` (CLI arg validation, Playwright headless launch, navigate + log page title, write stub feed.json). Added `tsconfig.scripts.json` (Node types, referenced from root tsconfig). Updated ESLint: `src/**` gets browser globals + React rules, `scripts/**` gets Node globals only. Added `"scrape": "tsx scripts/scrape.ts"` to package.json. Verified against real article URL — title loads correctly: "הסכם כניעה: טראמפ סופג ביקורת...".
- 2026-06-26 — Task 26: Expand all comments. Key discovery: Ynet's inline comment section is a preview (2 comments); clicking `span.commentsContainer` opens `section#ArticleCommentsPopup` where all comments load. The popup auto-expands reply threads. Three expansion functions: `openCommentsPopup` (waits for inline section JS to init, clicks container, waits for popup DOM), `expandShowMore` (clicks `div.showMoreCommentsButton` in a loop, waits for level1 count to grow, 50-click safety cap), `expandReplies` (clicks `button.commentCount` via JS evaluate to avoid viewport issues, re-clicks if toggle collapsed already-visible replies). Verified against sywkiqzmgx: 17 top-level + 7 replies = 24 total, matching "24 תגובות".
- 2026-06-26 — Task 27: Capture comment data via network interception + DOM fallback. Primary path: `setupInterception()` registers `page.on('response')` before navigation, captures all `/api/talkbacks/` JSON responses, deduplicates by comment `id`. Endpoint pattern: `.../talkbacks/list/v2/{slug}/{sort}/{offset}`. Async response parsing tracked via pending-promise array with `flush()` to guarantee all JSON is parsed before reading. Fallback: `captureFromDom()` scrapes the expanded popup using `data-comment-id`, `span.author`, `time.DateDisplay`, `span.likesCounter` selectors. API item has 14 fields (id, author, pubDate, text, level, likes, unlikes, talkback_like, talkback_parent_id, article_id, recommended, authorLocation, number, post_id) — no separate `title` field (all text in `text`). Verified: network path captures 24/24 comments, sample logged.
- 2026-06-27 — Tasks 28+29: ArticleRef extraction + mapping + feed.json output. Task 28: `extractArticleRef()` reads `og:title`, `og:image`, `og:url`, `article:published_time`, `vr:author` via `page.evaluate`; derives slug id from URL path. Task 29: Interception refactored from passive capture to active pagination — `setupInterception` now only discovers the API base URL, then `fetchAllComments()` loops offset 0..N until `hasMore === 0` (2 pages for sywkiqzmgx: offset 0 returns first discussion, offset 1 returns all 24). `mapApiToPosts` groups level-2 replies by `talkback_parent_id.talkbackId`, nests under parent, sets `replyCount = replies.length`. `mapDomToPosts` groups by DOM order (level-2 after their parent level-1). `validateFeedShape` mirrors the app's `checkFeed` chain (string/number checks, replyCount ↔ replies.length, source === 'ynet'). Reads written file back and validates. End-to-end: 17 posts written (17 top-level, 7 replies nested), `loadFeed()` validates, `npm run dev` renders the feed with real article image, author "ליאור בן ארי", all three sorts working.
- 2026-06-27 — Task 30: README.md. Quick start, scraping instructions (with `npx playwright install chromium` first-time step), scoring swap guide pointing to `src/scoring/scoreComment.ts`, project structure tree, stack table, npm scripts table. Under 80 lines. All 8 acceptance criteria checked off — project complete.
- 2026-06-27 — Task 31: Append-mode scraper. Added `loadExistingPosts()` and `getCommentId()` helpers. Modified `scrape()` to load existing feed.json, build a Set of existing comment IDs, filter out duplicates from newly scraped posts (existing wins on collision), merge, and write combined feed. Gracefully handles missing/empty/invalid existing feed.json. Console logs merge stats (existing + new + skipped duplicates → total).
- 2026-06-27 — Task 32: Added `humor?: number` (0–10) and `humorReason?: string` to Comment type. Updated both validators (src/data/feed.ts `checkComment` + scripts/scrape.ts `validateComment`) to accept but not require these fields, with range check on humor. Existing feed.json without humor fields still validates.
- 2026-06-27 — Task 33: Gemini humor scoring. Installed `@google/generative-ai` + `dotenv`. Scraper now loads `.env`, scores all unscored comments (top-level + replies) via Gemini 2.5 Flash with calibrated Israeli humor prompt, writes `humor` + `humorReason` into each Comment. Batches of 50, structured JSON output, single retry with 2s backoff on API failure, graceful skip if GEMINI_API_KEY missing. Updated model from sunset `gemini-2.5-flash-preview-05-20` to `gemini-2.5-flash`. Re-scrape skips scoring (existing wins via dedup). Verified: 24/24 comments scored, חחחחחח=9 (top), שמאלני מזוקק=1 (bottom).
- 2026-06-27 — Prompt calibration fix: added username importance section (funny/esoteric names elevate by 2–3 points), expanded MEDIUM to include political opinions with personality, tightened LOW to generic-only filler. Fixes under-scoring of character usernames.
- 2026-06-27 — Task 34: Humor badge + opacity in PostCard. EngagementFooter now shows 😂 humor badge with color scale (≥7 brand-soft/brand, 3–6 rule/ink-muted, 0–2 rule/ink-subtle). humorReason on hover via title attr. Below-threshold (humor < 5) cards animate to 50% opacity via Framer Motion, with "נסתר" chip next to the header. HUMOR_THRESHOLD = 5 as named constant in src/scoring/humorThreshold.ts.
- 2026-06-27 — Task 35: Filter toggle + "מצחיק" sort. SortToggle gains a 4th sort option "מצחיק" (humor desc, score tiebreak) and a separate "הכל" / "מצחיק בלבד" toggle button (default = funny only). App.tsx adds funnyOnly state (default true) and a filtered memo that drops below-threshold posts when active. Browser-verified: filter toggles 16↔17 posts, sort by מצחיק puts ברדוגית/שמאלני מזוקק (10) on top, אבי (humor=2) shows "נסתר" chip.
- 2026-06-27 — Prompt calibration v2: replaced "username matters A LOT" with USERNAME AWARENESS — username as context not automatic bonus, with explicit score ranges for each username+text combination.
- 2026-06-27 — Task 36: README rewrite. Covers: concept (quote-tweet for Ynet comments), architecture (scraper → Gemini scoring → React UI), quick start, scraping with append mode + GEMINI_API_KEY setup, humor scoring methodology with Hebrew examples and score table, UI features (4 sorts, filter toggle, humor badges, opacity treatment), tuning knobs (score formula, threshold, Gemini prompt), project structure, stack, scripts. 130 lines, English.
