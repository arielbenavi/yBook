import { chromium, type Page } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { GoogleGenerativeAI } from '@google/generative-ai'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(__dirname, '..')
const OUT_PATH = resolve(PROJECT_ROOT, 'data', 'feed.json')

config({ path: resolve(PROJECT_ROOT, '.env') })

// --- Selectors ---

const POPUP = 'section#ArticleCommentsPopup'
const LEVEL1 = `${POPUP} article.ArticleComment2026.level1`
const LEVEL2 = `${POPUP} article.ArticleComment2026.level2`
const SHOW_MORE = `${POPUP} div.showMoreCommentsButton`
const REPLY_BTN = `${POPUP} button.commentCount`
const ALL_COMMENTS = `${POPUP} article.ArticleComment2026`

// --- Raw types ---

type RawApiItem = {
  id: number
  author: string
  pubDate: string
  text: string
  level: number
  likes: number
  unlikes: number
  talkback_parent_id: Record<string, unknown> | null
  article_id: string
  [key: string]: unknown
}

type RawDomItem = {
  id: string
  author: string
  date: string
  text: string
  level: number
  likes: number
  dislikes: number
}

// --- CLI ---

const url = process.argv[2]

if (!url) {
  console.error('Usage: npm run scrape -- <ynetArticleUrl>')
  process.exit(1)
}

if (!url.includes('ynet.co.il')) {
  console.error('Error: URL must be a ynet.co.il article')
  process.exit(1)
}

// --- Network interception: discover talkback API base URL ---

function setupInterception(page: Page) {
  let baseUrl: string | undefined
  const pending: Promise<void>[] = []

  page.on('response', (resp) => {
    if (!resp.url().includes('/api/talkbacks/')) return
    if (baseUrl) return
    const p = (async () => {
      try {
        const json: Record<string, unknown> = await resp.json()
        const rss = json.rss as Record<string, unknown> | undefined
        const channel = rss?.channel as Record<string, unknown> | undefined
        if (!Array.isArray(channel?.item)) return
        baseUrl = resp.url().replace(/\/\d+$/, '')
      } catch { /* non-JSON response */ }
    })()
    pending.push(p)
  })

  return {
    flush: () => Promise.all(pending),
    baseUrl: () => baseUrl,
  }
}

// --- Active pagination: fetch all pages until hasMore === 0 ---

async function fetchAllComments(page: Page, baseUrl: string): Promise<RawApiItem[]> {
  const byId = new Map<number, RawApiItem>()
  let offset = 0

  while (offset < 100) {
    const resp: Record<string, unknown> = await page.evaluate(
      async (u: string) => { const r = await fetch(u); return r.json() },
      `${baseUrl}/${offset}`,
    )
    const rss = resp.rss as Record<string, unknown> | undefined
    const channel = rss?.channel as Record<string, unknown> | undefined
    const items = channel?.item
    if (!Array.isArray(items) || items.length === 0) break

    for (const raw of items) {
      const item = raw as RawApiItem
      if (typeof item.id === 'number') byId.set(item.id, item)
    }

    if (!channel?.hasMore) break
    offset++
  }

  console.log(`Fetched ${offset + 1} API page(s), ${byId.size} unique comments`)
  return [...byId.values()]
}

// --- DOM fallback capture ---

async function captureFromDom(page: Page): Promise<RawDomItem[]> {
  return page.evaluate((sel: string) => {
    const articles = document.querySelectorAll(sel)
    return Array.from(articles).map((el) => {
      const id = (el as HTMLElement).dataset.commentId ?? ''
      const author = el.querySelector('span.CommentDetails span.author')?.textContent?.trim() ?? ''
      const date = el.querySelector('span.CommentDetails time.DateDisplay')?.textContent?.trim() ?? ''
      const wrapper = el.querySelector('div.commentDetailsWrapper')
      const textDiv = wrapper ? (wrapper.children[1] as HTMLElement | undefined) : null
      const text = textDiv?.textContent?.trim() ?? ''
      const level = el.classList.contains('level1') ? 1 : 2
      const likesText = el.querySelector('span.likesCounter.redCounter')?.textContent?.trim() ?? '0'
      const dislikesText = el.querySelector('span.likesCounter.unlikesCounter')?.textContent?.trim() ?? '0'
      return {
        id,
        author,
        date,
        text,
        level,
        likes: parseInt(likesText, 10) || 0,
        dislikes: parseInt(dislikesText, 10) || 0,
      }
    })
  }, ALL_COMMENTS)
}

// --- ArticleRef extraction from page meta tags ---

async function extractArticleRef(page: Page, articleUrl: string) {
  const slugMatch = articleUrl.match(/\/article\/([a-zA-Z0-9]+)/)
  const id = slugMatch?.[1] ?? ''

  const meta = await page.evaluate(() => ({
    ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '',
    ogUrl: document.querySelector('meta[property="og:url"]')?.getAttribute('content') ?? '',
    ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? '',
    publishedTime: document.querySelector('meta[property="article:published_time"]')?.getAttribute('content') ?? '',
    vrAuthor: document.querySelector('meta[property="vr:author"]')?.getAttribute('content') ?? '',
  }))

  return {
    id,
    url: meta.ogUrl || articleUrl,
    title: meta.ogTitle || 'Untitled',
    source: 'ynet' as const,
    author: meta.vrAuthor || 'ynet',
    publishedAt: meta.publishedTime || new Date().toISOString(),
    imageUrl: meta.ogImage || undefined,
  }
}

// --- Mapping: API items → Post[] ---

function mapApiToPosts(
  items: RawApiItem[],
  quoted: ReturnType<typeof extractArticleRef> extends Promise<infer T> ? T : never,
) {
  const topLevel = items.filter(i => i.level === 1)
  const level2 = items.filter(i => i.level === 2)

  const replyMap = new Map<number, RawApiItem[]>()
  for (const reply of level2) {
    const parentId = (reply.talkback_parent_id as Record<string, unknown> | null)
      ?.talkbackId as number | undefined
    if (!parentId) continue
    const arr = replyMap.get(parentId) ?? []
    arr.push(reply)
    replyMap.set(parentId, arr)
  }

  return topLevel.map(item => {
    const childReplies = replyMap.get(item.id) ?? []
    const mappedReplies = childReplies.map(r => ({
      id: String(r.id),
      author: r.author || 'אנונימי',
      timestamp: r.pubDate,
      body: r.text,
      likes: r.likes,
      dislikes: r.unlikes,
      replyCount: 0,
    }))

    return {
      comment: {
        id: String(item.id),
        author: item.author || 'אנונימי',
        timestamp: item.pubDate,
        body: item.text,
        likes: item.likes,
        dislikes: item.unlikes,
        replyCount: mappedReplies.length,
        ...(mappedReplies.length > 0 ? { replies: mappedReplies } : {}),
      },
      quoted,
    }
  })
}

// --- Mapping: DOM items → Post[] (fallback) ---

function parseDomDate(dateStr: string): string {
  const m = dateStr.match(/(\d{2}):(\d{2})\s*\|\s*(\d{2})\.(\d{2})\.(\d{2})/)
  if (!m) return new Date().toISOString()
  const [, hh, mm, dd, mo, yy] = m
  return `20${yy}-${mo}-${dd}T${hh}:${mm}:00.000Z`
}

function mapDomToPosts(
  items: RawDomItem[],
  quoted: ReturnType<typeof extractArticleRef> extends Promise<infer T> ? T : never,
) {
  const posts: ReturnType<typeof mapApiToPosts> = []
  let current: { comment: Record<string, unknown>; replies: Record<string, unknown>[] } | null = null

  function finalize() {
    if (!current) return
    current.comment.replyCount = current.replies.length
    if (current.replies.length > 0) current.comment.replies = current.replies
    posts.push({ comment: current.comment as (typeof posts)[number]['comment'], quoted })
  }

  for (const item of items) {
    const mapped = {
      id: item.id || `dom-${posts.length}`,
      author: item.author || 'אנונימי',
      timestamp: parseDomDate(item.date),
      body: item.text,
      likes: item.likes,
      dislikes: item.dislikes,
    }

    if (item.level === 1) {
      finalize()
      current = { comment: { ...mapped, replyCount: 0 }, replies: [] }
    } else if (current) {
      current.replies.push({ ...mapped, replyCount: 0 })
    }
  }
  finalize()
  return posts
}

// --- Feed validation (mirrors src/data/feed.ts checkFeed) ---

function validateFeedShape(data: unknown): void {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error('feed: expected object')
  }
  const feed = data as Record<string, unknown>
  if (typeof feed.generatedAt !== 'string') {
    throw new Error(`feed.generatedAt: expected string, got ${typeof feed.generatedAt}`)
  }
  if (!Array.isArray(feed.posts)) {
    throw new Error(`feed.posts: expected array, got ${typeof feed.posts}`)
  }
  for (let i = 0; i < (feed.posts as unknown[]).length; i++) {
    const raw = (feed.posts as unknown[])[i]
    const p = `posts[${i}]`
    if (typeof raw !== 'object' || raw === null) throw new Error(`${p}: expected object`)
    const post = raw as Record<string, unknown>
    validateComment(post.comment, `${p}.comment`)
    validateArticleRef(post.quoted, `${p}.quoted`)
  }
}

function validateComment(v: unknown, path: string): void {
  if (typeof v !== 'object' || v === null) throw new Error(`${path}: expected object`)
  const c = v as Record<string, unknown>
  for (const key of ['id', 'author', 'timestamp', 'body']) {
    if (typeof c[key] !== 'string') {
      throw new Error(`${path}.${key}: expected string, got ${typeof c[key]}`)
    }
  }
  for (const key of ['likes', 'dislikes', 'replyCount']) {
    if (typeof c[key] !== 'number' || Number.isNaN(c[key] as number)) {
      throw new Error(`${path}.${key}: expected number, got ${typeof c[key]}`)
    }
  }
  if (c.title !== undefined && typeof c.title !== 'string') {
    throw new Error(`${path}.title: expected string|undefined`)
  }
  if (c.humor !== undefined) {
    if (typeof c.humor !== 'number' || Number.isNaN(c.humor as number)) {
      throw new Error(`${path}.humor: expected number|undefined`)
    }
    if ((c.humor as number) < 0 || (c.humor as number) > 10) {
      throw new Error(`${path}.humor: expected 0–10, got ${c.humor}`)
    }
  }
  if (c.humorReason !== undefined && typeof c.humorReason !== 'string') {
    throw new Error(`${path}.humorReason: expected string|undefined`)
  }
  if (c.replies !== undefined) {
    if (!Array.isArray(c.replies)) throw new Error(`${path}.replies: expected array`)
    if ((c.replies as unknown[]).length !== c.replyCount) {
      throw new Error(
        `${path}: replyCount (${c.replyCount}) ≠ replies.length (${(c.replies as unknown[]).length})`,
      )
    }
    for (let i = 0; i < (c.replies as unknown[]).length; i++) {
      validateComment((c.replies as unknown[])[i], `${path}.replies[${i}]`)
    }
  }
}

function validateArticleRef(v: unknown, path: string): void {
  if (typeof v !== 'object' || v === null) throw new Error(`${path}: expected object`)
  const a = v as Record<string, unknown>
  for (const key of ['id', 'url', 'title', 'author', 'publishedAt']) {
    if (typeof a[key] !== 'string') {
      throw new Error(`${path}.${key}: expected string, got ${typeof a[key]}`)
    }
  }
  if (a.source !== 'ynet') {
    throw new Error(`${path}.source: expected 'ynet', got ${JSON.stringify(a.source)}`)
  }
}

// --- Append-mode: load existing feed and merge ---

function loadExistingPosts(): unknown[] {
  try {
    const data = JSON.parse(readFileSync(OUT_PATH, 'utf-8'))
    if (Array.isArray(data?.posts)) return data.posts as unknown[]
  } catch { /* missing or invalid file */ }
  return []
}

function getCommentId(post: unknown): string | undefined {
  if (typeof post !== 'object' || post === null) return undefined
  const c = (post as Record<string, unknown>).comment
  if (typeof c !== 'object' || c === null) return undefined
  const id = (c as Record<string, unknown>).id
  return typeof id === 'string' ? id : undefined
}

// --- Gemini humor scoring ---

type MappedComment = { id: string; author: string; body: string; humor?: number; humorReason?: string; replies?: MappedComment[] }

function collectUnscoredComments(posts: { comment: MappedComment }[]): MappedComment[] {
  const out: MappedComment[] = []
  for (const p of posts) {
    if (p.comment.humor === undefined) out.push(p.comment)
    if (p.comment.replies) {
      for (const r of p.comment.replies) {
        if (r.humor === undefined) out.push(r)
      }
    }
  }
  return out
}

function buildScoringPrompt(headline: string, comments: MappedComment[]): string {
  const items = comments.map(c => ({ id: c.id, author: c.author, text: c.body }))
  return `You are scoring Israeli Ynet talkback comments for how funny, entertaining, or
interesting they are. You understand Israeli internet culture deeply.

Score each comment 0–10.

HIGH scores (7–10) — comments with a VOICE:
- Punchy blunt dismissals that are funny BECAUSE of their brevity and attitude
  ("שטויות", "המלך עירום (טיפש גמור)")
- Username + comment combo where the name IS part of the joke
  (חחחחחחחח posting insults, תחי מדינת ישראל complaining sarcastically)
- Sardonic Israeli social commentary, dark humor, accidental poetry
- "Aunt/uncle internet energy" — unselfconscious, חחחח-punctuated, rambling
- Political humor that's blunt, not earnest
- Comments where you can HEAR the specific person behind it

IMPORTANT — username matters A LOT:
- A funny, esoteric, or self-aware username (שמאלני מזוקק, רפובליקנים יוק, ברדוגית)
  elevates the ENTIRE comment by 2–3 points. The username IS a voice.
- Even a political rant becomes entertaining when delivered by a character with a
  memorable name — it's performance, not a manifesto.
- A bland username (אנונימי, ישראלי) contributes nothing but doesn't penalize.

MEDIUM scores (3–6) — borderline, some personality:
- Genuine personal reviews with real detail (not great humor but a real person talking)
- Mild observations that aren't generic but aren't sharp either
- Political opinions WITH personality — a punchy landing, conspiracy-uncle energy,
  or dramatic flair ("מיליארדים מתחת לשולחן...")

LOW scores (0–2) — truly personality-free filler ONLY:
- Bot-like: "מומלץ!", "👍👍👍", "נכון מאוד", "מסכים"
- GENERIC political takes with NO voice — interchangeable text any anonymous person could
  have written, with a bland username, no punch, no personality
- Zero voice — could be written by literally anyone about literally anything

Score the following comments on this article. Respond ONLY with a JSON array.

Article: ${headline}

Comments:
${JSON.stringify(items)}

Response format: [{"id": "...", "score": N, "reason": "one sentence Hebrew"}]`
}

async function scoreWithGemini(
  headline: string,
  comments: MappedComment[],
): Promise<Map<string, { score: number; reason: string }>> {
  const results = new Map<string, { score: number; reason: string }>()

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.warn('\n⚠ GEMINI_API_KEY not set — skipping humor scoring')
    return results
  }

  if (comments.length === 0) {
    console.log('\nNo unscored comments — skipping Gemini call')
    return results
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  })

  const BATCH_SIZE = 50
  for (let i = 0; i < comments.length; i += BATCH_SIZE) {
    const batch = comments.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(comments.length / BATCH_SIZE)
    if (totalBatches > 1) {
      console.log(`  Scoring batch ${batchNum}/${totalBatches} (${batch.length} comments)...`)
    }

    const prompt = buildScoringPrompt(headline, batch)
    let retries = 0

    while (retries < 2) {
      try {
        const result = await model.generateContent(prompt)
        const text = result.response.text()
        const parsed: unknown = JSON.parse(text)

        if (!Array.isArray(parsed)) {
          console.warn('  Gemini returned non-array — skipping batch')
          break
        }

        for (const item of parsed) {
          if (typeof item !== 'object' || item === null) continue
          const r = item as Record<string, unknown>
          if (typeof r.id !== 'string' || typeof r.score !== 'number') continue
          const score = Math.max(0, Math.min(10, Math.round(r.score as number)))
          const reason = typeof r.reason === 'string' ? r.reason : ''
          results.set(r.id, { score, reason })
        }
        break
      } catch (err: unknown) {
        retries++
        if (retries < 2) {
          console.warn(`  Gemini API error (retrying in 2s):`, err instanceof Error ? err.message : err)
          await new Promise(r => setTimeout(r, 2000))
        } else {
          console.warn('  Gemini API failed after retry — skipping batch:', err instanceof Error ? err.message : err)
        }
      }
    }
  }

  return results
}

function applyScores(
  posts: { comment: MappedComment }[],
  scores: Map<string, { score: number; reason: string }>,
): void {
  for (const p of posts) {
    const s = scores.get(p.comment.id)
    if (s) {
      p.comment.humor = s.score
      p.comment.humorReason = s.reason
    }
    if (p.comment.replies) {
      for (const r of p.comment.replies) {
        const rs = scores.get(r.id)
        if (rs) {
          r.humor = rs.score
          r.humorReason = rs.reason
        }
      }
    }
  }
}

function logScoreSummary(scores: Map<string, { score: number; reason: string }>, posts: { comment: MappedComment }[]): void {
  if (scores.size === 0) return

  const nameMap = new Map<string, string>()
  for (const p of posts) {
    nameMap.set(p.comment.id, p.comment.author)
    if (p.comment.replies) {
      for (const r of p.comment.replies) nameMap.set(r.id, r.author)
    }
  }

  const sorted = [...scores.entries()]
    .map(([id, s]) => ({ author: nameMap.get(id) ?? id, ...s }))
    .sort((a, b) => b.score - a.score)

  console.log(`\nScored ${sorted.length} comments.`)
  console.log(`  Top 3: ${sorted.slice(0, 3).map(s => `${s.author}: ${s.score}`).join(', ')}`)
  console.log(`  Bottom 3: ${sorted.slice(-3).map(s => `${s.author}: ${s.score}`).join(', ')}`)
  console.log(`  Full list:`)
  for (const s of sorted) {
    console.log(`    ${s.author}: ${s.score} — ${s.reason}`)
  }
}

// --- Comment expansion (unchanged from task 26) ---

async function openCommentsPopup(page: Page): Promise<void> {
  const INLINE_L1 = 'section#SiteArticleComments article.ArticleComment2026.level1'
  await page.waitForSelector(INLINE_L1, { timeout: 15_000 })

  const trigger = page.locator('span.commentsContainer').first()
  await trigger.click({ force: true })

  await page.waitForFunction(
    (sel: string) => document.querySelectorAll(sel).length > 0,
    LEVEL1,
    { timeout: 10_000 },
  )
}

async function expandShowMore(page: Page): Promise<number> {
  let clicks = 0
  const MAX = 50

  while (clicks < MAX) {
    const btn = page.locator(SHOW_MORE).first()
    if (!(await btn.isVisible().catch(() => false))) break

    const before = await page.locator(LEVEL1).count()
    await btn.click({ force: true })
    clicks++

    try {
      await page.waitForFunction(
        (args: { sel: string; n: number }) =>
          document.querySelectorAll(args.sel).length > args.n,
        { sel: LEVEL1, n: before },
        { timeout: 8_000 },
      )
    } catch {
      break
    }

    await page.waitForTimeout(300)
  }

  return clicks
}

async function expandReplies(page: Page): Promise<number> {
  const buttons = page.locator(REPLY_BTN)
  const count = await buttons.count()
  let expanded = 0

  for (let i = 0; i < count; i++) {
    const l2Before = await page.locator(LEVEL2).count()

    try {
      await buttons.nth(i).evaluate(el => (el as HTMLElement).click())
    } catch {
      continue
    }

    await page.waitForTimeout(500)
    const l2After = await page.locator(LEVEL2).count()

    if (l2After < l2Before) {
      try {
        await buttons.nth(i).evaluate(el => (el as HTMLElement).click())
      } catch { /* ignore */ }
      await page.waitForTimeout(500)
    }

    if (l2After > l2Before) expanded++
  }

  return expanded
}

// --- Main ---

async function scrape(articleUrl: string): Promise<void> {
  console.log(`Navigating to: ${articleUrl}`)

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const net = setupInterception(page)

  try {
    await page.goto(articleUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    console.log(`Page loaded — title: ${await page.title()}`)

    await openCommentsPopup(page)
    const initialCount = await page.locator(LEVEL1).count()
    console.log(`Comments popup opened (${initialCount} top-level visible)`)

    const showMoreClicks = await expandShowMore(page)
    console.log(`"הצג עוד" clicked ${showMoreClicks} times`)

    const repliesExpanded = await expandReplies(page)
    console.log(`Reply threads expanded: ${repliesExpanded}`)

    const domTopLevel = await page.locator(LEVEL1).count()
    const domReplies = await page.locator(LEVEL2).count()
    console.log(`DOM count: ${domTopLevel} top-level + ${domReplies} replies = ${domTopLevel + domReplies}`)

    // Task 28: extract article metadata
    const articleRef = await extractArticleRef(page, articleUrl)
    console.log(`\nArticleRef: "${articleRef.title}" by ${articleRef.author}`)

    // Task 29: capture comments and map to Post[]
    await net.flush()
    const baseUrl = net.baseUrl()
    let posts: ReturnType<typeof mapApiToPosts>
    let strategy: string

    if (baseUrl) {
      strategy = 'network'
      const apiItems = await fetchAllComments(page, baseUrl)
      posts = mapApiToPosts(apiItems, articleRef)
      console.log(`\nStrategy: network (active pagination)`)
      console.log(`Endpoint: ${baseUrl}/{offset}`)
    } else {
      strategy = 'dom'
      console.log('\nNetwork interception found no talkback endpoint — falling back to DOM')
      const domItems = await captureFromDom(page)
      posts = mapDomToPosts(domItems, articleRef)
      console.log(`Strategy: DOM fallback`)
    }

    console.log(`Posts: ${posts.length} (top-level comments → posts)`)

    // Append mode: merge with existing feed, dedup by comment.id (existing wins)
    const existingPosts = loadExistingPosts()
    const existingIds = new Set(
      existingPosts.map(getCommentId).filter((id): id is string => id !== undefined),
    )
    const newPosts = posts.filter(p => !existingIds.has(p.comment.id))

    // Gemini humor scoring: score new comments before merging
    const unscored = collectUnscoredComments(newPosts)
    if (unscored.length > 0) {
      console.log(`\nScoring ${unscored.length} unscored comments with Gemini...`)
      const scores = await scoreWithGemini(articleRef.title, unscored)
      applyScores(newPosts, scores)
      logScoreSummary(scores, newPosts)
    }

    const mergedPosts = [...existingPosts, ...newPosts]

    console.log(
      `Merge: ${existingPosts.length} existing + ${newPosts.length} new` +
      ` (${posts.length - newPosts.length} duplicates skipped) → ${mergedPosts.length} total`,
    )

    const feed = {
      generatedAt: new Date().toISOString(),
      posts: mergedPosts,
    }

    writeFileSync(OUT_PATH, JSON.stringify(feed, null, 2) + '\n')
    console.log(`Wrote ${OUT_PATH}`)

    // Validate: read back the file and run the same shape checks as loadFeed
    const written = JSON.parse(readFileSync(OUT_PATH, 'utf-8'))
    validateFeedShape(written)
    console.log(`Feed validated OK (${strategy}, ${mergedPosts.length} posts)`)
  } finally {
    await browser.close()
  }
}

scrape(url).catch((err: unknown) => {
  console.error('Scrape failed:', err)
  process.exit(1)
})
