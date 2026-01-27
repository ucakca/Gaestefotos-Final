"use client";

import { useState } from "react";
import {
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Camera,
  Heart,
  Sparkles,
  Music,
  Utensils,
  PartyPopper,
  Church,
  Cake,
  Gift,
  MoreHorizontal,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const iconOptions = [
  { id: "camera", icon: Camera, label: "Kamera" },
  { id: "heart", icon: Heart, label: "Herz" },
  { id: "sparkles", icon: Sparkles, label: "Sterne" },
  { id: "music", icon: Music, label: "Musik" },
  { id: "utensils", icon: Utensils, label: "Essen" },
  { id: "party", icon: PartyPopper, label: "Party" },
  { id: "church", icon: Church, label: "Kirche" },
  { id: "cake", icon: Cake, label: "Kuchen" },
  { id: "gift", icon: Gift, label: "Geschenk" },
];

interface Category {
  id: string;
  name: string;
  icon: string;
  photoCount: number;
  visible: boolean;
  locked: boolean;
  unlockDate?: string;
}

const demoCategories: Category[] = [
  { id: "1", name: "Trauung", icon: "church", photoCount: 45, visible: true, locked: false },
  { id: "2", name: "Sektempfang", icon: "sparkles", photoCount: 32, visible: true, locked: false },
  { id: "3", name: "Dinner", icon: "utensils", photoCount: 28, visible: true, locked: false },
  { id: "4", name: "Party", icon: "party", photoCount: 51, visible: true, locked: false },
  { id: "5", name: "Hochzeitstorte", icon: "cake", photoCount: 12, visible: true, locked: true, unlockDate: "2026-02-15T18:00" },
  { id: "6", name: "Getting Ready", icon: "heart", photoCount: 0, visible: false, locked: true, unlockDate: "2026-02-16T00:00" },
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>(demoCategories);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const getIconComponent = (iconId: string) => {
    const iconOption = iconOptions.find((opt) => opt.id === iconId);
    return iconOption?.icon || Camera;
  };

  const handleSaveCategory = (category: Category) => {
    if (editingCategory) {
      setCategories((prev) =>
        prev.map((c) => (c.id === category.id ? category : c))
      );
    } else {
      setCategories((prev) => [
        ...prev,
        { ...category, id: String(Date.now()), photoCount: 0 },
      ]);
    }
    setIsDialogOpen(false);
    setEditingCategory(null);
  };

  const handleDeleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const toggleVisibility = (id: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c))
    );
  };

  const toggleLock = (id: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, locked: !c.locked } : c))
    );
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alben / Kategorien</h1>
          <p className="text-muted-foreground text-sm">
            {categories.length} Kategorien verwalten
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingCategory(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Neue Kategorie
            </Button>
          </DialogTrigger>
          <CategoryDialog
            category={editingCategory}
            onSave={handleSaveCategory}
            onClose={() => {
              setIsDialogOpen(false);
              setEditingCategory(null);
            }}
          />
        </Dialog>
      </div>

      {/* Category List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Kategorien sortieren</CardTitle>
          <p className="text-sm text-muted-foreground">
            Ziehe die Kategorien um die Reihenfolge zu ändern
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {categories.map((category) => {
              const IconComponent = getIconComponent(category.icon);
              return (
                <div
                  key={category.id}
                  className="flex items-center gap-3 px-4 lg:px-6 py-3 hover:bg-muted/50 transition-colors"
                >
                  {/* Drag Handle */}
                  <button className="cursor-grab text-muted-foreground hover:text-foreground">
                    <GripVertical className="h-5 w-5" />
                  </button>

                  {/* Icon */}
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <IconComponent className="h-5 w-5 text-primary" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{category.name}</h3>
                      {!category.visible && (
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          Versteckt
                        </span>
                      )}
                      {category.locked && (
                        <span className="text-xs text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          Gesperrt
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {category.photoCount} Fotos
                      {category.unlockDate && (
                        <span className="ml-2">
                          | Freigabe: {new Date(category.unlockDate).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 bg-transparent",
                        category.visible ? "text-green-600" : "text-muted-foreground"
                      )}
                      onClick={() => toggleVisibility(category.id)}
                    >
                      {category.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 bg-transparent",
                        category.locked ? "text-yellow-600" : "text-muted-foreground"
                      )}
                      onClick={() => toggleLock(category.id)}
                    >
                      {category.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 bg-transparent">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingCategory(category);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Bearbeiten
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDeleteCategory(category.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Löschen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Category Dialog Component
function CategoryDialog({
  category,
  onSave,
  onClose,
}: {
  category: Category | null;
  onSave: (category: Category) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(category?.name || "");
  const [selectedIcon, setSelectedIcon] = useState(category?.icon || "camera");
  const [visible, setVisible] = useState(category?.visible ?? true);
  const [locked, setLocked] = useState(category?.locked ?? false);
  const [unlockDate, setUnlockDate] = useState(category?.unlockDate || "");

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: category?.id || "",
      name: name.trim(),
      icon: selectedIcon,
      photoCount: category?.photoCount || 0,
      visible,
      locked,
      unlockDate: locked ? unlockDate : undefined,
    });
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>
          {category ? "Kategorie bearbeiten" : "Neue Kategorie"}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Trauung"
          />
        </div>

        {/* Icon Picker */}
        <div className="space-y-2">
          <Label>Icon</Label>
          <div className="grid grid-cols-5 gap-2">
            {iconOptions.map((option) => {
              const IconComponent = option.icon;
              return (
                <button
                  key={option.id}
                  onClick={() => setSelectedIcon(option.id)}
                  className={cn(
                    "h-10 w-10 rounded-lg border flex items-center justify-center transition-colors",
                    selectedIcon === option.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <IconComponent className="h-5 w-5" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Visibility Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Sichtbar für Gäste</Label>
            <p className="text-xs text-muted-foreground">
              Kategorie in der Gäste-App anzeigen
            </p>
          </div>
          <Switch checked={visible} onCheckedChange={setVisible} />
        </div>

        {/* Lock Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Upload sperren</Label>
            <p className="text-xs text-muted-foreground">
              Uploads bis zum Freigabedatum blockieren
            </p>
          </div>
          <Switch checked={locked} onCheckedChange={setLocked} />
        </div>

        {/* Unlock Date */}
        {locked && (
          <div className="space-y-2">
            <Label htmlFor="unlockDate">Freigabedatum</Label>
            <Input
              id="unlockDate"
              type="datetime-local"
              value={unlockDate}
              onChange={(e) => setUnlockDate(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Abbrechen
        </Button>
        <Button onClick={handleSave} disabled={!name.trim()}>
          Speichern
        </Button>
      </div>
    </DialogContent>
  );
}
