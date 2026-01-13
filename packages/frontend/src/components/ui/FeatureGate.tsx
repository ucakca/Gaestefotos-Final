'use client';

import { ReactNode } from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { FeatureKey, FEATURE_DESCRIPTIONS } from '@/hooks/usePackageFeatures';
import { Button } from './Button';

interface FeatureGateProps {
  feature: FeatureKey;
  isEnabled: boolean;
  packageName?: string;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradeButton?: boolean;
  onUpgrade?: () => void;
  className?: string;
}

/**
 * FeatureGate Component
 * 
 * Zeigt den Inhalt nur an, wenn das Feature aktiviert ist.
 * Andernfalls wird ein ausgegraueter Bereich mit Upgrade-Hinweis angezeigt.
 * 
 * Usage:
 * ```tsx
 * const { isFeatureEnabled, packageName } = usePackageFeatures(eventId);
 * 
 * <FeatureGate 
 *   feature="videoUpload" 
 *   isEnabled={isFeatureEnabled('videoUpload')}
 *   packageName={packageName}
 * >
 *   <VideoUploadComponent />
 * </FeatureGate>
 * ```
 */
export function FeatureGate({
  feature,
  isEnabled,
  packageName = 'Free',
  children,
  fallback,
  showUpgradeButton = true,
  onUpgrade,
  className = '',
}: FeatureGateProps) {
  if (isEnabled) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const featureInfo = FEATURE_DESCRIPTIONS[feature];

  return (
    <div className={`relative ${className}`}>
      {/* Disabled overlay */}
      <div className="opacity-40 pointer-events-none select-none blur-[1px]">
        {children}
      </div>

      {/* Upgrade prompt overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-app-bg/60 backdrop-blur-[2px] rounded-lg">
        <div className="text-center p-4 max-w-xs">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-app-card border border-app-border flex items-center justify-center">
            <Lock className="w-5 h-5 text-app-muted" />
          </div>
          <h4 className="font-semibold text-app-fg text-sm mb-1">
            {featureInfo.name}
          </h4>
          <p className="text-xs text-app-muted mb-3">
            Nicht in {packageName} enthalten
          </p>
          {showUpgradeButton && (
            <Button
              variant="primary"
              size="sm"
              onClick={onUpgrade}
              className="gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Upgrade
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * FeatureButton Component
 * 
 * Ein Button, der ausgegraut ist wenn das Feature nicht aktiviert ist.
 */
interface FeatureButtonProps {
  feature: FeatureKey;
  isEnabled: boolean;
  packageName?: string;
  onClick?: () => void;
  onUpgrade?: () => void;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function FeatureButton({
  feature,
  isEnabled,
  packageName = 'Free',
  onClick,
  onUpgrade,
  children,
  variant = 'secondary',
  size = 'sm',
  className = '',
}: FeatureButtonProps) {
  const featureInfo = FEATURE_DESCRIPTIONS[feature];

  if (isEnabled) {
    return (
      <Button variant={variant} size={size} onClick={onClick} className={className}>
        {children}
      </Button>
    );
  }

  return (
    <Button
      variant="secondary"
      size={size}
      onClick={onUpgrade}
      className={`opacity-60 ${className}`}
      title={`${featureInfo.name} - Nicht in ${packageName} enthalten. Klicke für Upgrade.`}
    >
      <Lock className="w-3.5 h-3.5 mr-1.5" />
      {children}
    </Button>
  );
}

/**
 * LimitIndicator Component
 * 
 * Zeigt den aktuellen Stand eines Limits an (z.B. "3/5 Alben verwendet")
 */
interface LimitIndicatorProps {
  label: string;
  current: number;
  max: number | null;
  showWarning?: boolean;
  className?: string;
}

export function LimitIndicator({
  label,
  current,
  max,
  showWarning = true,
  className = '',
}: LimitIndicatorProps) {
  const isUnlimited = max === null;
  const isNearLimit = !isUnlimited && current >= max * 0.8;
  const isAtLimit = !isUnlimited && current >= max;

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <span className="text-app-muted">{label}:</span>
      <span
        className={`font-medium ${
          isAtLimit
            ? 'text-status-danger'
            : isNearLimit && showWarning
              ? 'text-status-warning'
              : 'text-app-fg'
        }`}
      >
        {current}
        {!isUnlimited && `/${max}`}
        {isUnlimited && ' (unbegrenzt)'}
      </span>
      {isAtLimit && (
        <span className="text-xs text-status-danger">(Limit erreicht)</span>
      )}
    </div>
  );
}
