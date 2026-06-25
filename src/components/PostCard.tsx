import { motion } from 'framer-motion'
import type { Post } from '../types'
import CommentBody from './CommentBody'
import EngagementFooter from './EngagementFooter'
import PostCardHeader from './PostCardHeader'
import QuotedArticleCard from './QuotedArticleCard'
import ReplyThread from './ReplyThread'

type Props = {
  post: Post
  // Stagger delay (seconds) applied to the mount transition only. Sort
  // reorders don't re-mount (stable key by post.comment.id), so changing
  // this value mid-life doesn't re-fire the animation.
  mountDelay?: number
}

export default function PostCard({ post, mountDelay = 0 }: Props) {
  const { comment, quoted } = post
  return (
    <motion.article
      aria-label={`${comment.author} ב-ynet`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: mountDelay, ease: 'easeOut' }}
      className="flex flex-col gap-3 rounded-card bg-surface p-5 shadow-card"
    >
      <PostCardHeader author={comment.author} timestamp={comment.timestamp} />
      <CommentBody title={comment.title} body={comment.body} />
      <QuotedArticleCard article={quoted} />
      <EngagementFooter comment={comment} />
      <ReplyThread replies={comment.replies ?? []} />
    </motion.article>
  )
}
