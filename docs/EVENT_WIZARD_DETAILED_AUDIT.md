# 🔍 Event-Wizard Detaillierte Analyse & Fix-Plan

**Datum:** 2026-01-10  
**Status:** ⚠️ **KRITISCH** - Mehrere UX/UI-Probleme identifiziert

---

## 📋 Zusammenfassung der Probleme

| ID | Problem | Priorität | Status |
|---|---|---|---|
| **SS1** | Vorschau im Wizard ≠ Gäste-Seite | 🔴 **KRITISCH** | ❌ Nicht implementiert |
| **SS1** | Benutzerdefiniertes Farbschema ohne Color Picker | 🔴 **KRITISCH** | ❌ Nicht implementiert |
| **SS1** | Vorschau ändert sich nicht bei Farbschema-Wechsel | 🟡 **WICHTIG** | ❌ Bug |
| **SS2** | Keine Album-Vorschläge werden angezeigt | 🟡 **WICHTIG** | ❌ Bug |
| **SS2** | Album-Auswahl ist Pflichtfeld (soll optional sein) | 🟡 **WICHTIG** | ❌ Falsche Validierung |
| **SS3** | "QR Code erhalten" statt "QR Code designen" | 🟡 **WICHTIG** | ❌ Falscher Text + Navigation |
| **SS4** | X-Button führt zu `/events` statt `/dashboard` | 🔴 **KRITISCH** | ❌ Falsche Navigation |

---

## 🔴 SS1: Vorschau & Farbschema-Probleme

### Problem 1.1: Vorschau ist nicht identisch mit Gäste-Seite

**Aktueller Code (DesignStep.tsx, Zeile 165-189):**
```165:189:packages/frontend/src/components/wizard/steps/DesignStep.tsx
        <div className="hidden md:block">
          <label className="block text-sm font-medium mb-2">📱 Vorschau</label>
          <div className="border-4 border-gray-800 rounded-3xl p-2 bg-gray-800">
            <div className="bg-white rounded-2xl overflow-hidden">
              <div className="relative h-32">
                {coverImagePreview ? (
                  <img src={coverImagePreview} alt="Cover Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full ${colorSchemes.find((s) => s.id === colorScheme)?.colors}`} />
                )}
              </div>
              <div className="px-4 py-3 -mt-8 relative">
                <div className="w-16 h-16 rounded-full border-4 border-white overflow-hidden bg-gray-200">
                  {profileImagePreview && (
                    <img src={profileImagePreview} alt="Profile Preview" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="mt-2">
                  <h3 className="font-semibold text-sm">{title || 'Dein Event'}</h3>
                  <p className="text-xs text-muted-foreground">Gäste-App</p>
                </div>
              </div>
            </div>
          </div>
        </div>
```

**Echte Gäste-Seite (e/[slug]/page.tsx):**
- Verwendet `EventHeader` Komponente
- Zeigt Farbschema in Header/Buttons/Akzenten an
- Hat vollständiges Layout mit Navigation, Alben, etc.

**Problem:**
- Vorschau ist nur ein statisches Mockup
- Zeigt **keine** Farbschema-Anwendung (Header-Farben, Buttons, Akzente)
- Struktur ist anders als echte Gäste-Seite

**Lösung:**
1. **EventHeader-Komponente wiederverwenden** in der Vorschau
2. **Farbschema dynamisch anwenden** via CSS-Variablen oder Tailwind-Klassen
3. **Gleiche Struktur** wie echte Gäste-Seite

---

### Problem 1.2: Benutzerdefiniertes Farbschema ohne Color Picker

**Aktueller Code (DesignStep.tsx, Zeile 60-69):**
```60:69:packages/frontend/src/components/wizard/steps/DesignStep.tsx
  const colorSchemes: { id: ColorScheme; label: string; colors: string }[] = [
    { id: 'elegant', label: 'Elegant', colors: 'bg-gradient-to-br from-amber-100 to-amber-50' },
    { id: 'romantic', label: 'Romantisch', colors: 'bg-gradient-to-br from-rose-100 to-pink-50' },
    { id: 'modern', label: 'Modern', colors: 'bg-gradient-to-br from-slate-200 to-slate-100' },
    { id: 'colorful', label: 'Bunt', colors: 'bg-gradient-to-br from-purple-100 via-pink-100 to-orange-100' },
    { id: 'ocean', label: 'Ozean', colors: 'bg-gradient-to-br from-blue-100 to-cyan-50' },
    { id: 'forest', label: 'Natur', colors: 'bg-gradient-to-br from-green-100 to-emerald-50' },
    { id: 'sunset', label: 'Sonnenuntergang', colors: 'bg-gradient-to-br from-orange-100 via-rose-100 to-purple-50' },
    { id: 'custom', label: 'Benutzerdefiniert', colors: 'bg-gradient-to-br from-gray-100 to-gray-50' },
  ];
```

**Problem:**
- "Benutzerdefiniert" ist nur eine Option, aber **kein Color Picker** erscheint
- Keine Möglichkeit, eigene Farben zu wählen
- Vorschau ändert sich nicht, wenn "Benutzerdefiniert" ausgewählt wird

**Lösung:**
1. **Color Picker öffnen**, wenn "Benutzerdefiniert" ausgewählt wird
2. **Custom Color State** im WizardState hinzufügen:
   ```typescript
   customColorScheme?: {
     primary: string;
     secondary: string;
     accent: string;
   }
   ```
3. **Color Picker Komponente** verwenden (z.B. `react-color` oder native `<input type="color">`)
4. **Vorschau aktualisieren** mit custom colors

---

### Problem 1.3: Vorschau ändert sich nicht bei Farbschema-Wechsel

**Aktueller Code (DesignStep.tsx, Zeile 173):**
```173:173:packages/frontend/src/components/wizard/steps/DesignStep.tsx
                  <div className={`w-full h-full ${colorSchemes.find((s) => s.id === colorScheme)?.colors}`} />
```

**Problem:**
- Vorschau zeigt nur **Cover-Bild-Hintergrund** mit Farbschema
- **Keine** Anwendung auf Header, Buttons, Akzente
- Farbschema wird nicht in der Vorschau visualisiert

**Lösung:**
- **EventHeader** mit Farbschema-Props verwenden
- **CSS-Variablen** für Farbschema setzen
- **Dynamische Klassen** basierend auf `colorScheme` anwenden

---

## 🟡 SS2: Album-Vorschläge & Validierung

### Problem 2.1: Keine Album-Vorschläge werden angezeigt

**Aktueller Code (EventWizard.tsx, Zeile 31-37):**
```31:37:packages/frontend/src/components/wizard/EventWizard.tsx
  const handleEventTypeChange = (eventType: WizardState['eventType']) => {
    updateState({ eventType });
    const albums = ALBUM_PRESETS[eventType].map((preset) => ({
      ...preset,
      enabled: preset.default,
    }));
    updateState({ albums });
```

**Problem:**
- Alben werden **nur** gesetzt, wenn Event-Type geändert wird
- **Initial State** hat leere Alben-Liste:
  ```typescript
  albums: [], // ❌ Leer!
  ```
- Wenn User direkt zu Schritt 4 springt, sind keine Alben vorhanden

**Lösung:**
1. **Initial State** mit Default-Alben füllen:
   ```typescript
   albums: ALBUM_PRESETS['wedding'].map(preset => ({
     ...preset,
     enabled: preset.default,
   })),
   ```
2. **AlbumsStep** sollte auch Alben anzeigen, wenn `albums.length === 0`
3. **Fallback** zu Default-Alben, wenn keine vorhanden

---

### Problem 2.2: Album-Auswahl ist Pflichtfeld (soll optional sein)

**Aktueller Code (EventWizard.tsx, Zeile 108-112):**
```108:112:packages/frontend/src/components/wizard/EventWizard.tsx
      const enabledAlbums = state.albums.filter((a) => a.enabled);
      if (enabledAlbums.length === 0) {
        throw new Error('Bitte wähle mindestens ein Album aus');
      }
      formData.append('albums', JSON.stringify(enabledAlbums));
```

**Aktueller Code (AlbumsStep.tsx, Zeile 42-43, 117):**
```42:43:packages/frontend/src/components/wizard/steps/AlbumsStep.tsx
  const enabledCount = albums.filter((a) => a.enabled).length;
  const hasError = enabledCount === 0;
```

```117:117:packages/frontend/src/components/wizard/steps/AlbumsStep.tsx
        <Button onClick={onNext} disabled={enabledCount === 0}>
```

**Problem:**
- Validierung blockiert Weiter-Button, wenn keine Alben ausgewählt
- User kann nicht ohne Alben weitermachen
- Backend erwartet aber möglicherweise leere Alben-Liste

**Lösung:**
1. **Validierung entfernen** in `EventWizard.tsx` (Zeile 109-111)
2. **Button nicht mehr disabled** in `AlbumsStep.tsx` (Zeile 117)
3. **Backend-Logik prüfen**: Wenn keine Alben → alle Fotos in "Alle"-Album
4. **Warnung statt Fehler** anzeigen: "Wenn keine Alben ausgewählt, werden alle Fotos im Album 'Alle' gespeichert"

---

## 🟡 SS3: QR-Code Designer Navigation

### Problem 3.1: "QR Code erhalten" statt "QR Code designen"

**Aktueller Code (AccessStep.tsx, Zeile 112):**
```112:112:packages/frontend/src/components/wizard/steps/AccessStep.tsx
          🚀 Jetzt starten & QR-Code erhalten
```

**Problem:**
- Text sagt "QR-Code erhalten"
- Sollte "QR-Code designen" sein
- Sollte direkt zum QR-Code Designer führen (`/events/${eventId}/qr-styler`)

**Lösung:**
1. **Text ändern** zu "QR-Code designen"
2. **Navigation nach Event-Erstellung** ändern:
   ```typescript
   // Statt:
   router.push(`/events/${eventId}/dashboard?created=true`);
   
   // Sollte sein:
   router.push(`/events/${eventId}/qr-styler?wizard=1&created=true`);
   ```
3. **Oder**: Button im Summary-Step hinzufügen: "QR-Code designen"

---

## 🔴 SS4: X-Button Navigation

### Problem 4.1: X-Button führt zu `/events` statt `/dashboard`

**Aktueller Code (EventWizard.tsx, Zeile 168-176):**
```168:176:packages/frontend/src/components/wizard/EventWizard.tsx
              <button
                onClick={() => router.push('/events')}
                className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Abbrechen"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
```

**Problem:**
- X-Button führt zu `/events` (Event-Liste)
- Sollte zu `/dashboard` führen (Host-Dashboard)

**Lösung:**
```typescript
onClick={() => router.push('/dashboard')}
```

---

## 📊 Technische Details

### Farbschema-Anwendung in Gäste-Seite

**EventHeader.tsx** (muss geprüft werden):
- Wie wird Farbschema angewendet?
- Gibt es CSS-Variablen?
- Wie werden Header/Buttons/Akzente gefärbt?

**Backend (designConfig):**
- Farbschema wird in `designConfig` gespeichert
- Muss in Gäste-Seite ausgelesen werden

---

## ✅ Fix-Priorität

1. **🔴 P0 (Kritisch):**
   - SS4: X-Button Navigation
   - SS1: Vorschau = Gäste-Seite (gleiche Komponente)
   - SS1: Custom Color Picker

2. **🟡 P1 (Wichtig):**
   - SS2: Album-Vorschläge anzeigen
   - SS2: Album-Auswahl optional machen
   - SS3: QR-Code Designer Navigation

3. **🟢 P2 (Nice-to-have):**
   - SS1: Vorschau mit Farbschema aktualisieren

---

## 🔧 Implementierungs-Plan

### Schritt 1: Navigation-Fixes (SS4, SS3)
- ✅ X-Button zu `/dashboard` ändern
- ✅ QR-Code Designer Navigation nach Event-Erstellung

### Schritt 2: Album-Fixes (SS2)
- ✅ Initial State mit Default-Alben füllen
- ✅ Validierung entfernen (optional machen)
- ✅ Warnung statt Fehler anzeigen

### Schritt 3: Farbschema-Fixes (SS1)
- ✅ Custom Color Picker implementieren
- ✅ Color Picker State im WizardState
- ✅ Vorschau mit EventHeader-Komponente
- ✅ Farbschema in Vorschau anwenden

---

## 📝 Code-Änderungen Übersicht

| Datei | Änderungen |
|---|---|
| `EventWizard.tsx` | - X-Button: `/events` → `/dashboard`<br>- Album-Validierung entfernen<br>- Initial State mit Alben füllen<br>- QR-Code Designer Navigation |
| `DesignStep.tsx` | - Custom Color Picker hinzufügen<br>- EventHeader in Vorschau verwenden<br>- Farbschema in Vorschau anwenden |
| `AlbumsStep.tsx` | - Button nicht mehr disabled<br>- Warnung statt Fehler |
| `types.ts` | - `customColorScheme` State hinzufügen |
| `AccessStep.tsx` | - Text: "QR-Code designen" |

---

**Status:** ⚠️ **WARTET AUF IMPLEMENTIERUNG**  
**Nächster Schritt:** Fixes implementieren gemäß Priorität
