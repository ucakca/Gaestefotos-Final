"use client";

import { useState } from "react";
import Image from "next/image";
import { Send, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface GuestbookEntry {
  id: string;
  name: string;
  avatar?: string;
  message: string;
  timestamp: string;
  likes: number;
  isLiked: boolean;
}

const demoEntries: GuestbookEntry[] = [
  {
    id: "1",
    name: "Anna & Peter",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
    message: "Was für ein wunderschöner Tag! Wir wünschen euch alles Glück der Welt auf eurem gemeinsamen Weg. Die Liebe zwischen euch beiden strahlt so hell!",
    timestamp: "Vor 2 Stunden",
    likes: 12,
    isLiked: true,
  },
  {
    id: "2",
    name: "Familie Müller",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    message: "Herzlichen Glückwunsch zur Hochzeit! Möge eure Liebe mit jedem Tag stärker werden.",
    timestamp: "Vor 3 Stunden",
    likes: 8,
    isLiked: false,
  },
  {
    id: "3",
    name: "Julia",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80",
    message: "Beste Freundin, ich bin so stolz auf dich! Ihr seid das perfekte Paar.",
    timestamp: "Vor 5 Stunden",
    likes: 15,
    isLiked: false,
  },
];

export function GuestbookTab() {
  const [entries, setEntries] = useState(demoEntries);
  const [newMessage, setNewMessage] = useState("");
  const [authorName, setAuthorName] = useState("");

  const handleSubmit = () => {
    if (!newMessage.trim() || !authorName.trim()) return;

    const newEntry: GuestbookEntry = {
      id: Date.now().toString(),
      name: authorName,
      message: newMessage,
      timestamp: "Gerade eben",
      likes: 0,
      isLiked: false,
    };

    setEntries([newEntry, ...entries]);
    setNewMessage("");
    setAuthorName("");
  };

  const handleLike = (entryId: string) => {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              isLiked: !entry.isLiked,
              likes: entry.isLiked ? entry.likes - 1 : entry.likes + 1,
            }
          : entry
      )
    );
  };

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold">Gästebuch</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hinterlasst eine liebevolle Nachricht für das Brautpaar
        </p>
      </div>

      {/* New Entry Form */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Input
            placeholder="Dein Name"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
          />
          <Textarea
            placeholder="Schreibe eine Nachricht..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            rows={3}
          />
          <Button
            onClick={handleSubmit}
            disabled={!newMessage.trim() || !authorName.trim()}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            Nachricht senden
          </Button>
        </CardContent>
      </Card>

      {/* Entries List */}
      <div className="space-y-4">
        {entries.map((entry) => (
          <Card key={entry.id}>
            <CardContent className="p-4">
              <div className="flex gap-3">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {entry.avatar ? (
                    <div className="relative h-10 w-10 overflow-hidden rounded-full">
                      <Image
                        src={entry.avatar || "/placeholder.svg"}
                        alt={entry.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      {entry.name.charAt(0)}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{entry.name}</h3>
                    <span className="text-xs text-muted-foreground">
                      {entry.timestamp}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    {entry.message}
                  </p>

                  {/* Like Button */}
                  <button
                    onClick={() => handleLike(entry.id)}
                    className={cn(
                      "mt-2 flex items-center gap-1.5 text-sm transition-colors",
                      entry.isLiked
                        ? "text-primary"
                        : "text-muted-foreground hover:text-primary"
                    )}
                  >
                    <Heart
                      className={cn(
                        "h-4 w-4",
                        entry.isLiked && "fill-current"
                      )}
                    />
                    <span>{entry.likes}</span>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
