import type { Post } from '../types'
import CommentBody from './CommentBody'
import EngagementFooter from './EngagementFooter'
import PostCardHeader from './PostCardHeader'
import QuotedArticleCard from './QuotedArticleCard'
import ReplyThread from './ReplyThread'

type Props = {
  post: Post
}

export default function PostCard({ post }: Props) {
  const { comment, quoted } = post
  return (
    <article className="flex flex-col gap-3 rounded-card bg-surface p-5 shadow-card">
      <PostCardHeader author={comment.author} timestamp={comment.timestamp} />
      <CommentBody title={comment.title} body={comment.body} />
      <QuotedArticleCard article={quoted} />
      <EngagementFooter comment={comment} />
      <ReplyThread replies={comment.replies ?? []} />
    </article>
  )
}
