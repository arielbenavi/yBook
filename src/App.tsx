import { useEffect, useMemo, useState } from 'react'
import AppShell from './components/AppShell'
import FeedList from './components/FeedList'
import FeedSkeleton from './components/FeedSkeleton'
import SortToggle from './components/SortToggle'
import { loadFeed } from './data/feed'
import { scoreComment } from './scoring/scoreComment'
import { sortPosts, type SortMode } from './scoring/sortPosts'
import type { Post } from './types'

type FeedState =
  | { status: 'loading' }
  | { status: 'loaded'; posts: Post[] }
  | { status: 'error'; error: Error }

function App() {
  const [feed, setFeed] = useState<FeedState>({ status: 'loading' })
  const [sortMode, setSortMode] = useState<SortMode>('top')

  useEffect(() => {
    loadFeed()
      .then(f => setFeed({ status: 'loaded', posts: f.posts }))
      .catch((err: unknown) =>
        setFeed({
          status: 'error',
          error: err instanceof Error ? err : new Error(String(err)),
        }),
      )
  }, [])

  // One `now` per load → recency stays consistent across the whole feed.
  const ranked = useMemo(() => {
    if (feed.status !== 'loaded') return null
    const now = new Date()
    return feed.posts.map(p => ({
      ...p,
      comment: { ...p.comment, score: scoreComment(p.comment, { now }) },
    }))
  }, [feed])

  const sorted = useMemo(
    () => (ranked ? sortPosts(ranked, sortMode) : null),
    [ranked, sortMode],
  )

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <SortToggle mode={sortMode} onChange={setSortMode} />
        {feed.status === 'loading' && <FeedSkeleton />}
        {feed.status === 'loaded' && <FeedList posts={sorted ?? []} />}
        {/* feed.status === 'error' → task 20 */}
      </div>
    </AppShell>
  )
}

export default App
