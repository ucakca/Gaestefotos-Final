"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Plus,
  Trophy,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  MoreHorizontal,
  Star,
  Camera,
  Users,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Challenge {
  id: string;
  title: string;
  description: string;
  category: string;
  active: boolean;
  visible: boolean;
  submissions: number;
  topSubmissions: { id: string; src: string; rating: number }[];
}

const demoChallenges: Challenge[] = [
  {
    id: "1",
    title: "Bestes Gruppenfoto",
    description: "Macht ein kreatives Gruppenfoto mit mindestens 5 Gästen!",
    category: "Feier",
    active: true,
    visible: true,
    submissions: 12,
    topSubmissions: [
      { id: "1", src: "https://images.unsplash.com/photo-1529543544277-750e0862e43a?w=200&q=80", rating: 5 },
      { id: "2", src: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=200&q=80", rating: 4 },
      { id: "3", src: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=200&q=80", rating: 4 },
    ],
  },
  {
    id: "2",
    title: "Lustigstes Tanzfoto",
    description: "Fangt den witzigsten Tanzmoment ein!",
    category: "Tanzen",
    active: true,
    visible: true,
    submissions: 8,
    topSubmissions: [
      { id: "4", src: "https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=200&q=80", rating: 5 },
      { id: "5", src: "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=200&q=80", rating: 3 },
    ],
  },
  {
    id: "3",
    title: "Schoenstes Tortenfoto",
    description: "Fotografiert die Hochzeitstorte auf kreative Weise!",
    category: "Hochzeitstorte",
    active: false,
    visible: true,
    submissions: 15,
    topSubmissions: [
      { id: "6", src: "https://images.unsplash.com/photo-1519741497674-611481863552?w=200&q=80", rating: 5 },
    ],
  },
  {
    id: "4",
    title: "Selfie mit dem Brautpaar",
    description: "Macht ein Selfie mit Sarah und Max!",
    category: "Trauung",
    active: true,
    visible: false,
    submissions: 0,
    topSubmissions: [],
  },
];

const categories = ["Trauung", "Feier", "Tanzen", "Hochzeitstorte"];

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>(demoChallenges);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSaveChallenge = (challenge: Challenge) => {
    if (editingChallenge) {
      setChallenges((prev) =>
        prev.map((c) => (c.id === challenge.id ? challenge : c))
      );
    } else {
      setChallenges((prev) => [
        ...prev,
        { ...challenge, id: String(Date.now()), submissions: 0, topSubmissions: [] },
      ]);
    }
    setIsDialogOpen(false);
    setEditingChallenge(null);
  };

  const handleDeleteChallenge = (id: string) => {
    setChallenges((prev) => prev.filter((c) => c.id !== id));
  };

  const toggleActive = (id: string) => {
    setChallenges((prev) =>
      prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c))
    );
  };

  const toggleVisible = (id: string) => {
    setChallenges((prev) =>
      prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c))
    );
  };

  const activeChallenges = challenges.filter((c) => c.active);
  const completedChallenges = challenges.filter((c) => !c.active);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Challenges</h1>
          <p className="text-muted-foreground text-sm">
            {challenges.length} Challenges, {activeChallenges.length} aktiv
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingChallenge(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Neue Challenge
            </Button>
          </DialogTrigger>
          <ChallengeDialog
            challenge={editingChallenge}
            onSave={handleSaveChallenge}
            onClose={() => {
              setIsDialogOpen(false);
              setEditingChallenge(null);
            }}
          />
        </Dialog>
      </div>

      {/* Active Challenges */}
      {activeChallenges.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Aktive Challenges
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {activeChallenges.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                onEdit={() => {
                  setEditingChallenge(challenge);
                  setIsDialogOpen(true);
                }}
                onDelete={() => handleDeleteChallenge(challenge.id)}
                onToggleActive={() => toggleActive(challenge.id)}
                onToggleVisible={() => toggleVisible(challenge.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Completed Challenges */}
      {completedChallenges.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-muted-foreground">
            <Clock className="h-5 w-5" />
            Abgeschlossene Challenges
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {completedChallenges.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                onEdit={() => {
                  setEditingChallenge(challenge);
                  setIsDialogOpen(true);
                }}
                onDelete={() => handleDeleteChallenge(challenge.id)}
                onToggleActive={() => toggleActive(challenge.id)}
                onToggleVisible={() => toggleVisible(challenge.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// Challenge Card Component
function ChallengeCard({
  challenge,
  onEdit,
  onDelete,
  onToggleActive,
  onToggleVisible,
}: {
  challenge: Challenge;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onToggleVisible: () => void;
}) {
  return (
    <Card className={cn(!challenge.active && "opacity-60")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              {challenge.title}
              {!challenge.visible && (
                <Badge variant="secondary" className="text-xs">
                  Versteckt
                </Badge>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {challenge.description}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 bg-transparent">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Bearbeiten
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleActive}>
                {challenge.active ? (
                  <>
                    <Clock className="mr-2 h-4 w-4" />
                    Beenden
                  </>
                ) : (
                  <>
                    <Trophy className="mr-2 h-4 w-4" />
                    Aktivieren
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleVisible}>
                {challenge.visible ? (
                  <>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Verstecken
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Anzeigen
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={onDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Löschen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <Camera className="h-4 w-4" />
            {challenge.submissions} Einreichungen
          </span>
          <Badge variant="outline">{challenge.category}</Badge>
        </div>

        {/* Top Submissions Preview */}
        {challenge.topSubmissions.length > 0 && (
          <div className="flex gap-2">
            {challenge.topSubmissions.slice(0, 4).map((submission, index) => (
              <div
                key={submission.id}
                className="relative h-16 w-16 rounded-lg overflow-hidden"
              >
                <Image
                  src={submission.src || "/placeholder.svg"}
                  alt={`Submission ${index + 1}`}
                  fill
                  className="object-cover"
                />
                {index === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-yellow-500/20">
                    <Star className="h-4 w-4 text-yellow-500" fill="currentColor" />
                  </div>
                )}
              </div>
            ))}
            {challenge.submissions > 4 && (
              <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center text-sm font-medium">
                +{challenge.submissions - 4}
              </div>
            )}
          </div>
        )}

        {challenge.topSubmissions.length === 0 && (
          <p className="text-sm text-muted-foreground italic">
            Noch keine Einreichungen
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Challenge Dialog Component
function ChallengeDialog({
  challenge,
  onSave,
  onClose,
}: {
  challenge: Challenge | null;
  onSave: (challenge: Challenge) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(challenge?.title || "");
  const [description, setDescription] = useState(challenge?.description || "");
  const [category, setCategory] = useState(challenge?.category || categories[0]);
  const [active, setActive] = useState(challenge?.active ?? true);
  const [visible, setVisible] = useState(challenge?.visible ?? true);

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      id: challenge?.id || "",
      title: title.trim(),
      description: description.trim(),
      category,
      active,
      visible,
      submissions: challenge?.submissions || 0,
      topSubmissions: challenge?.topSubmissions || [],
    });
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>
          {challenge ? "Challenge bearbeiten" : "Neue Challenge"}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Titel</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z.B. Bestes Gruppenfoto"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Beschreibung</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Beschreibe die Challenge..."
            rows={3}
          />
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label>Kategorie</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Active Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Aktiv</Label>
            <p className="text-xs text-muted-foreground">
              Challenge für neue Einreichungen öffnen
            </p>
          </div>
          <Switch checked={active} onCheckedChange={setActive} />
        </div>

        {/* Visible Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Sichtbar</Label>
            <p className="text-xs text-muted-foreground">
              Challenge in der Gäste-App anzeigen
            </p>
          </div>
          <Switch checked={visible} onCheckedChange={setVisible} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Abbrechen
        </Button>
        <Button onClick={handleSave} disabled={!title.trim()}>
          Speichern
        </Button>
      </div>
    </DialogContent>
  );
}
