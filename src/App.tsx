import { useEffect, useState } from 'react'
import AppShell from './components/AppShell'
import PostCard from './components/PostCard'
import { loadFeed } from './data/feed'
import type { Post } from './types'

function App() {
  const [posts, setPosts] = useState<Post[] | null>(null)

  useEffect(() => {
    loadFeed().then(feed => setPosts(feed.posts))
  }, [])

  return (
    <AppShell>
      <div className="flex flex-col gap-5">
        {posts?.map(p => (
          <PostCard key={p.comment.id} post={p} />
        ))}
      </div>
    </AppShell>
  )
}

export default App
