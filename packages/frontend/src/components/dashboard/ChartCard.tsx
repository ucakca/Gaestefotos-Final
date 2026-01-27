'use client';

import React from 'react';
import { motion } from 'framer-motion';

/**
 * ChartCard - v0-Style Chart Container Component
 * 
 * Wraps charts with consistent styling and header.
 * Features:
 * - Card wrapper with border
 * - Title and optional subtitle
 * - Padding and spacing
 * - Responsive design
 */

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function ChartCard({
  title,
  subtitle,
  children,
}: ChartCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-app-card border border-app-border rounded-2xl p-6 shadow-sm"
    >
      <div className="mb-6">
        <h3 className="text-lg font-bold text-app-fg">{title}</h3>
        {subtitle && (
          <p className="text-sm text-app-muted mt-1">{subtitle}</p>
        )}
      </div>
      
      <div className="w-full">
        {children}
      </div>
    </motion.div>
  );
}
