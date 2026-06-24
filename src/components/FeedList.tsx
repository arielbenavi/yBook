import type { Post } from '../types'
import PostCard from './PostCard'

type Props = {
  posts: Post[]
}

// Cap the stagger delay so a long feed doesn't end with a 600ms wait. Eight
// cards in (~320ms) is plenty to read as "staggered" before flattening out.
const STAGGER_STEP = 0.04
const STAGGER_CAP = 0.32

export default function FeedList({ posts }: Props) {
  return (
    <div className="flex flex-col gap-5">
      {posts.map((p, i) => (
        <PostCard
          key={p.comment.id}
          post={p}
          mountDelay={Math.min(i * STAGGER_STEP, STAGGER_CAP)}
        />
      ))}
    </div>
  )
}
