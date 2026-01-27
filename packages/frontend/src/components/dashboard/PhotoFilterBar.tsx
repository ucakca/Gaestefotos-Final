'use client';

import { motion } from 'framer-motion';
import { Check, X, Clock, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

/**
 * PhotoFilterBar - v0-Style Filter Bar für Photo Moderation
 * 
 * Filter pills + Search
 */

export type PhotoFilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

export interface PhotoFilterBarProps {
  activeFilter: PhotoFilterStatus;
  onFilterChange: (filter: PhotoFilterStatus) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  counts?: {
    all: number;
    pending: number;
    approved: number;
    rejected: number;
  };
}

const FILTERS = [
  { id: 'all' as const, label: 'Alle', icon: Filter },
  { id: 'pending' as const, label: 'Ausstehend', icon: Clock },
  { id: 'approved' as const, label: 'Freigegeben', icon: Check },
  { id: 'rejected' as const, label: 'Abgelehnt', icon: X },
];

export default function PhotoFilterBar({
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  counts,
}: PhotoFilterBarProps) {
  return (
    <div className="bg-app-card border border-app-border rounded-lg p-4 shadow-sm">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => {
            const Icon = filter.icon;
            const isActive = activeFilter === filter.id;
            const count = counts?.[filter.id] || 0;

            return (
              <motion.button
                key={filter.id}
                onClick={() => onFilterChange(filter.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-app-accent text-white'
                    : 'bg-app-bg text-app-fg hover:bg-app-bg/80'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Icon className="w-4 h-4" />
                <span>{filter.label}</span>
                {count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    isActive ? 'bg-white/20' : 'bg-app-accent/10 text-app-accent'
                  }`}>
                    {count}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Search */}
        <div className="lg:ml-auto lg:w-64">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted" />
            <Input
              type="text"
              placeholder="Suchen..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
