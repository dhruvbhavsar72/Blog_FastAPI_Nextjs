export default function LoadingState({ label = "Loading stories" }: { label?: string }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3" aria-label={label}>
      {Array.from({ length: 6 }, (_, index) => (
        <div
          className="overflow-hidden rounded-2xl border border-border bg-card"
          key={index}
        >
          <div className="h-48 animate-pulse bg-secondary" />
          <div className="space-y-4 p-6">
            <div className="h-3 w-24 animate-pulse rounded bg-secondary" />
            <div className="h-6 w-4/5 animate-pulse rounded bg-secondary" />
            <div className="h-4 w-full animate-pulse rounded bg-secondary" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-secondary" />
          </div>
        </div>
      ))}
      <span className="sr-only">{label}…</span>
    </div>
  );
}
