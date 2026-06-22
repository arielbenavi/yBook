import { MessageCircle, ThumbsDown, ThumbsUp } from 'lucide-react'
import type { Comment } from '../types'

type Props = {
  comment: Pick<Comment, 'likes' | 'dislikes' | 'replyCount' | 'score'>
}

export default function EngagementFooter({ comment }: Props) {
  const { likes, dislikes, replyCount, score } = comment
  return (
    <div className="flex items-center gap-5 text-sm text-ink-subtle">
      <span
        aria-label={`${likes} אהבתי`}
        className="inline-flex items-center gap-1.5"
      >
        <ThumbsUp aria-hidden="true" className="h-4 w-4" />
        <span>{likes}</span>
      </span>
      <span
        aria-label={`${dislikes} לא אהבתי`}
        className="inline-flex items-center gap-1.5"
      >
        <ThumbsDown aria-hidden="true" className="h-4 w-4" />
        <span>{dislikes}</span>
      </span>
      <span
        aria-label={`${replyCount} תגובות`}
        className="inline-flex items-center gap-1.5"
      >
        <MessageCircle aria-hidden="true" className="h-4 w-4" />
        <span>{replyCount}</span>
      </span>
      {score !== undefined && (
        <span
          aria-label={`ציון עניין ${score}`}
          className="ms-auto rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand"
        >
          {score}
        </span>
      )}
    </div>
  )
}
