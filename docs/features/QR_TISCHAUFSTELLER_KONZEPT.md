# QR-Tischaufsteller Konzept

## Übersicht
Erweiterung des QR-Designers um Tischaufsteller-Formate mit DIY- und Bestell-Optionen.

---

## 1. Neue Formate mit Schnittlinien

### Tischaufsteller-Formate
| Format | Größe | Beschreibung |
|--------|-------|--------------|
| **Tischaufsteller A6** | 105×148mm | Klassisch, passt in Standard-Halter |
| **Tischaufsteller A7** | 74×105mm | Kompakt für kleine Tische |
| **Tischaufsteller Tent** | 2x A6 gefaltet | Zelt-Format, selbststehend |
| **Tischaufsteller L-Form** | A6 + Standfuß | L-förmig mit Knicklinie |

### Schnittlinien-Features
- **Schnittmarkierungen**: Eckmarkierungen für präzises Schneiden
- **Falzlinien**: Gestrichelte Linien für Faltung
- **Beschnitt (3mm)**: Überstand für professionellen Druck
- **Safe Zone**: Markierung für wichtige Inhalte

---

## 2. DIY-Optionen (Selbst ausdrucken)

### Download-Formate
- **PDF mit Schnittlinien**: Druckfertig auf A4/A3
- **PDF ohne Schnittlinien**: Für Heimdrucker
- **PNG hochauflösend**: 300 DPI für Fotodruck

### Anleitungen
- Video-Tutorial für korrektes Schneiden
- Papierempfehlungen (300g/m² Karton)
- Tipps für Laminierung

---

## 3. Bestell-Optionen (Print-on-Demand)

### Produkte zum Bestellen
| Produkt | Beschreibung | Preis-Idee |
|---------|--------------|------------|
| **Gedruckte Aufsteller** | 5er/10er Pack, 300g Karton | €9,99 - €14,99 |
| **Acryl-Ständer** | Wiederverwendbar, elegant | €4,99/Stück |
| **Holz-Ständer** | Rustikal, verschiedene Farben | €5,99/Stück |
| **Premium-Set** | 5 Aufsteller + 5 Ständer | €24,99 |

### Bestellprozess
1. Design im QR-Designer fertigstellen
2. Produkt auswählen (nur Druck / nur Ständer / Kombi)
3. Menge wählen
4. Checkout (Stripe Integration)
5. Produktion & Versand (Print-Partner)

---

## 4. Technische Umsetzung

### Frontend
```
/events/[id]/qr-styler
├── Neue Format-Kategorie: "Tischaufsteller"
├── Export mit/ohne Schnittlinien Toggle
├── "Bestellen" Tab im Export-Panel
└── Produkt-Auswahl Modal
```

### Backend
```
POST /api/orders/print
{
  eventId: string
  productType: 'cards' | 'stands' | 'bundle'
  quantity: number
  designSvg: string
  shippingAddress: Address
}
```

### Print-Partner Integration
- Option A: Printful API
- Option B: FLYERALARM API
- Option C: Lokaler Drucker-Partner

---

## 5. Revenue Streams

1. **Druck-Marge**: 30-50% auf Druckprodukte
2. **Ständer-Verkauf**: Hardware mit höherer Marge
3. **Express-Versand**: Aufpreis für schnelle Lieferung

---

## 6. Implementierungs-Phasen

### Phase 1: DIY (2-3 Tage)
- [ ] Neue Tischaufsteller-Formate
- [ ] SVG-Templates mit Schnittlinien
- [ ] PDF-Export mit Schnittlinien-Option

### Phase 2: Shop-Grundlagen (1 Woche)
- [ ] Produkt-Katalog Datenmodell
- [ ] Bestell-UI im QR-Designer
- [ ] Stripe Checkout Integration

### Phase 3: Fulfillment (2 Wochen)
- [ ] Print-Partner API Integration
- [ ] Order-Management im Admin
- [ ] Versand-Tracking

---

## 7. Mockup: Export-Panel Erweiterung

```
┌─────────────────────────────────┐
│ 📥 Export                       │
├─────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐         │
│ │   PNG   │ │   PDF   │         │
│ └─────────┘ └─────────┘         │
│                                 │
│ ☑ Schnittlinien einblenden      │
│ ☑ Beschnitt hinzufügen (3mm)    │
│                                 │
├─────────────────────────────────┤
│ 🛒 Oder professionell drucken   │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 5x Aufsteller (300g)  €9,99 │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ 5x Acryl-Ständer     €19,99 │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ 🎁 Kombi-Set (5+5)   €24,99 │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

---

*Erstellt: 01.02.2026*
*Status: Konzept*
