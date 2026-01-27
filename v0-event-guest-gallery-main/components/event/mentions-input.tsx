"use client";

import React from "react"

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  name: string;
  avatar?: string;
}

interface MentionsInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  users: User[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MentionsInput({
  value,
  onChange,
  onSubmit,
  users,
  placeholder = "Kommentar schreiben...",
  className,
  disabled = false,
}: MentionsInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Find mention trigger and filter users
  const checkForMention = useCallback(
    (text: string, cursorPos: number) => {
      // Look backwards from cursor for @
      let start = cursorPos - 1;
      while (start >= 0 && text[start] !== " " && text[start] !== "\n") {
        if (text[start] === "@") {
          const query = text.slice(start + 1, cursorPos).toLowerCase();
          const filtered = users.filter((user) =>
            user.name.toLowerCase().includes(query)
          );
          if (filtered.length > 0) {
            setFilteredUsers(filtered);
            setMentionStart(start);
            setShowSuggestions(true);
            setSuggestionIndex(0);
            return;
          }
        }
        start--;
      }
      setShowSuggestions(false);
      setMentionStart(null);
    },
    [users]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    checkForMention(newValue, e.target.selectionStart || 0);
  };

  const insertMention = (user: User) => {
    if (mentionStart === null || !inputRef.current) return;

    const cursorPos = inputRef.current.selectionStart || 0;
    const before = value.slice(0, mentionStart);
    const after = value.slice(cursorPos);
    const newValue = `${before}@${user.name} ${after}`;

    onChange(newValue);
    setShowSuggestions(false);
    setMentionStart(null);

    // Focus and set cursor position
    setTimeout(() => {
      if (inputRef.current) {
        const newPos = mentionStart + user.name.length + 2;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions && filteredUsers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSuggestionIndex((i) => (i + 1) % filteredUsers.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSuggestionIndex(
          (i) => (i - 1 + filteredUsers.length) % filteredUsers.length
        );
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filteredUsers[suggestionIndex]);
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit?.();
    }
  };

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Render text with highlighted mentions
  const renderHighlightedText = (text: string) => {
    const mentionRegex = /@(\w+)/g;
    const parts = text.split(mentionRegex);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        // This is a mention
        return (
          <span key={i} className="text-primary font-medium">
            @{part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className={cn("relative", className)}>
      <textarea
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className={cn(
          "w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm",
          "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "min-h-[40px] max-h-[120px]"
        )}
        style={{ height: "auto" }}
        onInput={(e) => {
          const target = e.target as HTMLTextAreaElement;
          target.style.height = "auto";
          target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
        }}
      />

      {/* Mention Suggestions */}
      {showSuggestions && filteredUsers.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute bottom-full left-0 right-0 mb-1 max-h-48 overflow-y-auto rounded-lg border bg-card shadow-lg z-50"
        >
          {filteredUsers.map((user, index) => (
            <button
              key={user.id}
              onClick={() => insertMention(user)}
              className={cn(
                "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors",
                index === suggestionIndex
                  ? "bg-accent"
                  : "hover:bg-accent/50"
              )}
            >
              <div className="relative h-8 w-8 overflow-hidden rounded-full bg-muted">
                {user.avatar ? (
                  <Image
                    src={user.avatar || "/placeholder.svg"}
                    alt={user.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-medium text-muted-foreground">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="font-medium">{user.name}</span>
            </button>
          ))}
        </div>
      )}

      <p className="mt-1 text-xs text-muted-foreground">
        Tippe @ um jemanden zu erwaehnen
      </p>
    </div>
  );
}

// Helper to parse mentions from text
export function parseMentions(text: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }
  return mentions;
}

// Helper to render comment text with clickable mentions
export function CommentText({
  text,
  onMentionClick,
}: {
  text: string;
  onMentionClick?: (username: string) => void;
}) {
  const parts = text.split(/(@\w+)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith("@")) {
          const username = part.slice(1);
          return (
            <button
              key={i}
              onClick={() => onMentionClick?.(username)}
              className="text-primary font-medium hover:underline"
            >
              {part}
            </button>
          );
        }
        return part;
      })}
    </span>
  );
}
