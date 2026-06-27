import { motion } from 'framer-motion'
import type { Post } from '../types'
import { HUMOR_THRESHOLD } from '../scoring/humorThreshold'
import CommentBody from './CommentBody'
import EngagementFooter from './EngagementFooter'
import PostCardHeader from './PostCardHeader'
import QuotedArticleCard from './QuotedArticleCard'
import ReplyThread from './ReplyThread'

type Props = {
  post: Post
  mountDelay?: number
}

export default function PostCard({ post, mountDelay = 0 }: Props) {
  const { comment, quoted } = post
  const belowThreshold = comment.humor !== undefined && comment.humor < HUMOR_THRESHOLD
  return (
    <motion.article
      aria-label={`${comment.author} ב-ynet`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: belowThreshold ? 0.5 : 1, y: 0 }}
      transition={{ duration: 0.28, delay: mountDelay, ease: 'easeOut' }}
      className="flex flex-col gap-3 rounded-card bg-surface p-5 shadow-card"
    >
      <div className="flex items-center gap-2">
        <PostCardHeader author={comment.author} timestamp={comment.timestamp} />
        {belowThreshold && (
          <span className="rounded-full bg-rule/40 px-2 py-0.5 text-xs text-ink-subtle">
            נסתר
          </span>
        )}
      </div>
      <CommentBody title={comment.title} body={comment.body} />
      <QuotedArticleCard article={quoted} />
      <EngagementFooter comment={comment} />
      <ReplyThread replies={comment.replies ?? []} />
    </motion.article>
  )
}
