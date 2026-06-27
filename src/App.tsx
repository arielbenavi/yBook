import { useCallback, useEffect, useMemo, useState } from 'react'
import AppShell from './components/AppShell'
import EmptyState from './components/EmptyState'
import ErrorState from './components/ErrorState'
import FeedList from './components/FeedList'
import FeedSkeleton from './components/FeedSkeleton'
import InstallPrompt from './components/InstallPrompt'
import SortToggle from './components/SortToggle'
import { loadFeed } from './data/feed'
import { HUMOR_THRESHOLD } from './scoring/humorThreshold'
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
  const [funnyOnly, setFunnyOnly] = useState(true)

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

  const handleRetry = useCallback(() => {
    setFeed({ status: 'loading' })
    fetchFeed()
  }, [fetchFeed])

  useEffect(() => {
    fetchFeed()
  }, [fetchFeed])

  const ranked = useMemo(() => {
    if (feed.status !== 'loaded') return null
    const now = new Date()
    return feed.posts.map(p => ({
      ...p,
      comment: { ...p.comment, score: scoreComment(p.comment, { now }) },
    }))
  }, [feed])

  const filtered = useMemo(() => {
    if (!ranked) return null
    if (!funnyOnly) return ranked
    return ranked.filter(p =>
      p.comment.humor === undefined || p.comment.humor >= HUMOR_THRESHOLD,
    )
  }, [ranked, funnyOnly])

  const sorted = useMemo(
    () => (filtered ? sortPosts(filtered, sortMode) : null),
    [filtered, sortMode],
  )

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <SortToggle
          mode={sortMode}
          onChange={setSortMode}
          funnyOnly={funnyOnly}
          onFunnyOnlyChange={setFunnyOnly}
        />
        {feed.status === 'loading' && <FeedSkeleton />}
        {feed.status === 'loaded' && feed.posts.length === 0 && <EmptyState />}
        {feed.status === 'loaded' && feed.posts.length > 0 && (
          <FeedList posts={sorted ?? []} />
        )}
        {feed.status === 'error' && (
          <ErrorState message={feed.error.message} onRetry={handleRetry} />
        )}
      </div>
      <InstallPrompt />
    </AppShell>
  )
}

export default App
