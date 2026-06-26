import { chromium, type Page } from 'playwright'
import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const POPUP = 'section#ArticleCommentsPopup'
const LEVEL1 = `${POPUP} article.ArticleComment2026.level1`
const LEVEL2 = `${POPUP} article.ArticleComment2026.level2`
const SHOW_MORE = `${POPUP} div.showMoreCommentsButton`
const REPLY_BTN = `${POPUP} button.commentCount`
const ALL_COMMENTS = `${POPUP} article.ArticleComment2026`

type RawApiItem = {
  id: number
  author: string
  pubDate: string
  text: string
  level: number
  likes: number
  unlikes: number
  talkback_like: number
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

type CaptureResult =
  | { strategy: 'network'; items: RawApiItem[]; endpointPattern: string }
  | { strategy: 'dom'; items: RawDomItem[] }

const url = process.argv[2]

if (!url) {
  console.error('Usage: npm run scrape -- <ynetArticleUrl>')
  process.exit(1)
}

if (!url.includes('ynet.co.il')) {
  console.error('Error: URL must be a ynet.co.il article')
  process.exit(1)
}

function setupInterception(page: Page) {
  const byId = new Map<number, RawApiItem>()
  let pattern: string | undefined
  const pending: Promise<void>[] = []

  page.on('response', (resp) => {
    if (!resp.url().includes('/api/talkbacks/')) return
    const p = (async () => {
      try {
        const json: Record<string, unknown> = await resp.json()
        const rss = json.rss as Record<string, unknown> | undefined
        const channel = rss?.channel as Record<string, unknown> | undefined
        const items = channel?.item
        if (!Array.isArray(items)) return
        if (!pattern) {
          pattern = resp.url().replace(/\/[^/]+\/[^/]+\/\d+$/, '/{slug}/{sort}/{offset}')
        }
        for (const raw of items) {
          const item = raw as RawApiItem
          if (typeof item.id === 'number') byId.set(item.id, item)
        }
      } catch { /* non-JSON or parse error */ }
    })()
    pending.push(p)
  })

  return {
    flush: () => Promise.all(pending),
    items: () => [...byId.values()],
    endpoint: () => pattern,
  }
}

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

    const topLevel = await page.locator(LEVEL1).count()
    const replies = await page.locator(LEVEL2).count()
    console.log(`Top-level comments: ${topLevel}`)
    console.log(`Replies: ${replies}`)
    console.log(`Total visible comments: ${topLevel + replies}`)

    await net.flush()
    let result: CaptureResult
    const netItems = net.items()

    if (netItems.length > 0) {
      result = {
        strategy: 'network',
        items: netItems,
        endpointPattern: net.endpoint()!,
      }
    } else {
      console.log('\nNetwork interception captured nothing — falling back to DOM parsing')
      result = { strategy: 'dom', items: await captureFromDom(page) }
    }

    console.log('\n--- Capture results ---')
    console.log(`Strategy: ${result.strategy}`)
    if (result.strategy === 'network') {
      console.log(`Endpoint pattern: ${result.endpointPattern}`)
    }
    console.log(`Captured: ${result.items.length} comments`)
    console.log(`Expected (DOM count): ${topLevel + replies}`)

    if (result.items.length > 0) {
      console.log('\nSample raw comment:')
      console.log(JSON.stringify(result.items[0], null, 2))
    }

    const feed = {
      generatedAt: new Date().toISOString(),
      posts: [] as unknown[],
    }

    const outPath = resolve(__dirname, '..', 'data', 'feed.json')
    writeFileSync(outPath, JSON.stringify(feed, null, 2) + '\n')
    console.log(`\nWrote stub feed to ${outPath}`)
  } finally {
    await browser.close()
  }
}

scrape(url).catch((err: unknown) => {
  console.error('Scrape failed:', err)
  process.exit(1)
})
