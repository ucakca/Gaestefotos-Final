'use client';

import React from 'react';
import { Checkbox } from '@/components/ui/Checkbox';
import { motion } from 'framer-motion';

/**
 * SettingToggle - v0-Style Setting Toggle
 * 
 * Pretty toggle for settings with label and description.
 * Features:
 * - Label & description
 * - Checkbox integration
 * - Hover animation
 * - Help text
 */

export interface SettingToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export default function SettingToggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: SettingToggleProps) {
  return (
    <motion.label
      whileHover={{ x: 2 }}
      className={`flex items-start gap-3 p-3 rounded-lg hover:bg-app-bg/50 transition-colors ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className="mt-0.5"
      />
      <div className="flex-1">
        <p className="font-medium text-app-fg">{label}</p>
        {description && (
          <p className="text-sm text-app-muted mt-1">{description}</p>
        )}
      </div>
    </motion.label>
  );
}
