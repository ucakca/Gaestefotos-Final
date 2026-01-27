'use client';

interface PhotoSkeletonProps {
  count?: number;
  className?: string;
}

export function PhotoSkeleton({ count = 8, className }: PhotoSkeletonProps) {
  const skeletons = Array.from({ length: count }, (_, i) => ({
    id: i,
    aspectRatio: [1, 1.3, 0.8, 1.5, 0.75, 1.2][i % 6],
  }));

  return (
    <div className={`grid grid-cols-2 gap-2 px-4 ${className || ''}`}>
      {skeletons.map((skeleton) => (
        <div key={skeleton.id}>
          <div
            className="w-full animate-pulse rounded-xl bg-muted"
            style={{ aspectRatio: `1 / ${skeleton.aspectRatio}` }}
          >
            <div className="relative h-full w-full overflow-hidden rounded-xl">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <section className="relative">
      <div className="relative h-56 w-full animate-pulse bg-muted" />

      <div className="relative z-10 -mt-16 flex flex-col items-center px-4">
        <div className="relative">
          <div className="h-32 w-32 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="mt-4 h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-3 w-48 animate-pulse rounded bg-muted" />
      </div>

      <div className="relative z-10 mx-4 mt-4 rounded-2xl border bg-card p-4 shadow-lg">
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-2 flex gap-3">
          <div className="h-3 w-32 animate-pulse rounded bg-muted" />
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        </div>
        <div className="mt-3 flex items-center justify-between border-t pt-3">
          <div className="flex gap-4">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </section>
  );
}

export function AlbumFilterSkeleton() {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-9 w-24 flex-shrink-0 animate-pulse rounded-full bg-muted"
        />
      ))}
    </div>
  );
}
