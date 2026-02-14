'use client';

import { motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';

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
  const selectedStory = hasSelection ? stories[selectedStoryIndex as number] : null;

  return (
    <Dialog open={hasSelection} onOpenChange={(open) => (open ? null : onClose())}>
      {hasSelection && (
        <DialogContent
          data-testid="story-viewer"
          className="fixed inset-0 z-50 flex items-center justify-center bg-app-fg/95 p-0"
        >
          <DialogTitle className="sr-only">Story Viewer</DialogTitle>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0" />

          <div className="absolute top-0 left-0 right-0 z-30 px-4 pt-4 pb-5 bg-gradient-to-b from-app-fg/80 via-app-fg/50 to-transparent">
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
                    <div key={idx} className="h-1 flex-1 rounded bg-background/25 overflow-hidden">
                      <div className="h-full bg-background" style={{ width: `${Math.max(0, Math.min(1, fill)) * 100}%` }} />
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="min-w-0 text-app-bg/90 text-sm font-medium truncate">
                  {(selectedStory?.photo?.uploadedBy as string)?.trim() || (selectedStory?.video?.uploadedBy as string)?.trim() || 'Story'}
                </div>
                <DialogClose asChild>
                  <IconButton
                    onClick={onClose}
                    icon={<X className="w-5 h-5" />}
                    variant="glass"
                    size="sm"
                    data-testid="story-close"
                    aria-label="Schließen"
                    title="Schließen"
                    className="ml-3 inline-flex items-center justify-center w-9 h-9 rounded-full bg-background/10 hover:bg-background/15 text-app-bg"
                  />
                </DialogClose>
              </div>
            </div>
          </div>

          {stories.length > 1 && (
            <>
              <IconButton
                onClick={onPrev}
                icon={<ChevronLeft className="w-6 h-6" />}
                variant="glass"
                size="lg"
                data-testid="story-prev"
                aria-label="Vorherige Story"
                title="Vorherige Story"
                className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-background/10 hover:bg-background/15 text-app-bg flex items-center justify-center"
              />
              <IconButton
                onClick={onNext}
                icon={<ChevronRight className="w-6 h-6" />}
                variant="glass"
                size="lg"
                data-testid="story-next"
                aria-label="Nächste Story"
                title="Nächste Story"
                className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-background/10 hover:bg-background/15 text-app-bg flex items-center justify-center"
              />
            </>
          )}

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
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
                <Button
                  type="button"
                  aria-label="Vorherige Story"
                  onClick={onPrev}
                  variant="ghost"
                  size="sm"
                  className="absolute inset-y-0 left-0 w-1/2 z-20"
                />
                <Button
                  type="button"
                  aria-label="Nächste Story"
                  onClick={onNext}
                  variant="ghost"
                  size="sm"
                  className="absolute inset-y-0 right-0 w-1/2 z-20"
                />
              </>
            )}

            {selectedStory?.video?.url ? (
              <video
                src={selectedStory.video.url}
                data-testid="story-video"
                className="w-full max-h-[82vh] object-contain rounded-2xl shadow-2xl"
                playsInline
                autoPlay
                muted
              />
            ) : (
              <img
                src={selectedStory?.photo?.url || ''}
                alt="Story"
                data-testid="story-image"
                className="w-full max-h-[82vh] object-contain rounded-2xl shadow-2xl"
              />
            )}
          </motion.div>
        </DialogContent>
      )}
    </Dialog>
  );
}
