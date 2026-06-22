import type { ArticleRef } from '../types'

type Props = {
  article: ArticleRef
}

export default function QuotedArticleCard({ article }: Props) {
  const { url, title, author, imageUrl } = article
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`קרא ב־ynet: ${title}`}
      className="block overflow-hidden rounded-card border border-rule bg-paper-deep transition-colors hover:border-ink-subtle/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={title}
          loading="lazy"
          className="aspect-[16/9] w-full object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className="aspect-[16/9] w-full bg-paper"
        />
      )}
      <div className="flex flex-col gap-2 p-3 text-start">
        <div className="flex items-center gap-2">
          <span className="rounded-sm bg-ynet px-1.5 py-0.5 text-xs font-bold text-white">
            ynet
          </span>
          <span className="truncate text-xs text-ink-subtle">{author}</span>
        </div>
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-ink">
          {title}
        </p>
      </div>
    </a>
  )
}
