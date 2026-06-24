// Rendered when the feed loaded successfully but has zero posts.
// Card-chromed so it reads as intentional rather than as a broken render.

export default function EmptyState() {
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-2 rounded-card bg-surface p-10 text-center shadow-card"
    >
      <p className="text-lg font-bold text-ink">אין עדיין פוסטים בפיד</p>
      <p className="text-sm text-ink-muted">
        הפיד יתמלא ברגע שתעלה כתבה חדשה עם דיון.
      </p>
    </div>
  )
}
