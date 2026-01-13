# 🌍 Mehrsprachigkeit (i18n) Implementierung

## 📋 Konzept

1. **Gastgeber wählt Standard-Sprache** für sein Event
2. **Gäste können Sprache wählen** auf der öffentlichen Seite
3. **Automatische Erkennung** der Systemsprache als Standard

---

## ✅ Was wurde implementiert

### 1. **next-intl Integration**

- ✅ `next-intl` installiert
- ✅ Middleware für Locale-Handling
- ✅ App Router Struktur mit `[locale]` Segment
- ✅ Übersetzungsdateien für 5 Sprachen: DE, EN, FR, ES, IT

### 2. **Dateien-Struktur**

```
packages/frontend/
├── messages/
│   ├── de.json  ✅
│   ├── en.json  ✅
│   ├── fr.json  ✅
│   ├── es.json  ✅
│   └── it.json  ✅
├── i18n/
│   └── config.ts  ✅
├── src/
│   ├── app/
│   │   └── [locale]/  ✅ (alle Seiten hier rein)
│   ├── components/
│   │   └── LanguageSelector.tsx  ✅
│   ├── hooks/
│   │   └── useBrowserLanguage.ts  ✅
│   └── middleware.ts  ✅
```

### 3. **Sprachen**

- 🇩🇪 **Deutsch** (Standard)
- 🇬🇧 **English**
- 🇫🇷 **Français**
- 🇪🇸 **Español**
- 🇮🇹 **Italiano**

---

## 🔧 Nächste Schritte

### A) Backend erweitern

1. **Event Schema erweitern**:
   ```prisma
   model Event {
     ...
     defaultLocale String? @default("de") // Standard-Sprache für Event
   }
   ```

2. **Event-Formular erweitern**:
   - Sprache-Auswahl im Event-Formular
   - Speichern der gewählten Sprache

### B) Frontend Integration

1. **Event-Formular**:
   - `LanguageSelector` für Event-Sprache hinzufügen
   - Standard: Browser-Sprache oder Deutsch

2. **Öffentliche Seiten**:
   - Event verwendet `event.defaultLocale`
   - Gäste können Sprache wechseln (persistiert in localStorage)
   - Automatische Erkennung: Browser-Sprache als Standard

3. **Alle Komponenten**:
   - `useTranslations()` Hook verwenden
   - Alle hardcodierten Texte durch `t('key')` ersetzen

---

## 📝 Verwendung

### In Komponenten:

```tsx
'use client';

import { useTranslations } from 'next-intl';

export default function MyComponent() {
  const t = useTranslations('events');
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('create')}</p>
    </div>
  );
}
```

### Language Selector:

```tsx
<LanguageSelector 
  showLabel 
  eventLanguage={event.defaultLocale}
  onChange={(locale) => setEventLanguage(locale)}
/>
```

### Browser-Sprache erkennen:

```tsx
import { useBrowserLanguage } from '@/hooks/useBrowserLanguage';

const browserLang = useBrowserLanguage(); // z.B. 'de', 'en', etc.
```

---

## 🎯 Beispiel-Flows

### Gastgeber erstellt Event:
1. Öffnet Event-Formular
2. Wählt gewünschte Sprache (z.B. Französisch)
3. Erstellt Event
4. Event-Seite ist standardmäßig auf Französisch

### Gast besucht Event:
1. Öffnet Event-Link
2. System erkennt Browser-Sprache (z.B. Spanisch)
3. Wenn Event Spanisch unterstützt → Spanisch
4. Wenn nicht → Event-Standard-Sprache (z.B. Französisch)
5. Gast kann Sprache manuell wechseln
6. Präferenz wird in localStorage gespeichert

---

## ⚠️ Wichtig

**Noch zu tun:**
1. ✅ Struktur erstellt
2. ⏳ Alle Komponenten auf `useTranslations()` umstellen
3. ⏳ Backend Schema erweitern
4. ⏳ Event-Formular erweitern
5. ⏳ Öffentliche Seiten: Event-Sprache + Gast-Auswahl

**Derzeit:** Struktur steht, aber Seiten müssen noch umgestellt werden.

