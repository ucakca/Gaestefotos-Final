"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Download, 
  FileArchive, 
  ImageIcon, 
  Video, 
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  HardDrive,
  Calendar,
  FolderOpen,
} from "lucide-react";

// Demo download history
const downloadHistory = [
  {
    id: "1",
    name: "Alle_Fotos_15-03-2025.zip",
    size: "2.4 GB",
    status: "completed",
    createdAt: "vor 2 Stunden",
    items: 456,
  },
  {
    id: "2",
    name: "Trauung_Fotos.zip",
    size: "450 MB",
    status: "completed",
    createdAt: "vor 1 Tag",
    items: 42,
  },
  {
    id: "3",
    name: "Videos_Export.zip",
    size: "1.2 GB",
    status: "processing",
    progress: 65,
    createdAt: "gerade eben",
    items: 12,
  },
];

export default function DownloadsPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadOptions, setDownloadOptions] = useState({
    includePhotos: true,
    includeVideos: true,
    includeOriginals: true,
    organizeByCategory: true,
    includeMetadata: false,
  });

  const totalPhotos = 456;
  const totalVideos = 23;
  const totalSize = "3.2 GB";

  const handleGenerateDownload = async () => {
    setIsGenerating(true);
    // Simulate generation
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsGenerating(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Downloads</h1>
        <p className="text-muted-foreground">
          Lade alle Medien deines Events herunter
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{totalPhotos}</span>
            </div>
            <p className="text-xs text-muted-foreground">Fotos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{totalVideos}</span>
            </div>
            <p className="text-xs text-muted-foreground">Videos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{totalSize}</span>
            </div>
            <p className="text-xs text-muted-foreground">Gesamt</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* New Download */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileArchive className="h-5 w-5" />
              Neuer Download
            </CardTitle>
            <CardDescription>
              Erstelle ein ZIP-Archiv mit allen oder ausgewaehlten Medien
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Options */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="photos"
                  checked={downloadOptions.includePhotos}
                  onCheckedChange={(checked) =>
                    setDownloadOptions({ ...downloadOptions, includePhotos: !!checked })
                  }
                />
                <Label htmlFor="photos" className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Fotos einschliessen ({totalPhotos})
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="videos"
                  checked={downloadOptions.includeVideos}
                  onCheckedChange={(checked) =>
                    setDownloadOptions({ ...downloadOptions, includeVideos: !!checked })
                  }
                />
                <Label htmlFor="videos" className="flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  Videos einschliessen ({totalVideos})
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="originals"
                  checked={downloadOptions.includeOriginals}
                  onCheckedChange={(checked) =>
                    setDownloadOptions({ ...downloadOptions, includeOriginals: !!checked })
                  }
                />
                <Label htmlFor="originals">
                  Original-Qualitaet (groessere Dateien)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="organize"
                  checked={downloadOptions.organizeByCategory}
                  onCheckedChange={(checked) =>
                    setDownloadOptions({ ...downloadOptions, organizeByCategory: !!checked })
                  }
                />
                <Label htmlFor="organize" className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Nach Kategorie sortieren
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="metadata"
                  checked={downloadOptions.includeMetadata}
                  onCheckedChange={(checked) =>
                    setDownloadOptions({ ...downloadOptions, includeMetadata: !!checked })
                  }
                />
                <Label htmlFor="metadata">
                  Metadaten einschliessen (CSV)
                </Label>
              </div>
            </div>

            {/* Estimated Size */}
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Geschaetzte Groesse:</span>
                <span className="font-medium">
                  {downloadOptions.includeOriginals ? "3.2 GB" : "1.8 GB"}
                </span>
              </div>
            </div>

            {/* Generate Button */}
            <Button 
              className="w-full" 
              onClick={handleGenerateDownload}
              disabled={isGenerating || (!downloadOptions.includePhotos && !downloadOptions.includeVideos)}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Wird erstellt...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download erstellen
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Quick Downloads */}
        <Card>
          <CardHeader>
            <CardTitle>Schnell-Downloads</CardTitle>
            <CardDescription>
              Vorgefertigte Downloads nach Kategorie
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { name: "Alle Fotos", count: 456, size: "2.4 GB", icon: ImageIcon },
              { name: "Alle Videos", count: 23, size: "1.2 GB", icon: Video },
              { name: "Trauung", count: 42, size: "220 MB", icon: Calendar },
              { name: "Feier", count: 156, size: "820 MB", icon: FolderOpen },
            ].map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.count} Dateien - {item.size}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="bg-transparent">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Download History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Download-Verlauf
          </CardTitle>
          <CardDescription>
            Deine letzten Downloads (7 Tage verfuegbar)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {downloadHistory.map((download) => (
              <div
                key={download.id}
                className="flex items-center justify-between p-4 rounded-lg border"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                    <FileArchive className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{download.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{download.items} Dateien</span>
                      <span>-</span>
                      <span>{download.size}</span>
                      <span>-</span>
                      <span>{download.createdAt}</span>
                    </div>
                    {download.status === "processing" && download.progress !== undefined && (
                      <div className="mt-2 w-48">
                        <Progress value={download.progress} className="h-1" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {download.status === "completed" && (
                    <>
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Fertig
                      </Badge>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </>
                  )}
                  {download.status === "processing" && (
                    <Badge variant="outline">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      {download.progress}%
                    </Badge>
                  )}
                  {download.status === "failed" && (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      Fehlgeschlagen
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
