"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Palette,
  Upload,
  Smartphone,
  Monitor,
  Check,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// Theme presets
const themePresets = [
  { id: "romantic", name: "Romantisch", primary: "#ec4899", secondary: "#fdf2f8" },
  { id: "elegant", name: "Elegant", primary: "#171717", secondary: "#f5f5f5" },
  { id: "nature", name: "Natur", primary: "#16a34a", secondary: "#f0fdf4" },
  { id: "ocean", name: "Ocean", primary: "#0284c7", secondary: "#f0f9ff" },
  { id: "sunset", name: "Sunset", primary: "#f97316", secondary: "#fff7ed" },
  { id: "custom", name: "Eigene Farben", primary: "#ef4444", secondary: "#ffffff" },
];

export default function DesignPage() {
  const [selectedPreset, setSelectedPreset] = useState("romantic");
  const [primaryColor, setPrimaryColor] = useState("#ec4899");
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">("mobile");
  
  // Form state
  const [eventTitle, setEventTitle] = useState("Hochzeit Max & Anna");
  const [welcomeMessage, setWelcomeMessage] = useState(
    "Wir freuen uns so sehr, diesen besonderen Tag mit euch zu feiern!"
  );
  const [coverImage, setCoverImage] = useState(
    "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80"
  );
  const [profileImage, setProfileImage] = useState(
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80"
  );

  const handlePresetSelect = (preset: typeof themePresets[0]) => {
    setSelectedPreset(preset.id);
    setPrimaryColor(preset.primary);
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-2xl font-bold">Design</h1>
        <p className="text-muted-foreground text-sm">
          Passe das Aussehen deines Events an
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Editor Panel */}
        <div className="space-y-6">
          {/* Theme Presets */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Theme Presets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {themePresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetSelect(preset)}
                    className={cn(
                      "relative rounded-lg border p-3 text-left transition-all hover:border-primary/50",
                      selectedPreset === preset.id && "border-primary ring-2 ring-primary/20"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <div
                        className="h-4 w-4 rounded-full border"
                        style={{ backgroundColor: preset.secondary }}
                      />
                    </div>
                    <span className="text-xs font-medium">{preset.name}</span>
                    {selectedPreset === preset.id && (
                      <Check className="absolute top-2 right-2 h-4 w-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Colors */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Farben
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primaerfarbe</Label>
                <div className="flex gap-2">
                  <div
                    className="h-10 w-10 rounded-lg border cursor-pointer"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <Input
                    id="primaryColor"
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-20 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1"
                    placeholder="#ef4444"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Bilder
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Cover Image */}
              <div className="space-y-2">
                <Label>Titelbild</Label>
                <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted">
                  {coverImage ? (
                    <Image
                      src={coverImage || "/placeholder.svg"}
                      alt="Cover"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm" className="w-full bg-transparent">
                  <Upload className="mr-2 h-4 w-4" />
                  Titelbild hochladen
                </Button>
              </div>

              {/* Profile Image */}
              <div className="space-y-2">
                <Label>Profilbild</Label>
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 rounded-full overflow-hidden border bg-muted">
                    {profileImage ? (
                      <Image
                        src={profileImage || "/placeholder.svg"}
                        alt="Profile"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <Button variant="outline" size="sm">
                    <Upload className="mr-2 h-4 w-4" />
                    Aendern
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Text Content */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Texte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="eventTitle">Event-Titel</Label>
                <Input
                  id="eventTitle"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="z.B. Hochzeit Max & Anna"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="welcomeMessage">Willkommensnachricht</Label>
                <Textarea
                  id="welcomeMessage"
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  rows={3}
                  placeholder="Eine herzliche Nachricht an deine Gäste..."
                />
              </div>
            </CardContent>
          </Card>

          <Button className="w-full" size="lg">
            Änderungen speichern
          </Button>
        </div>

        {/* Preview Panel */}
        <div className="lg:sticky lg:top-20">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Vorschau</CardTitle>
                <div className="flex border rounded-md">
                  <Button
                    variant={previewMode === "mobile" ? "secondary" : "ghost"}
                    size="sm"
                    className="rounded-r-none"
                    onClick={() => setPreviewMode("mobile")}
                  >
                    <Smartphone className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={previewMode === "desktop" ? "secondary" : "ghost"}
                    size="sm"
                    className="rounded-l-none"
                    onClick={() => setPreviewMode("desktop")}
                  >
                    <Monitor className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  "mx-auto border rounded-2xl overflow-hidden bg-background shadow-lg",
                  previewMode === "mobile" ? "w-[280px]" : "w-full"
                )}
              >
                {/* Preview Content */}
                <div className="relative">
                  {/* Cover Image */}
                  <div className="relative h-32 bg-muted">
                    {coverImage && (
                      <Image
                        src={coverImage || "/placeholder.svg"}
                        alt="Cover"
                        fill
                        className="object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-background" />
                  </div>

                  {/* Profile Section */}
                  <div className="relative px-4 -mt-10 pb-4">
                    <div className="flex flex-col items-center">
                      {/* Avatar */}
                      <div
                        className="relative h-20 w-20 rounded-full border-4 overflow-hidden"
                        style={{ borderColor: primaryColor }}
                      >
                        {profileImage ? (
                          <Image
                            src={profileImage || "/placeholder.svg"}
                            alt="Profile"
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-muted" />
                        )}
                      </div>

                      {/* Event Info */}
                      <div className="mt-3 text-center">
                        <h2 className="text-lg font-bold">{eventTitle}</h2>
                        {welcomeMessage && (
                          <p className="mt-1 text-xs text-muted-foreground max-w-[200px] mx-auto">
                            {welcomeMessage}
                          </p>
                        )}
                      </div>

                      {/* Sample Stats */}
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span>45 Gäste</span>
                        <span>156 Fotos</span>
                      </div>
                    </div>
                  </div>

                  {/* Sample Photo Grid */}
                  <div className="px-2 pb-4">
                    <div className="grid grid-cols-3 gap-1">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div
                          key={i}
                          className="aspect-square bg-muted rounded-sm"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
