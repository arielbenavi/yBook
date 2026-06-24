import PostCardSkeleton from './PostCardSkeleton'

const SKELETON_COUNT = 4

export default function FeedSkeleton() {
  return (
    <div
      role="status"
      aria-label="טוען פיד"
      className="flex flex-col gap-5"
    >
      {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  )
}
