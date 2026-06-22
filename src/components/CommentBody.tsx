type Props = {
  title?: string
  body: string
}

export default function CommentBody({ title, body }: Props) {
  return (
    <div className="flex flex-col gap-1.5 text-start">
      {title && (
        <p className="text-lg font-bold leading-snug text-ink">{title}</p>
      )}
      <p className="leading-relaxed whitespace-pre-line break-words text-ink">
        {body}
      </p>
    </div>
  )
}
