"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  BookOpen, 
  Search, 
  MoreVertical, 
  Trash2, 
  Eye, 
  EyeOff,
  Heart,
  MessageCircle,
  Download,
  Filter,
} from "lucide-react";

// Demo data
const demoEntries = [
  {
    id: "1",
    author: "Maria & Thomas",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80",
    message: "Was für ein wundervoller Tag! Wir wünschen euch alles Glück der Welt. Die Trauung war so emotional und das Essen fantastisch. Danke für diesen unvergesslichen Abend!",
    createdAt: "vor 2 Stunden",
    likes: 12,
    isVisible: true,
    hasPhoto: true,
  },
  {
    id: "2",
    author: "Familie Müller",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80",
    message: "Herzlichen Glückwunsch zur Hochzeit! Möge eure Liebe so stark bleiben wie an diesem besonderen Tag.",
    createdAt: "vor 5 Stunden",
    likes: 8,
    isVisible: true,
    hasPhoto: false,
  },
  {
    id: "3",
    author: "Oma Hildegard",
    avatar: null,
    message: "Meine lieben Enkelkinder, ich bin so stolz auf euch! Gottes Segen für euren gemeinsamen Weg.",
    createdAt: "vor 1 Tag",
    likes: 24,
    isVisible: true,
    hasPhoto: false,
  },
  {
    id: "4",
    author: "Unbekannt",
    avatar: null,
    message: "Spam Nachricht...",
    createdAt: "vor 1 Tag",
    likes: 0,
    isVisible: false,
    hasPhoto: false,
  },
];

export default function GuestbookPage() {
  const [entries, setEntries] = useState(demoEntries);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVisible, setFilterVisible] = useState<"all" | "visible" | "hidden">("all");

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch = 
      entry.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = 
      filterVisible === "all" ||
      (filterVisible === "visible" && entry.isVisible) ||
      (filterVisible === "hidden" && !entry.isVisible);

    return matchesSearch && matchesFilter;
  });

  const toggleVisibility = (id: string) => {
    setEntries(entries.map((entry) =>
      entry.id === id ? { ...entry, isVisible: !entry.isVisible } : entry
    ));
  };

  const deleteEntry = (id: string) => {
    setEntries(entries.filter((entry) => entry.id !== id));
  };

  const visibleCount = entries.filter((e) => e.isVisible).length;
  const hiddenCount = entries.filter((e) => !e.isVisible).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gästebuch</h1>
          <p className="text-muted-foreground">
            {entries.length} Eintraege insgesamt
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportieren
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{entries.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">Eintraege</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{visibleCount}</span>
            </div>
            <p className="text-xs text-muted-foreground">Sichtbar</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {entries.reduce((sum, e) => sum + e.likes, 0)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Likes</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Eintraege durchsuchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              {filterVisible === "all" ? "Alle" : filterVisible === "visible" ? "Sichtbar" : "Versteckt"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setFilterVisible("all")}>
              Alle ({entries.length})
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterVisible("visible")}>
              Sichtbar ({visibleCount})
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterVisible("hidden")}>
              Versteckt ({hiddenCount})
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Entries */}
      <div className="space-y-4">
        {filteredEntries.map((entry) => (
          <Card key={entry.id} className={!entry.isVisible ? "opacity-60" : ""}>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {entry.avatar ? (
                    <div className="relative h-12 w-12 rounded-full overflow-hidden">
                      <Image
                        src={entry.avatar || "/placeholder.svg"}
                        alt={entry.author}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">
                        {entry.author.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{entry.author}</p>
                        {!entry.isVisible && (
                          <Badge variant="secondary" className="text-xs">
                            <EyeOff className="h-3 w-3 mr-1" />
                            Versteckt
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{entry.createdAt}</p>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 bg-transparent">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toggleVisibility(entry.id)}>
                          {entry.isVisible ? (
                            <>
                              <EyeOff className="h-4 w-4 mr-2" />
                              Verstecken
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-2" />
                              Anzeigen
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => deleteEntry(entry.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Löschen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <p className="mt-2 text-sm leading-relaxed">{entry.message}</p>

                  <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {entry.likes} Likes
                    </span>
                    {entry.hasPhoto && (
                      <Badge variant="outline" className="text-xs">
                        Mit Foto
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredEntries.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">Keine Eintraege gefunden</p>
          </div>
        )}
      </div>
    </div>
  );
}
