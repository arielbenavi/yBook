import { useEffect, useState } from 'react'
import AppShell from './components/AppShell'
import CommentBody from './components/CommentBody'
import EngagementFooter from './components/EngagementFooter'
import PostCardHeader from './components/PostCardHeader'
import QuotedArticleCard from './components/QuotedArticleCard'
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
        aria-label="PostCard preview"
        className="rounded-card border-2 border-dashed border-rule bg-surface/40 p-6"
      >
        <p className="mb-5 text-xs uppercase tracking-wider text-ink-subtle">
          Header + Body + Quoted + Footer · eyeball preview (replies thread next)
        </p>
        <div className="flex flex-col gap-8">
          {posts?.slice(0, 3).map(p => (
            <article key={p.comment.id} className="flex flex-col gap-3">
              <PostCardHeader
                author={p.comment.author}
                timestamp={p.comment.timestamp}
              />
              <CommentBody
                title={p.comment.title}
                body={p.comment.body}
              />
              <QuotedArticleCard article={p.quoted} />
              <EngagementFooter comment={p.comment} />
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  )
}

export default App
