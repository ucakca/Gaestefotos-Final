"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Settings, 
  Shield, 
  Bell, 
  Lock, 
  Trash2, 
  Download, 
  Calendar,
  Globe,
  Eye,
  EyeOff,
  Save,
  AlertTriangle,
  Clock,
  Users,
} from "lucide-react";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    // Allgemein
    eventName: "Unsere Hochzeit",
    eventDate: "2025-03-15",
    eventEndDate: "",
    timezone: "Europe/Vienna",
    language: "de",
    
    // Datenschutz & Sichtbarkeit
    isPublic: false,
    requireApproval: true,
    allowDownloads: true,
    showUploaderNames: true,
    allowComments: true,
    allowReactions: true,
    
    // Benachrichtigungen
    emailOnUpload: true,
    emailDigest: "daily",
    pushNotifications: false,
    
    // Zugriffskontrolle
    accessCode: "",
    accessCodeEnabled: false,
    maxGuests: 200,
    
    // Automatisierung
    autoDeleteAfterDays: 0,
    autoArchive: false,
  });

  const [showAccessCode, setShowAccessCode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Einstellungen</h1>
          <p className="text-muted-foreground">
            Verwalte die Grundeinstellungen deines Events
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Speichern..." : "Speichern"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Allgemeine Einstellungen */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Allgemein
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="eventName">Event-Name</Label>
              <Input
                id="eventName"
                value={settings.eventName}
                onChange={(e) => setSettings({ ...settings, eventName: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="eventDate">Event-Datum</Label>
                <Input
                  id="eventDate"
                  type="date"
                  value={settings.eventDate}
                  onChange={(e) => setSettings({ ...settings, eventDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eventEndDate">End-Datum (optional)</Label>
                <Input
                  id="eventEndDate"
                  type="date"
                  value={settings.eventEndDate}
                  onChange={(e) => setSettings({ ...settings, eventEndDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Zeitzone</Label>
              <select
                id="timezone"
                value={settings.timezone}
                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="Europe/Vienna">Wien (UTC+1)</option>
                <option value="Europe/Berlin">Berlin (UTC+1)</option>
                <option value="Europe/Zurich">Zuerich (UTC+1)</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Sprache</Label>
              <select
                id="language"
                value={settings.language}
                onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="de">Deutsch</option>
                <option value="en">English</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Datenschutz & Sichtbarkeit */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Datenschutz & Sichtbarkeit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Oeffentliches Event</Label>
                <p className="text-xs text-muted-foreground">
                  Jeder mit dem Link kann zugreifen
                </p>
              </div>
              <Switch
                checked={settings.isPublic}
                onCheckedChange={(checked) => setSettings({ ...settings, isPublic: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Fotos freigeben</Label>
                <p className="text-xs text-muted-foreground">
                  Neue Uploads müssen erst genehmigt werden
                </p>
              </div>
              <Switch
                checked={settings.requireApproval}
                onCheckedChange={(checked) => setSettings({ ...settings, requireApproval: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Downloads erlauben</Label>
                <p className="text-xs text-muted-foreground">
                  Gäste können Fotos herunterladen
                </p>
              </div>
              <Switch
                checked={settings.allowDownloads}
                onCheckedChange={(checked) => setSettings({ ...settings, allowDownloads: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Uploader-Namen anzeigen</Label>
                <p className="text-xs text-muted-foreground">
                  Zeigt wer das Foto hochgeladen hat
                </p>
              </div>
              <Switch
                checked={settings.showUploaderNames}
                onCheckedChange={(checked) => setSettings({ ...settings, showUploaderNames: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Kommentare erlauben</Label>
                <p className="text-xs text-muted-foreground">
                  Gäste können Fotos kommentieren
                </p>
              </div>
              <Switch
                checked={settings.allowComments}
                onCheckedChange={(checked) => setSettings({ ...settings, allowComments: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Reaktionen erlauben</Label>
                <p className="text-xs text-muted-foreground">
                  Gäste können auf Fotos reagieren
                </p>
              </div>
              <Switch
                checked={settings.allowReactions}
                onCheckedChange={(checked) => setSettings({ ...settings, allowReactions: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Zugriffskontrolle */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Zugriffskontrolle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Zugangscode aktivieren</Label>
                <p className="text-xs text-muted-foreground">
                  Gäste benötigen einen Code
                </p>
              </div>
              <Switch
                checked={settings.accessCodeEnabled}
                onCheckedChange={(checked) => setSettings({ ...settings, accessCodeEnabled: checked })}
              />
            </div>

            {settings.accessCodeEnabled && (
              <div className="space-y-2">
                <Label htmlFor="accessCode">Zugangscode</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="accessCode"
                      type={showAccessCode ? "text" : "password"}
                      value={settings.accessCode}
                      onChange={(e) => setSettings({ ...settings, accessCode: e.target.value })}
                      placeholder="z.B. HOCHZEIT2025"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full bg-transparent"
                      onClick={() => setShowAccessCode(!showAccessCode)}
                    >
                      {showAccessCode ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
                      setSettings({ ...settings, accessCode: code });
                    }}
                  >
                    Generieren
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="maxGuests">Maximale Gäste</Label>
              <Input
                id="maxGuests"
                type="number"
                value={settings.maxGuests}
                onChange={(e) => setSettings({ ...settings, maxGuests: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                0 = unbegrenzt
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Benachrichtigungen */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Benachrichtigungen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>E-Mail bei neuem Upload</Label>
                <p className="text-xs text-muted-foreground">
                  Erhalte eine E-Mail wenn Gäste Fotos hochladen
                </p>
              </div>
              <Switch
                checked={settings.emailOnUpload}
                onCheckedChange={(checked) => setSettings({ ...settings, emailOnUpload: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label>E-Mail Zusammenfassung</Label>
              <select
                value={settings.emailDigest}
                onChange={(e) => setSettings({ ...settings, emailDigest: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="none">Keine</option>
                <option value="daily">Taeglich</option>
                <option value="weekly">Woechentlich</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Push-Benachrichtigungen</Label>
                <p className="text-xs text-muted-foreground">
                  Browser-Benachrichtigungen aktivieren
                </p>
              </div>
              <Switch
                checked={settings.pushNotifications}
                onCheckedChange={(checked) => setSettings({ ...settings, pushNotifications: checked })}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gefahrenzone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Gefahrenzone
          </CardTitle>
          <CardDescription>
            Diese Aktionen koennen nicht rueckgaengig gemacht werden
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
            <div>
              <p className="font-medium">Alle Fotos herunterladen</p>
              <p className="text-sm text-muted-foreground">
                Lade alle Fotos als ZIP-Archiv herunter
              </p>
            </div>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
            <div>
              <p className="font-medium">Event archivieren</p>
              <p className="text-sm text-muted-foreground">
                Event deaktivieren aber Daten behalten
              </p>
            </div>
            <Button variant="outline">
              <Clock className="h-4 w-4 mr-2" />
              Archivieren
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/10">
            <div>
              <p className="font-medium text-destructive">Event loeschen</p>
              <p className="text-sm text-muted-foreground">
                Alle Daten werden permanent geloescht
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Löschen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Event wirklich loeschen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Diese Aktion kann nicht rueckgaengig gemacht werden. Alle Fotos, 
                    Videos, Kommentare und Gäste-Daten werden permanent gelöscht.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Ja, Event loeschen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
