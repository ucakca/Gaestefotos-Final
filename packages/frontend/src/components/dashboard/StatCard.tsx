'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

/**
 * StatCard - v0-Style Statistics Card Component
 * 
 * Displays a single metric with icon, value, label and trend indicator.
 * Features:
 * - Icon with colored background
 * - Large metric value
 * - Description label
 * - Optional trend indicator (up/down)
 * - Hover animation
 * - Responsive design
 */

export interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  iconColor?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  onClick?: () => void;
}

const iconColorClasses = {
  primary: 'bg-blue-500/10 text-blue-500',
  success: 'bg-green-500/10 text-green-500',
  warning: 'bg-orange-500/10 text-orange-500',
  danger: 'bg-red-500/10 text-red-500',
  info: 'bg-purple-500/10 text-purple-500',
};

export default function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  iconColor = 'primary',
  onClick,
}: StatCardProps) {
  const CardWrapper = onClick ? motion.button : motion.div;

  return (
    <CardWrapper
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={onClick ? { scale: 1.02, y: -2 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      className={`
        bg-app-card border border-app-border rounded-2xl p-6 shadow-sm
        transition-shadow duration-200 hover:shadow-md
        ${onClick ? 'cursor-pointer text-left w-full' : ''}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${iconColorClasses[iconColor]} mb-4`}>
            <Icon className="w-6 h-6" />
          </div>
          
          <div className="space-y-1">
            <p className="text-3xl font-bold text-app-fg">{value}</p>
            <p className="text-sm text-app-muted">{label}</p>
          </div>
        </div>

        {trend && (
          <div className={`flex items-center gap-1 text-sm font-medium ${
            trend.isPositive ? 'text-green-500' : 'text-red-500'
          }`}>
            <span>{trend.isPositive ? '↑' : '↓'}</span>
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
    </CardWrapper>
  );
}
