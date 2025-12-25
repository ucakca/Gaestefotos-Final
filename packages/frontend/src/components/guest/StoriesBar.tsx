'use client';

import { Play } from 'lucide-react';

type Story = any;

export default function StoriesBar({ stories, onSelect }: { stories: Story[]; onSelect: (index: number) => void }) {
  if (!stories || stories.length === 0) return null;

  return (
    <div className="px-4 py-3 border-b border-gray-100" data-testid="stories-bar">
      <div className="flex gap-3 overflow-x-auto pr-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {stories.map((s: any, idx: number) => (
          <button
            key={s.id || idx}
            type="button"
            onClick={() => onSelect(idx)}
            data-testid={`story-item-${idx}`}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 active:scale-[0.98]"
          >
            <div className="w-[60px] h-[60px] rounded-full bg-gradient-to-tr from-[#EAA48F] via-[#F2C6A0] to-[#EAA48F] p-[2px] shadow-sm">
              <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 ring-2 ring-white">
                {s?.photo?.url ? (
                  <img src={s.photo.url} alt="Story" className="w-full h-full object-cover" />
                ) : s?.video?.url ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-900/5">
                    <Play className="w-6 h-6 text-gray-700" />
                  </div>
                ) : (
                  <div className="w-full h-full" />
                )}
              </div>
            </div>
            <div className="text-[11px] font-medium text-gray-700 max-w-[72px] truncate">
              {(s?.photo?.uploadedBy as string) || (s?.video?.uploadedBy as string) || 'Story'}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
