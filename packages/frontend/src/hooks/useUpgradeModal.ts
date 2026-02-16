'use client';

import { useState, useCallback } from 'react';
import { FeatureKey } from './usePackageFeatures';

export function useUpgradeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [triggerFeature, setTriggerFeature] = useState<FeatureKey | undefined>();

  const openUpgradeModal = useCallback((feature?: FeatureKey) => {
    setTriggerFeature(feature);
    setIsOpen(true);
  }, []);

  const closeUpgradeModal = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => setTriggerFeature(undefined), 300);
  }, []);

  const handleSelectTier = useCallback((tier: string) => {
    const params = new URLSearchParams({ tier });
    if (triggerFeature) params.set('feature', triggerFeature);
    params.set('ref', 'upgrade-modal');
    window.location.href = `/pricing?${params.toString()}`;
  }, [triggerFeature]);

  return {
    isOpen,
    triggerFeature,
    openUpgradeModal,
    closeUpgradeModal,
    handleSelectTier,
  };
}
