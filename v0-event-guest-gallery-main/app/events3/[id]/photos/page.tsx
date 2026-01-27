"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  Trash2,
  FolderOpen,
  MoreHorizontal,
  Check,
  X,
  Heart,
  MessageCircle,
  Upload,
  Grid3X3,
  List,
  SlidersHorizontal,
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

type PhotoStatus = "approved" | "pending" | "rejected";

interface Photo {
  id: string;
  src: string;
  uploader: string;
  uploaderAvatar: string;
  uploadedAt: string;
  status: PhotoStatus;
  category: string;
  likes: number;
  comments: number;
}

// Demo photos
const demoPhotos: Photo[] = [
  { id: "1", src: "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&q=80", uploader: "Anna Müller", uploaderAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&q=80", uploadedAt: "vor 2 Min.", status: "pending", category: "Trauung", likes: 12, comments: 3 },
  { id: "2", src: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&q=80", uploader: "Max Schmidt", uploaderAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&q=80", uploadedAt: "vor 15 Min.", status: "approved", category: "Feier", likes: 24, comments: 5 },
  { id: "3", src: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=400&q=80", uploader: "Lisa Weber", uploaderAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&q=80", uploadedAt: "vor 1 Std.", status: "approved", category: "Tanzen", likes: 18, comments: 2 },
  { id: "4", src: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=400&q=80", uploader: "Tom Bauer", uploaderAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&q=80", uploadedAt: "vor 2 Std.", status: "rejected", category: "Trauung", likes: 5, comments: 0 },
  { id: "5", src: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400&q=80", uploader: "Julia Kern", uploaderAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=50&q=80", uploadedAt: "vor 3 Std.", status: "pending", category: "Feier", likes: 8, comments: 1 },
  { id: "6", src: "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=400&q=80", uploader: "Peter Klein", uploaderAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=50&q=80", uploadedAt: "vor 4 Std.", status: "approved", category: "Tanzen", likes: 32, comments: 7 },
  { id: "7", src: "https://images.unsplash.com/photo-1460978812857-470ed1c77af0?w=400&q=80", uploader: "Sarah Wolf", uploaderAvatar: "https://images.unsplash.com/photo-1544005313929-80b456fea0bc?w=50&q=80", uploadedAt: "vor 5 Std.", status: "approved", category: "Trauung", likes: 45, comments: 12 },
  { id: "8", src: "https://images.unsplash.com/photo-1507504031003-b417219a0fde?w=400&q=80", uploader: "Mark Roth", uploaderAvatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=50&q=80", uploadedAt: "vor 6 Std.", status: "pending", category: "Feier", likes: 15, comments: 4 },
];

const categories = ["Alle", "Trauung", "Feier", "Tanzen"];

export default function PhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>(demoPhotos);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("Alle");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filteredPhotos = useMemo(() => {
    return photos.filter((photo) => {
      const matchesSearch = photo.uploader.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || photo.status === statusFilter;
      const matchesCategory = categoryFilter === "Alle" || photo.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [photos, searchQuery, statusFilter, categoryFilter]);

  const toggleSelectPhoto = (id: string) => {
    setSelectedPhotos((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedPhotos.length === filteredPhotos.length) {
      setSelectedPhotos([]);
    } else {
      setSelectedPhotos(filteredPhotos.map((p) => p.id));
    }
  };

  const handleBulkAction = (action: "approve" | "reject" | "delete") => {
    if (action === "delete") {
      setPhotos((prev) => prev.filter((p) => !selectedPhotos.includes(p.id)));
    } else {
      setPhotos((prev) =>
        prev.map((p) =>
          selectedPhotos.includes(p.id)
            ? { ...p, status: action === "approve" ? "approved" : "rejected" }
            : p
        )
      );
    }
    setSelectedPhotos([]);
  };

  const handleSingleAction = (id: string, action: "approve" | "reject" | "delete") => {
    if (action === "delete") {
      setPhotos((prev) => prev.filter((p) => p.id !== id));
    } else {
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, status: action === "approve" ? "approved" : "rejected" } : p
        )
      );
    }
  };

  const statusCounts = useMemo(() => {
    return {
      all: photos.length,
      approved: photos.filter((p) => p.status === "approved").length,
      pending: photos.filter((p) => p.status === "pending").length,
      rejected: photos.filter((p) => p.status === "rejected").length,
    };
  }, [photos]);

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fotos</h1>
          <p className="text-muted-foreground text-sm">
            {photos.length} Fotos verwalten
          </p>
        </div>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Fotos hochladen
        </Button>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nach Uploader suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle ({statusCounts.all})</SelectItem>
                  <SelectItem value="approved">Genehmigt ({statusCounts.approved})</SelectItem>
                  <SelectItem value="pending">Ausstehend ({statusCounts.pending})</SelectItem>
                  <SelectItem value="rejected">Abgelehnt ({statusCounts.rejected})</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Kategorie" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="rounded-r-none"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  className="rounded-l-none"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Action Bar */}
      {selectedPhotos.length > 0 && (
        <Card className="border-primary">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedPhotos.length === filteredPhotos.length}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm font-medium">
                  {selectedPhotos.length} ausgewaehlt
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction("approve")}
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  Genehmigen
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction("reject")}
                  className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                >
                  <XCircle className="mr-1.5 h-4 w-4" />
                  Ablehnen
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction("delete")}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Löschen
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="mr-1.5 h-4 w-4" />
                  Download
                </Button>
                <Button variant="outline" size="sm">
                  <FolderOpen className="mr-1.5 h-4 w-4" />
                  Verschieben
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photo Grid */}
      <div className={cn(
        viewMode === "grid"
          ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
          : "space-y-2"
      )}>
        {filteredPhotos.map((photo) => (
          viewMode === "grid" ? (
            <PhotoCard
              key={photo.id}
              photo={photo}
              isSelected={selectedPhotos.includes(photo.id)}
              onSelect={() => toggleSelectPhoto(photo.id)}
              onAction={handleSingleAction}
            />
          ) : (
            <PhotoRow
              key={photo.id}
              photo={photo}
              isSelected={selectedPhotos.includes(photo.id)}
              onSelect={() => toggleSelectPhoto(photo.id)}
              onAction={handleSingleAction}
            />
          )
        ))}
      </div>

      {filteredPhotos.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Keine Fotos gefunden</p>
        </div>
      )}
    </div>
  );
}

// Photo Card Component (Grid View)
function PhotoCard({
  photo,
  isSelected,
  onSelect,
  onAction,
}: {
  photo: Photo;
  isSelected: boolean;
  onSelect: () => void;
  onAction: (id: string, action: "approve" | "reject" | "delete") => void;
}) {
  return (
    <Card className={cn(
      "overflow-hidden group relative",
      isSelected && "ring-2 ring-primary"
    )}>
      <div className="relative aspect-square">
        <Image
          src={photo.src || "/placeholder.svg"}
          alt={`Foto von ${photo.uploader}`}
          fill
          className="object-cover"
        />
        
        {/* Overlay on Hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
        
        {/* Checkbox */}
        <div className={cn(
          "absolute top-2 left-2 transition-opacity",
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            className="bg-white/90 border-white"
          />
        </div>

        {/* Status Badge */}
        <div className="absolute top-2 right-2">
          <StatusBadge status={photo.status} />
        </div>

        {/* Quick Actions on Hover */}
        <div className="absolute bottom-2 left-2 right-2 flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {photo.status !== "approved" && (
            <Button
              size="sm"
              variant="secondary"
              className="h-7 px-2 text-xs"
              onClick={() => onAction(photo.id, "approve")}
            >
              <Check className="h-3 w-3" />
            </Button>
          )}
          {photo.status !== "rejected" && (
            <Button
              size="sm"
              variant="secondary"
              className="h-7 px-2 text-xs"
              onClick={() => onAction(photo.id, "reject")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            className="h-7 px-2 text-xs"
            onClick={() => onAction(photo.id, "delete")}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <CardContent className="p-2">
        <div className="flex items-center gap-2">
          <div className="relative h-5 w-5 rounded-full overflow-hidden flex-shrink-0">
            <Image
              src={photo.uploaderAvatar || "/placeholder.svg"}
              alt={photo.uploader}
              fill
              className="object-cover"
            />
          </div>
          <span className="text-xs truncate">{photo.uploader}</span>
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <Heart className="h-3 w-3" /> {photo.likes}
          </span>
          <span className="flex items-center gap-0.5">
            <MessageCircle className="h-3 w-3" /> {photo.comments}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// Photo Row Component (List View)
function PhotoRow({
  photo,
  isSelected,
  onSelect,
  onAction,
}: {
  photo: Photo;
  isSelected: boolean;
  onSelect: () => void;
  onAction: (id: string, action: "approve" | "reject" | "delete") => void;
}) {
  return (
    <Card className={cn(isSelected && "ring-2 ring-primary")}>
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <Checkbox checked={isSelected} onCheckedChange={onSelect} />
          <div className="relative h-12 w-12 rounded overflow-hidden flex-shrink-0">
            <Image
              src={photo.src || "/placeholder.svg"}
              alt={`Foto von ${photo.uploader}`}
              fill
              className="object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="relative h-5 w-5 rounded-full overflow-hidden flex-shrink-0">
                <Image
                  src={photo.uploaderAvatar || "/placeholder.svg"}
                  alt={photo.uploader}
                  fill
                  className="object-cover"
                />
              </div>
              <span className="text-sm font-medium truncate">{photo.uploader}</span>
              <StatusBadge status={photo.status} />
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
              <span>{photo.category}</span>
              <span>{photo.uploadedAt}</span>
              <span className="flex items-center gap-0.5">
                <Heart className="h-3 w-3" /> {photo.likes}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {photo.status !== "approved" && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 bg-transparent"
                onClick={() => onAction(photo.id, "approve")}
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            )}
            {photo.status !== "rejected" && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 bg-transparent"
                onClick={() => onAction(photo.id, "reject")}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 bg-transparent">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Download className="mr-2 h-4 w-4" /> Download
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FolderOpen className="mr-2 h-4 w-4" /> Verschieben
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => onAction(photo.id, "delete")}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Löschen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: PhotoStatus }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "text-[10px] px-1.5 py-0",
        status === "approved" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        status === "pending" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
        status === "rejected" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      )}
    >
      {status === "approved" && "Genehmigt"}
      {status === "pending" && "Ausstehend"}
      {status === "rejected" && "Abgelehnt"}
    </Badge>
  );
}
