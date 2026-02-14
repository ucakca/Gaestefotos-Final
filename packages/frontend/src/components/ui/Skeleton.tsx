'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-border/50',
        className
      )}
    />
  );
}

export function PhotoGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="aspect-square">
          <Skeleton className="w-full h-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function PhotoModalSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <Skeleton className="w-full aspect-[4/3] rounded-lg" />
      <div className="flex gap-2">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-4 rounded-xl border border-border bg-card">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="p-4 rounded-xl border border-border bg-card">
      <Skeleton className="w-full h-32 rounded-lg mb-4" />
      <Skeleton className="h-5 w-3/4 mb-2" />
      <Skeleton className="h-4 w-1/2 mb-4" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
    </div>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton className="w-12 h-12 rounded-lg" />
      <div className="flex-1">
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="w-8 h-8 rounded-md" />
    </div>
  );
}

export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 p-3 border-b border-border">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
  );
}

export function FullPageSkeleton() {
  return (
    <div className="min-h-screen p-4">
      <Skeleton className="h-8 w-48 mb-6" />
      <DashboardStatsSkeleton />
      <div className="mt-8">
        <Skeleton className="h-6 w-32 mb-4" />
        <PhotoGridSkeleton count={8} />
      </div>
    </div>
  );
}
