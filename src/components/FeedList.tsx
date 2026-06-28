import type { Post } from '../types'
import PostCard from './PostCard'

type Props = {
  posts: Post[]
  likeCounts: Map<string, number>
  userLikes: Set<string>
  onToggleLike?: (commentId: string) => void
}

const STAGGER_STEP = 0.04
const STAGGER_CAP = 0.32

export default function FeedList({ posts, likeCounts, userLikes, onToggleLike }: Props) {
  return (
    <ul role="list" className="flex flex-col gap-5">
      {posts.map((p, i) => (
        <li key={p.comment.id}>
          <PostCard
            post={p}
            mountDelay={Math.min(i * STAGGER_STEP, STAGGER_CAP)}
            sharedLikeCount={likeCounts.get(p.comment.id)}
            isLikedByUser={userLikes.has(p.comment.id)}
            onToggleLike={onToggleLike ? () => onToggleLike(p.comment.id) : undefined}
          />
        </li>
      ))}
    </ul>
  )
}
