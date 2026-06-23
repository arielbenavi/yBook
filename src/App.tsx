import { useEffect, useMemo, useState } from 'react'
import AppShell from './components/AppShell'
import FeedList from './components/FeedList'
import SortToggle from './components/SortToggle'
import { loadFeed } from './data/feed'
import { scoreComment } from './scoring/scoreComment'
import { sortPosts, type SortMode } from './scoring/sortPosts'
import type { Post } from './types'

function App() {
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('top')

  useEffect(() => {
    loadFeed().then(feed => setPosts(feed.posts))
  }, [])

  // One `now` per load → recency stays consistent across the whole feed.
  const ranked: Post[] | null = useMemo(() => {
    if (!posts) return null
    const now = new Date()
    return posts.map(p => ({
      ...p,
      comment: { ...p.comment, score: scoreComment(p.comment, { now }) },
    }))
  }, [posts])

  // Sort is memo'd so toggling re-sorts but renders are otherwise cheap.
  const sorted = useMemo(
    () => (ranked ? sortPosts(ranked, sortMode) : null),
    [ranked, sortMode],
  )

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <SortToggle mode={sortMode} onChange={setSortMode} />
        <FeedList posts={sorted ?? []} />
      </div>
    </AppShell>
  )
}

export default App
