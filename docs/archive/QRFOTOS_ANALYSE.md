# 📊 qrFotos.de Analyse & Vergleich

**Datum:** 2025-12-09  
**Analysierte Seite:** https://www.qrfotos.de/app

---

## 🎯 Was macht qrFotos.de besonders?

### 1. **Vier verschiedene Event-Modi** ⭐⭐⭐

qrFotos bietet **4 klar definierte Modi** für Events:

1. **Standard**
   - Gäste können Fotos hochladen
   - Alle Gäste sehen alle Fotos
   - ✅ **Wir haben das ähnlich**

2. **Moderation** ⭐
   - Gäste können hochladen
   - Fotos müssen erst freigegeben werden
   - Erst nach Freigabe für andere sichtbar
   - ✅ **Wir haben das bereits!**

3. **Foto Sammeln** ⭐⭐⭐ **FEHLT BEI UNS!**
   - Gäste können hochladen
   - **Gäste sehen NUR ihre eigenen Uploads**
   - **Gastgeber sieht ALLE Fotos**
   - 💡 **Sehr interessant für private Events!**

4. **Nur Ansicht**
   - Keine Uploads möglich
   - Nur Ansehen der Fotos
   - ✅ **Wir können das mit `allowUploads: false`**

### 2. **Foto Challenge** ⭐⭐⭐ **FEHLT BEI UNS!**

- Gamification-Element
- Gäste können Challenges erstellen/teilnehmen
- Macht das Event interaktiver
- Kann für Gäste ausgeblendet werden

### 3. **Unteralben** ⭐⭐ **FEHLT BEI UNS!**

- Events können in Unteralben organisiert werden
- Bessere Strukturierung für große Events
- Ähnlich wie unsere Kategorien, aber hierarchisch

### 4. **Video-Upload** ⭐⭐ **FEHLT BEI UNS!**

- Unterstützung für Video-Uploads
- Kann deaktiviert werden
- Aktuell nur Fotos bei uns

### 5. **Live Stream** ⭐ **FEHLT BEI UNS!**

- Live-Streaming-Funktion
- Kann für Gäste ausgeblendet werden
- Interessant für Events

### 6. **Download-Kontrolle** ✅ **HABEN WIR!**

- Download für Gäste deaktivierbar
- ✅ Wir haben `allowDownloads` in `featuresConfig`

### 7. **Farb Schema** ✅ **HABEN WIR!**

- Design-Anpassung
- ✅ Wir haben `designConfig` mit Farben

### 8. **Paket-System** ⭐⭐ **FEHLT BEI UNS!**

- Monetarisierung
- Verschiedene Pakete (kostenlos, Premium, etc.)
- Storage-Limits, Feature-Limits

---

## 📊 Feature-Vergleich

| Feature | qrFotos.de | Gästefotos V2 | Priorität |
|---------|------------|---------------|-----------|
| **Moderation** | ✅ | ✅ | - |
| **Kategorien** | ✅ (Unteralben) | ✅ | - |
| **Design-Anpassung** | ✅ | ✅ | - |
| **Download-Kontrolle** | ✅ | ✅ | - |
| **Foto Sammeln Modus** | ✅ | ❌ | 🔴 Hoch |
| **Foto Challenge** | ✅ | ❌ | 🟡 Mittel |
| **Video-Upload** | ✅ | ❌ | 🟡 Mittel |
| **Unteralben** | ✅ | ❌ | 🟢 Niedrig |
| **Live Stream** | ✅ | ❌ | 🟢 Niedrig |
| **Paket-System** | ✅ | ❌ | 🟢 Niedrig |

---

## 💡 Empfehlungen für Gästefotos V2

### 🔴 Hoch-Priorität: "Foto Sammeln" Modus

**Warum wichtig:**
- Sehr beliebt bei privaten Events (Hochzeiten, Geburtstage)
- Gäste fühlen sich sicherer beim Upload
- Gastgeber hat volle Kontrolle
- Unterscheidet uns von Standard-Lösungen

**Implementierung:**
```typescript
// In featuresConfig
{
  mode: 'STANDARD' | 'MODERATION' | 'COLLECT' | 'VIEW_ONLY',
  // COLLECT: Gäste sehen nur eigene Fotos, Host sieht alle
}
```

**Backend-Änderungen:**
- Photo-Liste filtern basierend auf Modus
- Wenn `mode === 'COLLECT'` und User ist Guest: Nur eigene Fotos
- Wenn `mode === 'COLLECT'` und User ist Host: Alle Fotos

### 🟡 Mittel-Priorität: Foto Challenge

**Warum interessant:**
- Gamification erhöht Engagement
- Macht Events interaktiver
- Kann optional sein

**Ideen:**
- "Beste Selfie"-Challenge
- "Schnappschuss"-Challenge
- "Kreativste Foto"-Challenge
- Voting-System

### 🟡 Mittel-Priorität: Video-Upload

**Warum nützlich:**
- Viele Events haben auch Videos
- Erwartetes Feature
- Kann optional sein

**Implementierung:**
- Ähnlich wie Photo-Upload
- Video-Processing (Thumbnails, Transcoding)
- Größere Dateien (50-100MB)

---

## 🎨 UI/UX Beobachtungen

### Was qrFotos gut macht:

1. **Klare Modus-Auswahl**
   - Radio-Buttons mit klaren Beschreibungen
   - Sofort verständlich

2. **Viele Optionen, aber organisiert**
   - Sidebar-Navigation
   - Klare Kategorisierung

3. **Flexibilität**
   - Viele Features können ein/ausgeschaltet werden
   - Anpassbar an verschiedene Event-Typen

### Was wir besser machen können:

1. **Modus-Auswahl prominenter**
   - Aktuell in `featuresConfig` versteckt
   - Sollte in Event-Einstellungen prominent sein

2. **Mehr Optionen für Gäste-Sichtbarkeit**
   - "Foto Sammeln" Modus fehlt
   - Wichtig für Privatsphäre

---

## 🚀 Konkrete Umsetzungsvorschläge

### 1. "Foto Sammeln" Modus implementieren

**Backend:**
```typescript
// packages/backend/src/routes/photos.ts
router.get('/:eventId/photos', async (req, res) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { featuresConfig: true, hostId: true }
  });
  
  const mode = event.featuresConfig?.mode || 'STANDARD';
  const isHost = req.userId === event.hostId;
  
  const where: any = { eventId };
  
  // Foto Sammeln Modus: Gäste sehen nur eigene Fotos
  if (mode === 'COLLECT' && !isHost) {
    where.guestId = req.userId; // Nur eigene Fotos
  }
  
  // ... rest of query
});
```

**Frontend:**
```typescript
// Event-Einstellungen
<RadioGroup>
  <Radio value="STANDARD">
    Standard: Alle können hochladen und sehen
  </Radio>
  <Radio value="MODERATION">
    Moderation: Uploads müssen freigegeben werden
  </Radio>
  <Radio value="COLLECT">
    Foto Sammeln: Gäste sehen nur eigene Uploads
  </Radio>
  <Radio value="VIEW_ONLY">
    Nur Ansicht: Keine Uploads möglich
  </Radio>
</RadioGroup>
```

### 2. Foto Challenge (später)

- Separate Tabelle `Challenge`
- Voting-System
- Gewinner-Anzeige

### 3. Video-Upload (später)

- Erweitere `Photo` Model zu `Media` (oder neues `Video` Model)
- Video-Processing mit FFmpeg
- Thumbnail-Generierung

---

## 📈 Wettbewerbsvorteile

### Was wir bereits besser haben:

1. **WordPress-Integration** ✅
   - qrFotos hat das nicht
   - Einfacheres Onboarding für bestehende Kunden

2. **Moderne Tech-Stack** ✅
   - Next.js, TypeScript, PostgreSQL
   - Bessere Performance, Skalierbarkeit

3. **Sicherheit** ✅
   - Rate Limiting, File Upload Security
   - WebP Support, Redis Caching

4. **API-First** ✅
   - Vollständige REST API
   - Swagger Documentation

### Was wir hinzufügen sollten:

1. **"Foto Sammeln" Modus** 🔴
2. **Foto Challenge** 🟡
3. **Video-Upload** 🟡

---

## 🎯 Fazit

**qrFotos.de ist ein sehr guter Vergleichspunkt!**

**Stärken von qrFotos:**
- ✅ Klare Modus-Auswahl
- ✅ Gamification (Foto Challenge)
- ✅ Video-Support
- ✅ Monetarisierung

**Unsere Stärken:**
- ✅ WordPress-Integration
- ✅ Moderne Architektur
- ✅ Bessere Sicherheit
- ✅ API-First Approach

**Nächste Schritte:**
1. **"Foto Sammeln" Modus implementieren** (Hoch-Priorität)
2. Foto Challenge evaluieren (Mittel-Priorität)
3. Video-Upload planen (Mittel-Priorität)

---

**Die Seite zeigt, dass wir auf dem richtigen Weg sind, aber noch einige Features fehlen, die bei der Konkurrenz Standard sind!**






