'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

type Story = any;

type Props = {
  stories: Story[];
  selectedStoryIndex: number | null;
  storyProgress: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onPause: () => void;
  onResume: () => void;
  onDragPrev: () => void;
  onDragNext: () => void;
};

export default function StoryViewer({
  stories,
  selectedStoryIndex,
  storyProgress,
  onClose,
  onPrev,
  onNext,
  onPause,
  onResume,
  onDragPrev,
  onDragNext,
}: Props) {
  const hasSelection = selectedStoryIndex !== null && !!stories[selectedStoryIndex];

  return (
    <AnimatePresence>
      {hasSelection && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          data-testid="story-viewer"
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
        >
          <div className="absolute inset-0" onClick={onClose} />

          <div
            className="absolute top-0 left-0 right-0 z-30 px-4 pt-4 pb-5 bg-gradient-to-b from-black/80 via-black/50 to-transparent"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto w-full max-w-md">
              <div className="flex gap-1" data-testid="story-progress">
                {stories.map((_: any, idx: number) => {
                  const fill =
                    selectedStoryIndex === null
                      ? 0
                      : idx < selectedStoryIndex
                        ? 1
                        : idx === selectedStoryIndex
                          ? storyProgress
                          : 0;
                  return (
                    <div key={idx} className="h-1 flex-1 rounded bg-white/25 overflow-hidden">
                      <div className="h-full bg-white" style={{ width: `${Math.max(0, Math.min(1, fill)) * 100}%` }} />
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="min-w-0 text-white/90 text-sm font-medium truncate">
                  {(stories[selectedStoryIndex as number]?.photo?.uploadedBy as string) || 'Story'}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  data-testid="story-close"
                  className="ml-3 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {stories.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPrev();
                }}
                data-testid="story-prev"
                className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-white/10 hover:bg-white/15 text-white flex items-center justify-center"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNext();
                }}
                data-testid="story-next"
                className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-white/10 hover:bg-white/15 text-white flex items-center justify-center"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            drag={stories.length > 1 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (stories.length <= 1) return;
              const threshold = 60;
              if (info.offset.x > threshold) {
                onDragPrev();
                return;
              }
              if (info.offset.x < -threshold) {
                onDragNext();
              }
            }}
            className="w-full max-w-md relative select-none touch-pan-y px-4"
          >
            <div
              className="absolute inset-0 z-10"
              onPointerDown={onPause}
              onPointerUp={onResume}
              onPointerCancel={onResume}
              onPointerLeave={onResume}
            >
              <div className="absolute inset-y-0 left-0 w-1/2" />
              <div className="absolute inset-y-0 right-0 w-1/2" />
            </div>

            {stories.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Vorherige Story"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPrev();
                  }}
                  className="absolute inset-y-0 left-0 w-1/2 z-20"
                />
                <button
                  type="button"
                  aria-label="Nächste Story"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNext();
                  }}
                  className="absolute inset-y-0 right-0 w-1/2 z-20"
                />
              </>
            )}

            <img
              src={stories[selectedStoryIndex as number]?.photo?.url || ''}
              alt="Story"
              data-testid="story-image"
              className="w-full max-h-[82vh] object-contain rounded-2xl shadow-2xl"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
