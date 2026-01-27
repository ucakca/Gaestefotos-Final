"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface ProfileAvatarProps {
  src: string;
  alt: string;
  size?: "sm" | "md" | "lg" | "xl";
  hasStory?: boolean;
  isViewed?: boolean;
  onClick?: () => void;
  className?: string;
}

const sizeClasses = {
  sm: "h-10 w-10",
  md: "h-14 w-14",
  lg: "h-20 w-20",
  xl: "h-28 w-28",
};

const ringClasses = {
  sm: "p-0.5",
  md: "p-0.5",
  lg: "p-1",
  xl: "p-1",
};

export function ProfileAvatar({
  src,
  alt,
  size = "md",
  hasStory = false,
  isViewed = false,
  onClick,
  className,
}: ProfileAvatarProps) {
  return (
    <button
      onClick={onClick}
      className={cn("group relative flex-shrink-0", className)}
      aria-label={alt}
    >
      {/* Gradient Ring for Stories */}
      {hasStory && (
        <div
          className={cn(
            "absolute -inset-0.5 rounded-full transition-opacity",
            isViewed
              ? "bg-muted-foreground/30"
              : "bg-gradient-to-tr from-primary via-red-400 to-orange-400"
          )}
        />
      )}
      
      <div className={cn("relative rounded-full bg-background", ringClasses[size])}>
        <div
          className={cn(
            "relative overflow-hidden rounded-full",
            sizeClasses[size]
          )}
        >
          <Image
            src={src || "/placeholder.svg"}
            alt={alt}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      </div>
    </button>
  );
}
