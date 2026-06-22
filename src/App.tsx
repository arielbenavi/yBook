import { useEffect, useState } from 'react'
import AppShell from './components/AppShell'
import FeedList from './components/FeedList'
import { loadFeed } from './data/feed'
import type { Post } from './types'

function App() {
  const [posts, setPosts] = useState<Post[] | null>(null)

  useEffect(() => {
    loadFeed().then(feed => setPosts(feed.posts))
  }, [])

  return (
    <AppShell>
      <FeedList posts={posts ?? []} />
    </AppShell>
  )
}

export default App
