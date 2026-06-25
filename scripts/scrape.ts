import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const url = process.argv[2]

if (!url) {
  console.error('Usage: npm run scrape -- <ynetArticleUrl>')
  process.exit(1)
}

if (!url.includes('ynet.co.il')) {
  console.error('Error: URL must be a ynet.co.il article')
  process.exit(1)
}

async function scrape(articleUrl: string): Promise<void> {
  console.log(`Navigating to: ${articleUrl}`)

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    await page.goto(articleUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    const title = await page.title()
    console.log(`Page loaded — title: ${title}`)

    const feed = {
      generatedAt: new Date().toISOString(),
      posts: [] as unknown[],
    }

    const outPath = resolve(__dirname, '..', 'data', 'feed.json')
    writeFileSync(outPath, JSON.stringify(feed, null, 2) + '\n')
    console.log(`Wrote stub feed to ${outPath}`)
  } finally {
    await browser.close()
  }
}

scrape(url).catch((err: unknown) => {
  console.error('Scrape failed:', err)
  process.exit(1)
})
