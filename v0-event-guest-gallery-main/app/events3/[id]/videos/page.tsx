"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import {
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  Trash2,
  FolderOpen,
  MoreHorizontal,
  Check,
  X,
  Play,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type VideoStatus = "approved" | "pending" | "rejected";

interface Video {
  id: string;
  thumbnail: string;
  uploader: string;
  uploaderAvatar: string;
  uploadedAt: string;
  status: VideoStatus;
  category: string;
  duration: string;
  size: string;
}

// Demo videos
const demoVideos: Video[] = [
  { id: "1", thumbnail: "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&q=80", uploader: "Anna Müller", uploaderAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&q=80", uploadedAt: "vor 2 Min.", status: "pending", category: "Trauung", duration: "0:45", size: "12 MB" },
  { id: "2", thumbnail: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&q=80", uploader: "Max Schmidt", uploaderAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&q=80", uploadedAt: "vor 15 Min.", status: "approved", category: "Feier", duration: "1:30", size: "28 MB" },
  { id: "3", thumbnail: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=400&q=80", uploader: "Lisa Weber", uploaderAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&q=80", uploadedAt: "vor 1 Std.", status: "approved", category: "Tanzen", duration: "2:15", size: "45 MB" },
  { id: "4", thumbnail: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=400&q=80", uploader: "Tom Bauer", uploaderAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&q=80", uploadedAt: "vor 2 Std.", status: "rejected", category: "Trauung", duration: "0:30", size: "8 MB" },
];

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>(demoVideos);
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredVideos = useMemo(() => {
    return videos.filter((video) => {
      const matchesSearch = video.uploader.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || video.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [videos, searchQuery, statusFilter]);

  const toggleSelectVideo = (id: string) => {
    setSelectedVideos((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const handleBulkAction = (action: "approve" | "reject" | "delete") => {
    if (action === "delete") {
      setVideos((prev) => prev.filter((v) => !selectedVideos.includes(v.id)));
    } else {
      setVideos((prev) =>
        prev.map((v) =>
          selectedVideos.includes(v.id)
            ? { ...v, status: action === "approve" ? "approved" : "rejected" }
            : v
        )
      );
    }
    setSelectedVideos([]);
  };

  const handleSingleAction = (id: string, action: "approve" | "reject" | "delete") => {
    if (action === "delete") {
      setVideos((prev) => prev.filter((v) => v.id !== id));
    } else {
      setVideos((prev) =>
        prev.map((v) =>
          v.id === id ? { ...v, status: action === "approve" ? "approved" : "rejected" } : v
        )
      );
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Videos</h1>
          <p className="text-muted-foreground text-sm">
            {videos.length} Videos verwalten
          </p>
        </div>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Videos hochladen
        </Button>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nach Uploader suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="approved">Genehmigt</SelectItem>
                <SelectItem value="pending">Ausstehend</SelectItem>
                <SelectItem value="rejected">Abgelehnt</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Action Bar */}
      {selectedVideos.length > 0 && (
        <Card className="border-primary">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">
                {selectedVideos.length} ausgewaehlt
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction("approve")}
                  className="text-green-600"
                >
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  Genehmigen
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction("reject")}
                  className="text-yellow-600"
                >
                  <XCircle className="mr-1.5 h-4 w-4" />
                  Ablehnen
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction("delete")}
                  className="text-red-600"
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Löschen
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Video Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredVideos.map((video) => (
          <Card
            key={video.id}
            className={cn(
              "overflow-hidden group relative",
              selectedVideos.includes(video.id) && "ring-2 ring-primary"
            )}
          >
            <div className="relative aspect-video">
              <Image
                src={video.thumbnail || "/placeholder.svg"}
                alt={`Video von ${video.uploader}`}
                fill
                className="object-cover"
              />
              
              {/* Play Button Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors">
                <div className="h-12 w-12 rounded-full bg-white/90 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                  <Play className="h-5 w-5 text-black ml-0.5" fill="black" />
                </div>
              </div>

              {/* Duration Badge */}
              <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 rounded text-white text-xs font-medium">
                {video.duration}
              </div>

              {/* Checkbox */}
              <div className={cn(
                "absolute top-2 left-2 transition-opacity",
                selectedVideos.includes(video.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}>
                <Checkbox
                  checked={selectedVideos.includes(video.id)}
                  onCheckedChange={() => toggleSelectVideo(video.id)}
                  className="bg-white/90 border-white"
                />
              </div>

              {/* Status Badge */}
              <div className="absolute top-2 right-2">
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px] px-1.5 py-0",
                    video.status === "approved" && "bg-green-100 text-green-700",
                    video.status === "pending" && "bg-yellow-100 text-yellow-700",
                    video.status === "rejected" && "bg-red-100 text-red-700"
                  )}
                >
                  {video.status === "approved" && "Genehmigt"}
                  {video.status === "pending" && "Ausstehend"}
                  {video.status === "rejected" && "Abgelehnt"}
                </Badge>
              </div>
            </div>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative h-6 w-6 rounded-full overflow-hidden flex-shrink-0">
                    <Image
                      src={video.uploaderAvatar || "/placeholder.svg"}
                      alt={video.uploader}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{video.uploader}</p>
                    <p className="text-xs text-muted-foreground">{video.size}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 bg-transparent">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {video.status !== "approved" && (
                      <DropdownMenuItem onClick={() => handleSingleAction(video.id, "approve")}>
                        <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" /> Genehmigen
                      </DropdownMenuItem>
                    )}
                    {video.status !== "rejected" && (
                      <DropdownMenuItem onClick={() => handleSingleAction(video.id, "reject")}>
                        <XCircle className="mr-2 h-4 w-4 text-yellow-600" /> Ablehnen
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem>
                      <Download className="mr-2 h-4 w-4" /> Download
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => handleSingleAction(video.id, "delete")}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Löschen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredVideos.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Keine Videos gefunden</p>
        </div>
      )}
    </div>
  );
}
