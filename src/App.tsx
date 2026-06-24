import { useCallback, useEffect, useMemo, useState } from 'react'
import AppShell from './components/AppShell'
import EmptyState from './components/EmptyState'
import ErrorState from './components/ErrorState'
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

  // Pure: kicks off the load; setState only happens asynchronously inside
  // the promise callbacks, so it never fires synchronously inside the
  // effect body (react-hooks/set-state-in-effect).
  const fetchFeed = useCallback(() => {
    loadFeed()
      .then(f => setFeed({ status: 'loaded', posts: f.posts }))
      .catch((err: unknown) =>
        setFeed({
          status: 'error',
          error: err instanceof Error ? err : new Error(String(err)),
        }),
      )
  }, [])

  // Event handler — not inside an effect, so the synchronous setFeed is fine.
  // Resets to loading so the skeleton flashes during retry.
  const handleRetry = useCallback(() => {
    setFeed({ status: 'loading' })
    fetchFeed()
  }, [fetchFeed])

  useEffect(() => {
    fetchFeed()
  }, [fetchFeed])

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
        {feed.status === 'loaded' && feed.posts.length === 0 && <EmptyState />}
        {feed.status === 'loaded' && feed.posts.length > 0 && (
          <FeedList posts={sorted ?? []} />
        )}
        {feed.status === 'error' && (
          <ErrorState message={feed.error.message} onRetry={handleRetry} />
        )}
      </div>
    </AppShell>
  )
}

export default App
