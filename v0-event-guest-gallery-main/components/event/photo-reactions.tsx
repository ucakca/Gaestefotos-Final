"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export type ReactionType = "heart" | "fire" | "laugh" | "wow" | "sad" | "clap";

interface Reaction {
  type: ReactionType;
  emoji: string;
  label: string;
}

const REACTIONS: Reaction[] = [
  { type: "heart", emoji: "❤️", label: "Gefällt mir" },
  { type: "fire", emoji: "🔥", label: "Feuer" },
  { type: "laugh", emoji: "😂", label: "Lustig" },
  { type: "wow", emoji: "😮", label: "Wow" },
  { type: "sad", emoji: "😢", label: "Traurig" },
  { type: "clap", emoji: "👏", label: "Applaus" },
];

interface ReactionCount {
  type: ReactionType;
  count: number;
}

interface PhotoReactionsProps {
  reactions: ReactionCount[];
  userReaction?: ReactionType | null;
  onReact: (type: ReactionType | null) => void;
  compact?: boolean;
  className?: string;
}

export function PhotoReactions({
  reactions,
  userReaction,
  onReact,
  compact = false,
  className,
}: PhotoReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [isAnimating, setIsAnimating] = useState<ReactionType | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout>();

  // Close picker on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showPicker]);

  const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0);
  const topReactions = reactions
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const handleQuickReact = () => {
    if (userReaction) {
      // Remove reaction
      onReact(null);
    } else {
      // Add heart reaction
      setIsAnimating("heart");
      setTimeout(() => setIsAnimating(null), 500);
      onReact("heart");
    }
  };

  const handleLongPressStart = () => {
    longPressTimer.current = setTimeout(() => {
      setShowPicker(true);
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleSelectReaction = (type: ReactionType) => {
    setIsAnimating(type);
    setTimeout(() => setIsAnimating(null), 500);
    onReact(type === userReaction ? null : type);
    setShowPicker(false);
  };

  const getUserReactionEmoji = () => {
    if (!userReaction) return "🤍";
    return REACTIONS.find((r) => r.type === userReaction)?.emoji || "❤️";
  };

  return (
    <div className={cn("relative", className)}>
      {/* Main Reaction Button */}
      <button
        ref={buttonRef}
        onClick={handleQuickReact}
        onMouseDown={handleLongPressStart}
        onMouseUp={handleLongPressEnd}
        onMouseLeave={handleLongPressEnd}
        onTouchStart={handleLongPressStart}
        onTouchEnd={handleLongPressEnd}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowPicker(true);
        }}
        className={cn(
          "flex items-center gap-2 transition-all",
          compact
            ? "text-sm"
            : "rounded-full px-3 py-1.5 hover:bg-accent",
          userReaction && "text-primary"
        )}
      >
        <span
          className={cn(
            "text-lg transition-transform",
            isAnimating && "animate-bounce"
          )}
        >
          {getUserReactionEmoji()}
        </span>
        
        {!compact && (
          <>
            {/* Show top reactions */}
            {topReactions.length > 0 && (
              <div className="flex -space-x-1">
                {topReactions.map((r) => (
                  <span
                    key={r.type}
                    className="text-sm"
                    title={`${r.count} ${REACTIONS.find((x) => x.type === r.type)?.label}`}
                  >
                    {REACTIONS.find((x) => x.type === r.type)?.emoji}
                  </span>
                ))}
              </div>
            )}
            
            {totalReactions > 0 && (
              <span className="text-sm text-muted-foreground">
                {totalReactions}
              </span>
            )}
          </>
        )}
      </button>

      {/* Reaction Picker */}
      {showPicker && (
        <div
          ref={pickerRef}
          className="absolute bottom-full left-0 mb-2 flex gap-1 rounded-full bg-card p-2 shadow-xl border animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2"
        >
          {REACTIONS.map((reaction) => (
            <button
              key={reaction.type}
              onClick={() => handleSelectReaction(reaction.type)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full text-2xl transition-all hover:scale-125 hover:bg-accent",
                userReaction === reaction.type && "bg-primary/10 scale-110"
              )}
              title={reaction.label}
            >
              {reaction.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Display reaction summary (for showing under photos in grid)
 */
interface ReactionSummaryProps {
  reactions: ReactionCount[];
  className?: string;
}

export function ReactionSummary({ reactions, className }: ReactionSummaryProps) {
  const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0);
  const topReactions = reactions
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  if (totalReactions === 0) return null;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex -space-x-1">
        {topReactions.map((r) => (
          <span key={r.type} className="text-xs">
            {REACTIONS.find((x) => x.type === r.type)?.emoji}
          </span>
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{totalReactions}</span>
    </div>
  );
}
