import { useEffect, useState } from 'react'
import AppShell from './components/AppShell'
import PostCardHeader from './components/PostCardHeader'
import { loadFeed } from './data/feed'
import type { Post } from './types'

function App() {
  const [posts, setPosts] = useState<Post[] | null>(null)

  useEffect(() => {
    loadFeed().then(feed => setPosts(feed.posts))
  }, [])

  return (
    <AppShell>
      <section
        aria-label="PostCardHeader preview"
        className="rounded-card border-2 border-dashed border-rule bg-surface/40 p-6"
      >
        <p className="mb-5 text-xs uppercase tracking-wider text-ink-subtle">
          PostCardHeader · eyeball preview (body / quote / footer come next)
        </p>
        <div className="flex flex-col gap-5">
          {posts?.slice(0, 3).map(p => (
            <PostCardHeader
              key={p.comment.id}
              author={p.comment.author}
              timestamp={p.comment.timestamp}
            />
          ))}
        </div>
      </section>
    </AppShell>
  )
}

export default App
