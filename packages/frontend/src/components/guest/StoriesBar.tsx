'use client';

import { Play } from 'lucide-react';
import { Button } from '@/components/ui/Button';

type Story = any;

export default function StoriesBar({ stories, onSelect }: { stories: Story[]; onSelect: (index: number) => void }) {
  if (!stories || stories.length === 0) return null;

  return (
    <div className="px-4 py-3 border-b border-border" data-testid="stories-bar">
      <div className="flex gap-3 overflow-x-auto pr-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {stories.map((s: any, idx: number) => (
          <Button
            key={s.id || idx}
            type="button"
            onClick={() => onSelect(idx)}
            data-testid={`story-item-${idx}`}
            variant="ghost"
            size="sm"
            className="flex flex-col items-center gap-1.5 flex-shrink-0 active:scale-[0.98] p-0 h-auto"
          >
            <div className="w-[60px] h-[60px] rounded-full bg-gradient-to-tr from-[var(--app-accent)] via-[var(--app-bg)] to-[var(--app-accent)] p-[2px] shadow-sm">
              <div className="w-full h-full rounded-full overflow-hidden bg-background ring-2 ring-[var(--app-card)]">
                {s?.photo?.url ? (
                  <img src={s.photo.url} alt="Story" className="w-full h-full object-cover" />
                ) : s?.video?.url ? (
                  <div className="w-full h-full flex items-center justify-center bg-app-fg/5">
                    <Play className="w-6 h-6 text-foreground" />
                  </div>
                ) : (
                  <div className="w-full h-full" />
                )}
              </div>
            </div>
            <div className="text-[11px] font-medium text-foreground max-w-[72px] truncate">
              {(() => {
                const name = (s?.photo?.uploadedBy as string)?.trim() || (s?.video?.uploadedBy as string)?.trim();
                // Filter out invalid names like "++", empty strings, or just symbols
                if (!name || name.length < 2 || /^[^a-zA-Z0-9äöüÄÖÜß]+$/.test(name)) {
                  return 'Story';
                }
                return name;
              })()}
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}
