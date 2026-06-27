import { motion } from 'framer-motion'
import { MessageCircle, ThumbsDown, ThumbsUp } from 'lucide-react'
import type { Comment } from '../types'

type Props = {
  comment: Pick<Comment, 'likes' | 'dislikes' | 'replyCount' | 'score' | 'humor' | 'humorReason'>
}

function humorBadgeClass(humor: number): string {
  if (humor >= 7) return 'bg-brand-soft text-brand'
  if (humor >= 3) return 'bg-rule/40 text-ink-muted'
  return 'bg-rule/20 text-ink-subtle'
}

export default function EngagementFooter({ comment }: Props) {
  const { likes, dislikes, replyCount, score, humor, humorReason } = comment
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
      <span className="ms-auto inline-flex items-center gap-2">
        {humor !== undefined && (
          <span
            aria-label={`ציון הומור ${humor}`}
            title={humorReason}
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${humorBadgeClass(humor)}`}
          >
            😂 {humor}
          </span>
        )}
        {score !== undefined && (
          <motion.span
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            aria-label={`ציון עניין ${Math.round(score)}`}
            className="rounded-full bg-rule/40 px-2 py-0.5 text-xs font-medium text-ink-subtle"
          >
            {Math.round(score)}
          </motion.span>
        )}
      </span>
    </div>
  )
}
