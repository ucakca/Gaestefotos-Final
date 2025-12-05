# 🌍 Mehrsprachige Lösung - Setup & Konzept

## ✅ Was wurde erstellt

### 1. **next-intl Integration**
- ✅ `next-intl` installiert
- ✅ Middleware für automatische Locale-Erkennung
- ✅ App Router Struktur mit `[locale]` Segment vorbereitet

### 2. **Übersetzungsdateien (5 Sprachen)**
- ✅ `messages/de.json` - Deutsch
- ✅ `messages/en.json` - English  
- ✅ `messages/fr.json` - Français
- ✅ `messages/es.json` - Español
- ✅ `messages/it.json` - Italiano

### 3. **Komponenten & Hooks**
- ✅ `LanguageSelector` - Dropdown für Sprachauswahl
- ✅ `useBrowserLanguage` - Hook zur Browser-Spracherkennung
- ✅ `i18n/config.ts` - Konfiguration

---

## 🎯 Konzept

### **A) Gastgeber-Sicht:**
1. Beim Event-Erstellen: **Sprache wählen** (z.B. Französisch)
2. Diese wird als `defaultLocale` im Event gespeichert
3. Öffentliche Event-Seite verwendet diese Sprache **standardmäßig**

### **B) Gäste-Sicht:**
1. Öffnet Event-Link
2. **System erkennt Browser-Sprache** automatisch
3. **Prüft ob Event diese Sprache unterstützt:**
   - ✅ Ja → verwendet Browser-Sprache
   - ❌ Nein → verwendet Event-Standard-Sprache
4. **Gast kann Sprache manuell wechseln** (persistiert in localStorage)

---

## 📋 Nächste Schritte

### **1. Backend erweitern (Prisma Schema)**

```prisma
model Event {
  ...
  defaultLocale String? @default("de") // Neue Spalte hinzufügen
}
```

Dann Migration ausführen:
```bash
cd packages/backend
pnpm prisma migrate dev --name add_default_locale
```

### **2. Event-Formular erweitern**

Im Event-Erstellungs-Formular:
- `LanguageSelector` hinzufügen
- Standard: Browser-Sprache (falls unterstützt) oder Deutsch
- Beim Speichern: `defaultLocale` im Event speichern

### **3. Öffentliche Seiten anpassen**

#### Event-Seite (`/e/[slug]`):
- Event lädt `defaultLocale` aus DB
- Falls Gast-Sprache gewählt → diese verwenden
- Sonst → Browser-Sprache oder Event-Standard
- `LanguageSelector` für Gast-Sprachwechsel

#### Upload-Seite:
- Gleiche Logik wie Event-Seite

### **4. Alle Komponenten übersetzen**

Alle Texte mit `useTranslations()`:
```tsx
const t = useTranslations('events');
<h1>{t('title')}</h1>
```

---

## 🔧 Technische Details

### URL-Struktur:
- `/de/dashboard` - Dashboard auf Deutsch
- `/en/dashboard` - Dashboard auf Englisch
- `/e/[slug]` - Öffentliche Seite (Locale aus Event oder Gast-Präferenz)

### Locale-Erkennung:
1. URL-Parameter (`/de/...`, `/en/...`)
2. Event `defaultLocale`
3. localStorage (Gast-Präferenz)
4. Browser-Sprache
5. Fallback: Deutsch

### LanguageSelector:
- Für Gastgeber: Event-Sprache setzen
- Für Gäste: Eigene Sprache wählen

---

## 💡 Vorteile

✅ **Gastgeber**: Kann Gäste in deren Muttersprache einladen
✅ **Gäste**: Können Sprache selbst wählen
✅ **Automatisch**: System erkennt Browser-Sprache
✅ **Flexibel**: Jedes Event kann eigene Sprache haben

---

## ⚠️ Status

**Grundstruktur steht!** Aber:
- ⏳ Seiten müssen noch in `[locale]` Struktur verschoben werden
- ⏳ Alle Komponenten müssen `useTranslations()` verwenden
- ⏳ Backend Schema muss erweitert werden
- ⏳ Event-Formular muss Sprache-Auswahl bekommen

**Grundlage ist gelegt, jetzt Schritt für Schritt umsetzen!** 🚀

