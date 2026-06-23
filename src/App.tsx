import { useEffect, useMemo, useState } from 'react'
import AppShell from './components/AppShell'
import FeedList from './components/FeedList'
import { loadFeed } from './data/feed'
import { scoreComment } from './scoring/scoreComment'
import type { Post } from './types'

function App() {
  const [posts, setPosts] = useState<Post[] | null>(null)

  useEffect(() => {
    loadFeed().then(feed => setPosts(feed.posts))
  }, [])

  // One `now` per load → recency is consistent across the whole feed; nothing
  // reorders mid-paint. Memo so re-renders don't re-score.
  const ranked: Post[] | null = useMemo(() => {
    if (!posts) return null
    const now = new Date()
    return posts
      .map(p => ({
        ...p,
        comment: { ...p.comment, score: scoreComment(p.comment, { now }) },
      }))
      .sort((a, b) => (b.comment.score ?? 0) - (a.comment.score ?? 0))
  }, [posts])

  return (
    <AppShell>
      <FeedList posts={ranked ?? []} />
    </AppShell>
  )
}

export default App
