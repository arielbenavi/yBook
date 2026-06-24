import { motion } from 'framer-motion'
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
        <motion.span
          // Restrained scale-pop on the score chip the first time it mounts
          // (i.e. when the score first becomes defined). MotionConfig at the
          // root drops this to a no-op when prefers-reduced-motion is set.
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          aria-label={`ציון עניין ${Math.round(score)}`}
          className="ms-auto rounded-full bg-rule/40 px-2 py-0.5 text-xs font-medium text-ink-subtle"
        >
          {Math.round(score)}
        </motion.span>
      )}
    </div>
  )
}
