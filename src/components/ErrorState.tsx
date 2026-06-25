// Rendered when loadFeed rejects — covers both network/parse failures and the
// FeedShapeError the validator throws when the scraper writes malformed JSON.
// Card-chromed + a retry CTA so the path is real, not a stub.

type Props = {
  message?: string
  onRetry: () => void
}

export default function ErrorState({ message, onRetry }: Props) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-card bg-surface p-10 text-center shadow-card"
    >
      <p className="text-lg font-bold text-ink">משהו השתבש בטעינת הפיד</p>
      {message && (
        <p
          dir="auto"
          className="max-w-full break-words text-sm text-ink-muted"
        >
          {message}
        </p>
      )}
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex min-h-[44px] items-center rounded-full bg-brand px-5 text-sm font-medium text-white transition-colors hover:bg-brand/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand md:min-h-0 md:py-1.5"
      >
        נסה שוב
      </button>
    </div>
  )
}
