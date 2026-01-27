"use client";

import { Download, Share2, Trash2, Flag, Copy, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhotoContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  isLiked?: boolean;
  isOwner?: boolean;
  onClose: () => void;
  onLike?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onCopyLink?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
}

export function PhotoContextMenu({
  isOpen,
  position,
  isLiked,
  isOwner,
  onClose,
  onLike,
  onDownload,
  onShare,
  onCopyLink,
  onDelete,
  onReport,
}: PhotoContextMenuProps) {
  if (!isOpen) return null;

  const menuItems = [
    {
      icon: Heart,
      label: isLiked ? "Gefällt mir nicht mehr" : "Gefällt mir",
      onClick: onLike,
      className: isLiked ? "text-red-500" : "",
    },
    {
      icon: Download,
      label: "Herunterladen",
      onClick: onDownload,
    },
    {
      icon: Share2,
      label: "Teilen",
      onClick: onShare,
    },
    {
      icon: Copy,
      label: "Link kopieren",
      onClick: onCopyLink,
    },
    ...(isOwner
      ? [
          {
            icon: Trash2,
            label: "Löschen",
            onClick: onDelete,
            className: "text-destructive",
          },
        ]
      : [
          {
            icon: Flag,
            label: "Melden",
            onClick: onReport,
            className: "text-muted-foreground",
          },
        ]),
  ];

  // Adjust position to stay within viewport
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 200),
    y: Math.min(position.y, window.innerHeight - menuItems.length * 48 - 20),
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />

      {/* Menu */}
      <div
        className="fixed z-50 min-w-48 rounded-xl border bg-card p-1 shadow-xl animate-in fade-in-0 zoom-in-95"
        style={{
          left: adjustedPosition.x,
          top: adjustedPosition.y,
        }}
      >
        {menuItems.map((item, index) => (
          <button
            key={index}
            onClick={() => {
              item.onClick?.();
              onClose();
            }}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-accent",
              item.className
            )}
          >
            <item.icon className={cn("h-4 w-4", item.className)} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}
