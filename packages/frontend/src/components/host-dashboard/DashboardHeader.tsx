'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Settings, MoreVertical } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  backUrl?: string;
  status?: 'active' | 'inactive' | 'locked';
  onSettingsClick?: () => void;
  actions?: React.ReactNode;
}

export default function DashboardHeader({
  title,
  subtitle,
  backUrl = '/dashboard',
  status = 'active',
  onSettingsClick,
  actions,
}: DashboardHeaderProps) {
  const statusConfig = {
    active: { label: 'Aktiv', className: 'bg-success/100/10 text-success' },
    inactive: { label: 'Inaktiv', className: 'bg-warning/10 text-warning' },
    locked: { label: 'Gesperrt', className: 'bg-destructive/100/10 text-destructive' },
  };

  const currentStatus = statusConfig[status];

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border"
    >
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Back + Title */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={backUrl}
              className="p-2 -ml-2 rounded-full hover:bg-card transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground truncate">{title}</h1>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${currentStatus.className}`}>
                  {currentStatus.label}
                </span>
              </div>
              {subtitle && (
                <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {actions}
            {onSettingsClick && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onSettingsClick}
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Einstellungen</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  );
}
