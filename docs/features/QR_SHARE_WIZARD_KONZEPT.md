# QR Share Wizard - Konzept

> Ersetzt die aktuellen PNG/PDF Buttons durch einen intelligenten Export-Wizard

## Problem (Aktueller Zustand)

```
[PNG Button] [PDF Button]
```

- **Limitiert**: Nur 2 Optionen
- **Nicht skalierbar**: Neue Formate = neue Buttons
- **Keine Guidance**: User weiß nicht, welches Format für welchen Zweck
- **Monetarisierung fehlt**: Kein Upselling zu Print-Produkten

---

## Lösung: Share & Export Wizard

### Ein Button → Wizard Modal

```
[✨ Teilen & Drucken]
        ↓
   ┌─────────────────────────────────────┐
   │  Wie möchtest du den QR-Code nutzen? │
   └─────────────────────────────────────┘
```

---

## Wizard-Struktur

### Tab 1: 📱 Digital

**Für Social Media, Messenger, Websites**

| Format | Beschreibung | Größe |
|--------|--------------|-------|
| **Standard PNG** | Universell einsetzbar | 1080x1080 |
| **Instagram Story** | Optimiert für 9:16 | 1080x1920 |
| **Instagram Post** | Quadratisch | 1080x1080 |
| **WhatsApp** | Komprimiert für schnelles Senden | 800x800 |
| **Website Embed** | Mit transparentem Hintergrund | SVG |
| **PDF Digital** | Zum Versenden per E-Mail | A4 |

**Features:**
- [ ] Live-Vorschau im jeweiligen Format
- [ ] "Direkt teilen" Button (Web Share API)
- [ ] QR-Code Link kopieren

---

### Tab 2: 🖨️ Selbst Drucken (DIY)

**Für Heimdrucker & Copyshops**

| Format | Beschreibung | Features |
|--------|--------------|----------|
| **A6 Tischaufsteller** | Zum Falten | Mit Faltlinien & Anleitung |
| **A5 Tischaufsteller** | Größer, stabiler | Mit Faltlinien & Anleitung |
| **A4 Poster** | Für Wand/Staffelei | Hochformat |
| **A3 Poster** | Großformat | Hochformat |
| **Visitenkarten** | 10 Stück pro A4 | Mit Schnittmarken |
| **Aufkleber-Bogen** | Runde Sticker | Mit Schnittmarken |

**Features:**
- [ ] PDF mit Schnittmarken & Faltlinien
- [ ] Druckanleitung als Overlay
- [ ] Papierempfehlung (z.B. "300g/m² Karton")
- [ ] "An Copyshop senden" (E-Mail mit PDF)

---

### Tab 3: 📦 Bestellen (Print-on-Demand)

**Fertige Produkte direkt bestellen**

| Produkt | Preis | Lieferzeit |
|---------|-------|------------|
| **5x Tischaufsteller Karton** | 9,99€ | 3-5 Tage |
| **10x Tischaufsteller Karton** | 14,99€ | 3-5 Tage |
| **Acryl-Aufsteller Premium** | 19,99€ | 5-7 Tage |
| **Holz-Aufsteller Gravur** | 29,99€ | 7-10 Tage |
| **A2 Poster auf Forex** | 24,99€ | 5-7 Tage |
| **Rollup Banner 85x200cm** | 49,99€ | 7-10 Tage |
| **50x Visitenkarten** | 12,99€ | 5-7 Tage |
| **Aufkleber-Set (50 Stk)** | 9,99€ | 5-7 Tage |

**Features:**
- [ ] Produktvorschau mit aktuellem Design
- [ ] Mengenrabatte
- [ ] Express-Lieferung Option
- [ ] Warenkorb-Integration
- [ ] Versandkostenfrei ab 30€

---

## UI/UX Flow

```
┌─────────────────────────────────────────────────────────┐
│  ✨ Teilen & Drucken                              [X]   │
├─────────────────────────────────────────────────────────┤
│  [📱 Digital]  [🖨️ Selbst drucken]  [📦 Bestellen]     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│   │  Standard   │  │  Instagram  │  │  WhatsApp   │    │
│   │    PNG      │  │    Story    │  │  optimiert  │    │
│   │  1080x1080  │  │  1080x1920  │  │   800x800   │    │
│   └─────────────┘  └─────────────┘  └─────────────┘    │
│                                                         │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│   │  Instagram  │  │   Website   │  │  PDF zum    │    │
│   │    Post     │  │    Embed    │  │  Versenden  │    │
│   │  1080x1080  │  │     SVG     │  │     A4      │    │
│   └─────────────┘  └─────────────┘  └─────────────┘    │
│                                                         │
│   ═══════════════════════════════════════════════════  │
│                      VORSCHAU                           │
│                  ┌───────────────┐                      │
│                  │               │                      │
│                  │   [QR-Code]   │                      │
│                  │               │                      │
│                  └───────────────┘                      │
│                                                         │
│              [📥 Herunterladen]  [📤 Teilen]           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Technische Umsetzung

### Phase 1: Digital Export (MVP)
```
Aufwand: ~2-3 Tage
- Modal mit Tab-Navigation
- Format-Auswahl Grid
- PNG/PDF Export mit verschiedenen Größen
- Web Share API Integration
```

### Phase 2: DIY Druck
```
Aufwand: ~3-4 Tage
- SVG-Templates mit Faltlinien/Schnittmarken
- PDF-Generator für verschiedene Formate
- Druckanleitung als PDF-Seite 2
```

### Phase 3: Print-on-Demand
```
Aufwand: ~1-2 Wochen
- Produktkatalog & Preise
- Warenkorb-System
- Checkout mit Stripe
- Integration mit Druckdienstleister (z.B. Gelato, Printful)
- Bestellverwaltung im Admin
```

---

## Revenue Streams

| Stream | Marge | Volumen-Potenzial |
|--------|-------|-------------------|
| **POD Produkte** | 30-50% | Mittel |
| **Express-Lieferung** | 100% | Niedrig |
| **Premium-Materialien** | 40-60% | Mittel |
| **B2B Bulk Orders** | 20-30% | Hoch |

### Beispielrechnung (pro Event mit POD-Bestellung)
- Durchschnittliche Bestellung: 25€
- Marge: 35% = 8,75€
- Bei 10% Conversion: 0,875€ pro Event
- Bei 10.000 Events/Jahr: 8.750€ zusätzlicher Umsatz

---

## Wettbewerbsvorteil

| Feature | gästefotos.com | Konkurrenz |
|---------|----------------|------------|
| Digital Export | ✅ | ✅ |
| Social Media Formate | ✅ | ❌ |
| DIY Druckvorlagen | ✅ | ❌ |
| Faltlinien & Anleitung | ✅ | ❌ |
| Print-on-Demand | ✅ | ❌ |
| One-Click vom Design | ✅ | ❌ |

---

## Nächste Schritte

1. **Validierung**: User-Feedback zur Idee einholen
2. **Phase 1**: Digital Export Wizard implementieren
3. **Phase 2**: DIY Druckvorlagen hinzufügen
4. **Phase 3**: POD-Partner evaluieren & integrieren

---

## Offene Fragen

- [ ] Welcher POD-Partner? (Gelato, Printful, FLYERALARM, etc.) → **noch unbekannt, System vorbereiten**
- [ ] Wie handhaben wir internationale Bestellungen?

## Entscheidungen

- ✅ **Kein Dropshipping** - Qualitätskontrolle wichtig
- ✅ **Keine Host-Provision** - Host bestellt für sich selbst, keine Affiliate-Logik nötig

---

*Erstellt: 2026-02-01*
*Status: Konzept*
