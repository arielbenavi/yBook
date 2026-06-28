import { execFileSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(__dirname, '..')

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
      if (urls.length >= 5) break
    }
  }
  return urls
}

async function main() {
  console.log('Fetching top articles from Ynet homepage...')
  const urls = await fetchTopArticleUrls()

  if (urls.length === 0) {
    console.error('No article URLs found on homepage')
    process.exit(1)
  }

  console.log(`Found ${urls.length} articles:`)
  urls.forEach((u, i) => console.log(`  ${i + 1}. ${u}`))

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    console.log(`\n=== Scraping article ${i + 1}/${urls.length}: ${url} ===`)
    try {
      execFileSync('npx', ['tsx', resolve(PROJECT_ROOT, 'scripts/scrape.ts'), url], {
        cwd: PROJECT_ROOT,
        stdio: 'inherit',
        env: { ...process.env },
        timeout: 120_000,
      })
    } catch (err) {
      console.error(`Failed to scrape ${url}:`, err instanceof Error ? err.message : err)
    }

    if (i < urls.length - 1) {
      console.log('Waiting 10s before next article...')
      await new Promise(r => setTimeout(r, 10_000))
    }
  }

  console.log('\nDone.')
}

main().catch((err: unknown) => {
  console.error('scrape-top failed:', err)
  process.exit(1)
})
