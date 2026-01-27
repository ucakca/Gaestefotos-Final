"use client";

import { Home, Trophy, BookOpen, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "feed" | "challenges" | "guestbook" | "info";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  className?: string;
}

const tabs: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "feed", label: "Feed", icon: Home },
  { id: "challenges", label: "Challenges", icon: Trophy },
  { id: "guestbook", label: "Gästebuch", icon: BookOpen },
  { id: "info", label: "Info", icon: Info },
];

export function BottomNav({ activeTab, onTabChange, className }: BottomNavProps) {
  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur-xl safe-area-bottom",
        className
      )}
    >
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-transform",
                  isActive && "scale-110"
                )}
              />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
