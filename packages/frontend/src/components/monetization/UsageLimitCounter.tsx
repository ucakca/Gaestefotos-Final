'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, TrendingUp, Zap } from 'lucide-react';
import { PackageInfo } from '@/hooks/usePackageFeatures';

interface UsageLimitCounterProps {
  packageInfo: PackageInfo | null;
  currentUsage: number;
  limitKey: 'storageLimitPhotos' | 'maxCategories' | 'maxChallenges' | 'maxCoHosts';
  label: string;
  onUpgrade?: () => void;
  compact?: boolean;
}

export function UsageLimitCounter({
  packageInfo,
  currentUsage,
  limitKey,
  label,
  onUpgrade,
  compact = false,
}: UsageLimitCounterProps) {
  const limit = packageInfo?.limits[limitKey] ?? 0;
  const isUnlimited = limit === null || limit === -1;
  const percentage = isUnlimited ? 0 : (currentUsage / limit) * 100;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  const statusColor = useMemo(() => {
    if (isAtLimit) return 'text-status-danger';
    if (isNearLimit) return 'text-status-warning';
    return 'text-app-muted';
  }, [isAtLimit, isNearLimit]);

  const barColor = useMemo(() => {
    if (isAtLimit) return 'bg-status-danger';
    if (isNearLimit) return 'bg-status-warning';
    return 'bg-app-accent';
  }, [isAtLimit, isNearLimit]);

  if (isUnlimited) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className={statusColor}>
          {currentUsage} / {limit}
        </span>
        <span className="text-app-muted text-xs">{label}</span>
        {isAtLimit && onUpgrade && (
          <button
            onClick={onUpgrade}
            className="text-xs text-app-accent hover:underline flex items-center gap-1"
          >
            <Zap className="w-3 h-3" />
            Upgrade
          </button>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-app-card border border-app-border rounded-lg p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isAtLimit && <AlertCircle className="w-4 h-4 text-status-danger" />}
          {isNearLimit && !isAtLimit && <TrendingUp className="w-4 h-4 text-status-warning" />}
          <span className="text-sm font-medium text-app-fg">{label}</span>
        </div>
        <span className={`text-sm font-semibold ${statusColor}`}>
          {currentUsage} / {limit}
        </span>
      </div>

      <div className="relative w-full h-2 bg-app-bg rounded-full overflow-hidden mb-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`h-full ${barColor} rounded-full`}
        />
      </div>

      {isAtLimit && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-status-danger font-medium">Limit erreicht</span>
          {onUpgrade && (
            <button
              onClick={onUpgrade}
              className="text-app-accent hover:underline flex items-center gap-1 font-medium"
            >
              <Zap className="w-3 h-3" />
              Jetzt upgraden
            </button>
          )}
        </div>
      )}

      {isNearLimit && !isAtLimit && (
        <div className="text-xs text-status-warning">
          Bald am Limit ({percentage.toFixed(0)}%)
        </div>
      )}
    </motion.div>
  );
}
