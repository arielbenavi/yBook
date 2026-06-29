import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(__dirname, '..')
const FEED_PATH = resolve(PROJECT_ROOT, 'data', 'feed.json')
const PUBLIC_PATH = resolve(PROJECT_ROOT, 'public', 'feed.json')

const TRAGEDY_KEYWORDS = [
  'מת', 'נהרג', 'נספה', 'טרגדיה', 'אבל', 'הלוויה', 'נפטר', 'מות',
  'אסון', 'פיגוע', 'רצח', 'קורבנות', 'חלל', 'שכול', 'אבדה',
]

const POLITICAL_KEYWORDS = [
  'ממשלה', 'כנסת', 'נתניהו', 'טראמפ', 'ביבי', 'שמאל', 'ימין',
  'מלחמה', 'הסכם', 'פוליטי', 'בחירות', 'קואליציה', 'אופוזיציה',
]

async function fetchTopArticleUrls(): Promise<string[]> {
  const resp = await fetch('https://www.ynet.co.il')
  if (!resp.ok) throw new Error(`Ynet homepage: ${resp.status}`)
  const html = await resp.text()

  const seen = new Set<string>()
  const urls: string[] = []
  const pattern = /href="(https:\/\/www\.ynet\.co\.il\/[^"]*\/article\/[a-zA-Z0-9]+)"/g
  let match
  while ((match = pattern.exec(html)) !== null) {
    const url = match[1]
    if (!seen.has(url)) {
      seen.add(url)
      urls.push(url)
      if (urls.length >= 10) break
    }
  }
  return urls
}

async function fetchOgMeta(url: string): Promise<{ title: string; description: string }> {
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 yBook-scraper' },
      signal: AbortSignal.timeout(10_000),
    })
    if (!resp.ok) return { title: '', description: '' }
    const html = await resp.text()
    const title = html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/)
      ?.[1] ?? ''
    const description = html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/)
      ?.[1] ?? ''
    return { title, description }
  } catch {
    return { title: '', description: '' }
  }
}

function isTragedy(title: string, description: string): string | null {
  const text = `${title} ${description}`
  for (const kw of TRAGEDY_KEYWORDS) {
    if (text.includes(kw)) return kw
  }
  return null
}

function isPolitical(title: string): boolean {
  return POLITICAL_KEYWORDS.some(kw => title.includes(kw))
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr]
  let s = seed
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0x7fffffff
    const j = s % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function dateSeed(): number {
  const d = new Date()
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

async function main() {
  console.log('Fetching top articles from Ynet homepage...')
  const candidateUrls = await fetchTopArticleUrls()

  if (candidateUrls.length === 0) {
    console.error('No article URLs found on homepage')
    process.exit(1)
  }

  console.log(`Found ${candidateUrls.length} candidate articles, filtering...`)

  const urls: Array<{ url: string; title: string; political: boolean }> = []
  for (const url of candidateUrls) {
    if (urls.length >= 5) break
    const meta = await fetchOgMeta(url)
    const tragedyKeyword = isTragedy(meta.title, meta.description)
    if (tragedyKeyword) {
      console.log(`  SKIP (tragedy: "${tragedyKeyword}"): ${meta.title || url}`)
      continue
    }
    const political = isPolitical(meta.title)
    urls.push({ url, title: meta.title, political })
    console.log(`  OK${political ? ' (political)' : ''}: ${meta.title || url}`)
  }

  if (urls.length === 0) {
    console.error('All articles filtered out')
    process.exit(1)
  }

  console.log(`\nScraping ${urls.length} articles...`)

  for (let i = 0; i < urls.length; i++) {
    const { url, political } = urls[i]
    const maxPosts = political ? 5 : 3
    console.log(`\n=== Article ${i + 1}/${urls.length} (cap: ${maxPosts}): ${url} ===`)
    try {
      execFileSync(
        'npx',
        ['tsx', resolve(PROJECT_ROOT, 'scripts/scrape.ts'), url, '--max-posts', String(maxPosts)],
        { cwd: PROJECT_ROOT, stdio: 'inherit', env: { ...process.env }, timeout: 120_000 },
      )
    } catch (err) {
      console.error(`Failed to scrape ${url}:`, err instanceof Error ? err.message : err)
    }

    if (i < urls.length - 1) {
      console.log('Waiting 10s before next article...')
      await new Promise(r => setTimeout(r, 10_000))
    }
  }

  // Shuffle the final feed so posts from different articles are interleaved
  try {
    const raw = JSON.parse(readFileSync(FEED_PATH, 'utf-8'))
    if (Array.isArray(raw.posts) && raw.posts.length > 1) {
      raw.posts = seededShuffle(raw.posts, dateSeed())
      const json = JSON.stringify(raw, null, 2) + '\n'
      writeFileSync(FEED_PATH, json)
      writeFileSync(PUBLIC_PATH, json)
      console.log(`\nShuffled ${raw.posts.length} posts (seed: ${dateSeed()})`)
    }
  } catch {
    console.warn('Could not shuffle feed.json — continuing')
  }

  console.log('\nDone.')
}

main().catch((err: unknown) => {
  console.error('scrape-top failed:', err)
  process.exit(1)
})
