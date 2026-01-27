"use client";

import Image from "next/image";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Story {
  id: string;
  userName: string;
  avatar: string;
  isViewed?: boolean;
}

interface StoriesBarProps {
  stories: Story[];
  onStoryClick?: (storyId: string) => void;
  onAddStory?: () => void;
  className?: string;
}

export function StoriesBar({
  stories,
  onStoryClick,
  onAddStory,
  className,
}: StoriesBarProps) {
  return (
    <div
      className={cn(
        "flex gap-3 overflow-x-auto px-4 py-3 scrollbar-hide",
        className
      )}
    >
      {/* Add Story Button */}
      <button
        onClick={onAddStory}
        className="flex flex-shrink-0 flex-col items-center gap-1.5"
        aria-label="Add your story"
      >
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-primary bg-primary/5 transition-colors hover:bg-primary/10">
          <Plus className="h-6 w-6 text-primary" />
        </div>
        <span className="w-16 truncate text-center text-xs text-muted-foreground">
          Deine Story
        </span>
      </button>

      {/* Story Items */}
      {stories.map((story) => (
        <button
          key={story.id}
          onClick={() => onStoryClick?.(story.id)}
          className="flex flex-shrink-0 flex-col items-center gap-1.5"
        >
          <div className="relative">
            {/* Gradient Ring */}
            <div
              className={cn(
                "absolute -inset-0.5 rounded-full",
                story.isViewed
                  ? "bg-muted-foreground/30"
                  : "bg-gradient-to-tr from-primary via-red-400 to-orange-400"
              )}
            />
            <div className="relative h-16 w-16 overflow-hidden rounded-full bg-background p-0.5">
              <div className="relative h-full w-full overflow-hidden rounded-full">
                <Image
                  src={story.avatar || "/placeholder.svg"}
                  alt={story.userName}
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>
          <span className="w-16 truncate text-center text-xs text-muted-foreground">
            {story.userName}
          </span>
        </button>
      ))}
    </div>
  );
}
