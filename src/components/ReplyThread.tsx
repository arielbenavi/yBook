import { useState } from 'react'
import type { Comment } from '../types'
import { authorInitial, avatarColor } from '../utils/avatarColor'
import { absoluteTimeHe, relativeTimeHe } from '../utils/time'

type Props = {
  replies: Comment[]
}

export default function ReplyThread({ replies }: Props) {
  const [expanded, setExpanded] = useState(false)
  if (replies.length === 0) return null

  const label = expanded
    ? 'הסתר תגובות'
    : replies.length === 1
      ? 'הצג תגובה אחת'
      : `הצג ${replies.length} תגובות`

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        aria-expanded={expanded}
        className="inline-flex min-h-[44px] items-center self-start text-sm font-medium text-brand hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand md:min-h-0"
      >
        {label}
      </button>
      {expanded && (
        <ul className="ms-5 flex flex-col gap-4 border-s border-rule ps-4">
          {replies.map(reply => (
            <li key={reply.id} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2.5">
                <div
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: avatarColor(reply.author) }}
                >
                  {authorInitial(reply.author)}
                </div>
                <div className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-sm font-semibold text-ink">
                    {reply.author}
                  </span>
                  <time
                    dateTime={reply.timestamp}
                    title={absoluteTimeHe(reply.timestamp)}
                    className="text-xs text-ink-subtle"
                  >
                    {relativeTimeHe(reply.timestamp)}
                  </time>
                </div>
              </div>
              {reply.title && (
                <p className="text-sm font-semibold text-ink">{reply.title}</p>
              )}
              <p className="whitespace-pre-line break-words text-sm leading-relaxed text-ink">
                {reply.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
