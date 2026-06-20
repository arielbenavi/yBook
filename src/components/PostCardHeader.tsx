import { authorInitial, avatarColor } from '../utils/avatarColor'
import { absoluteTimeHe, relativeTimeHe } from '../utils/time'

type Props = {
  author: string
  timestamp: string
}

export default function PostCardHeader({ author, timestamp }: Props) {
  return (
    <div className="flex items-center gap-3">
      <div
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-semibold text-white"
        style={{ backgroundColor: avatarColor(author) }}
      >
        {authorInitial(author)}
      </div>
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="truncate font-semibold text-ink">{author}</span>
        <time
          dateTime={timestamp}
          title={absoluteTimeHe(timestamp)}
          className="text-xs text-ink-subtle"
        >
          {relativeTimeHe(timestamp)}
        </time>
      </div>
    </div>
  )
}
