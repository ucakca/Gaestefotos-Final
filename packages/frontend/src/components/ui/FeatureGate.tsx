'use client';

import { ReactNode } from 'react';
import { Lock, Sparkles, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { FeatureKey, FEATURE_DESCRIPTIONS } from '@/hooks/usePackageFeatures';
import { Button } from './Button';
import { ProBadge } from '@/components/monetization/ProBadge';

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
      {/* Disabled content */}
      <div className="opacity-30 pointer-events-none select-none blur-[1px] grayscale">
        {children}
      </div>

      {/* Enhanced upgrade prompt overlay */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-app-bg/80 via-app-bg/70 to-transparent backdrop-blur-sm rounded-lg"
      >
        <div className="text-center p-6 max-w-sm">
          <div className="mb-3 flex justify-center">
            <ProBadge size="lg" variant="crown" animated />
          </div>
          
          <h4 className="font-bold text-app-fg text-lg mb-2">
            {featureInfo.name}
          </h4>
          
          <p className="text-sm text-app-muted mb-2">
            {featureInfo.description}
          </p>
          
          <p className="text-xs text-app-muted mb-4">
            Nicht in <strong>{packageName}</strong> enthalten
          </p>
          
          {showUpgradeButton && (
            <Button
              variant="primary"
              size="md"
              onClick={onUpgrade}
              className="gap-2 shadow-lg hover:shadow-xl transition-shadow"
            >
              <Zap className="w-4 h-4" />
              Jetzt upgraden
            </Button>
          )}
        </div>
      </motion.div>
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
