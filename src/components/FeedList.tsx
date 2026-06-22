import type { Post } from '../types'
import PostCard from './PostCard'

type Props = {
  posts: Post[]
}

export default function FeedList({ posts }: Props) {
  return (
    <div className="flex flex-col gap-5">
      {posts.map(p => (
        <PostCard key={p.comment.id} post={p} />
      ))}
    </div>
  )
}
