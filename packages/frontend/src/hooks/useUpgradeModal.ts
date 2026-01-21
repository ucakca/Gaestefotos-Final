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
    // TODO: Redirect to checkout or contact form
    window.location.href = `/pricing?tier=${tier}`;
  }, []);

  return {
    isOpen,
    triggerFeature,
    openUpgradeModal,
    closeUpgradeModal,
    handleSelectTier,
  };
}
