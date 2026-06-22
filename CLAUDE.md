# CLAUDE.md — yBook

yBook is a Twitter-style feed that surfaces the most interesting reader comments on
Ynet articles. Each feed item is a **comment rendered as a post**, with the article
**embedded beneath it as a quoted card** (the Twitter quote-tweet shape).

## Commands (run these — do not guess)
- Dev:        `npm run dev`
- Test:       `npm run test`        (vitest)
- Typecheck:  `npm run typecheck`   (tsc --noEmit)
- Lint:       `npm run lint`        (eslint)
- Scrape:     `npm run scrape -- <ynetArticleUrl>`   (writes data/feed.json)

## Stack (use exactly this — do not deliberate)
Vite + React + TypeScript (strict) + Tailwind + Framer Motion.
Playwright (devDependency) for the scraper. No backend.

## How to work — IMPORTANT
- **Read PROJECT.md at the start of every session.** It holds the spec, the task plan,
  the acceptance criteria, and the progress log.
- Do **ONE task** from the Implementation plan per iteration. Implement it **fully** —
  no stubs, no TODOs, no "left as an exercise".
- After each task, run `typecheck` + `lint` + `test`. Fix **all** failures before moving on.
- Then update PROJECT.md (check the task off, add a one-line progress entry) and commit with
  a clear message.
- **Verify the commit is self-contained BEFORE pushing.** After `git commit`:
  1. `git status --porcelain` must be empty — anything untracked or unstaged means
     something the commit needs got left behind. This is exactly how 330ddf7 shipped
     broken: App.tsx imported `src/components/CommentBody.tsx` but the file was never staged.
  2. Build from the committed tree, not the dirty working dir:
     `git stash -u && npm run build && git stash pop` (or a fresh clone / worktree).
     The build must pass.
  Only push if both checks are clean.
- Then **stop**. Fresh context for the next task.
- YOU MUST NOT declare a phase or the project "done" until typecheck, lint, and tests all pass.
- Use the **simplest approach that works**. Do not add abstractions, premature refactors,
  or extra dependencies unless a task asks for them.

## Conventions — negative rules count as much as positive ones
- **RTL-first.** Every component must render correctly right-to-left (content is Hebrew).
  `dir="rtl"`, `lang="he"` on the document.
- Small, single-responsibility components. All shared types live in `src/types.ts`.
- Data access goes through **one** module so a JSON → live-source swap is a one-file change.
- The scraper lives in `scripts/` and is **NEVER** imported by the app.
- Tailwind only — no CSS-in-JS. No class components.
- Never commit secrets. Never commit scraped data beyond `data/feed.json`.
- The scraper hits Ynet politely: one article per invocation, sane timeouts, no parallel hammering.
  Comment data is display-only.

## Definition of done (project-level)
`npm i && npm run dev` runs clean (no console errors); the feed renders Posts from
`data/feed.json`; all three sorts work; replies expand; RTL is correct on mobile and desktop;
`npm run scrape -- <url>` produces a valid `data/feed.json` the app renders.
