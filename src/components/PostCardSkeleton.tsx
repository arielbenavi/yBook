// Skeleton mirroring PostCard's structure so layout doesn't shift when real
// posts land. Same card chrome (bg-surface + rounded-card + shadow-card + p-5 +
// flex flex-col gap-3) means the shell occupies the exact same box.
//
// `motion-safe:animate-pulse` honors prefers-reduced-motion — no shimmer for
// users who've asked the OS to dial motion down.

const PULSE = 'bg-rule motion-safe:animate-pulse'

export default function PostCardSkeleton() {
  return (
    <article
      aria-hidden="true"
      className="flex flex-col gap-3 rounded-card bg-surface p-5 shadow-card"
    >
      {/* Header — avatar + stacked author / time bars */}
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 shrink-0 rounded-full ${PULSE}`} />
        <div className="flex flex-col gap-1.5">
          <div className={`h-3 w-24 rounded-md ${PULSE}`} />
          <div className={`h-2.5 w-16 rounded-md ${PULSE} bg-rule/70`} />
        </div>
      </div>

      {/* Body — 3 lines, descending widths */}
      <div className="flex flex-col gap-2">
        <div className={`h-3 w-full rounded-md ${PULSE}`} />
        <div className={`h-3 w-11/12 rounded-md ${PULSE}`} />
        <div className={`h-3 w-3/4 rounded-md ${PULSE}`} />
      </div>

      {/* Quoted card — recessed, image block + two text bars */}
      <div className="overflow-hidden rounded-card border border-rule bg-paper-deep">
        <div className={`aspect-[16/9] w-full motion-safe:animate-pulse`} />
        <div className="flex flex-col gap-2 p-3">
          <div className={`h-2.5 w-20 rounded-md ${PULSE}`} />
          <div className={`h-3 w-5/6 rounded-md ${PULSE}`} />
        </div>
      </div>

      {/* Footer — three short bars where icon + count rows will sit */}
      <div className="flex items-center gap-5">
        <div className={`h-4 w-12 rounded-md ${PULSE}`} />
        <div className={`h-4 w-12 rounded-md ${PULSE}`} />
        <div className={`h-4 w-12 rounded-md ${PULSE}`} />
      </div>
    </article>
  )
}
