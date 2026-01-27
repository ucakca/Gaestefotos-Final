'use client';

import { RefreshCw } from 'lucide-react';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  threshold?: number;
}

export default function PullToRefreshIndicator({
  pullDistance,
  isRefreshing,
  threshold = 80,
}: PullToRefreshIndicatorProps) {
  const progress = Math.min(pullDistance / threshold, 1);
  const shouldShow = pullDistance > 10 || isRefreshing;

  if (!shouldShow) return null;

  return (
    <div
      className="absolute left-0 right-0 top-0 z-40 flex items-center justify-center overflow-hidden"
      style={{ height: pullDistance }}
    >
      <div
        className={`flex items-center justify-center rounded-full bg-card p-2 shadow-lg transition-transform ${
          isRefreshing ? 'animate-spin' : ''
        }`}
        style={{
          transform: `rotate(${progress * 360}deg)`,
          opacity: Math.min(progress * 1.5, 1),
        }}
      >
        <RefreshCw
          className={`h-5 w-5 transition-colors ${
            progress >= 1 ? 'text-primary' : 'text-primary'
          }`}
        />
      </div>
    </div>
  );
}
