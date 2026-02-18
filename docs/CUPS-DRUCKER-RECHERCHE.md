# CUPS + Drucker auf Linux — Recherche-Ergebnis

> Stand: 18. Februar 2026
> Zweck: Klärung ob DNP DS620 + CUPS auf Linux (Ubuntu) zuverlässig für Photo Booth funktioniert

---

## 1. DNP DS620 auf Linux — Ergebnis: ✅ FUNKTIONIERT

### 1.1 Gutenprint-Treiber

Der DNP DS620/DS620A ist in der **Gutenprint-Treibersuite** als **Tier One** (höchste Stufe) gelistet.

**Quelle:** Solomon Peachy (Gutenprint-Entwickler, peachyphotos.com) — der Mann hat den Treiber selbst geschrieben und besitzt physischen Zugang zum DS620 (markiert mit `*`).

| Tier | Bedeutung | DNP-Modelle |
|------|-----------|-------------|
| **Tier 1** | First-rate support, alle Features unterstützt und getestet | **DS620/DS620A ✅**, DS820/DS820A ✅, DS40, DS80, DS80DX, RX1/RX1HS, QW410 |
| **Tier 2** | Guter Support, die meisten Features funktionieren | DS480, DS680 |
| **Tier 3** | Erwartet funktionsfähig, nicht getestet | DS-SL10, M4/Q4, Q8 |
| **Tier 4** | Nicht erwartet ohne zusätzliche Entwicklung | DS-SL20, DS820DX |

**Wichtig:** Der DS620 benötigt **KEINE** zusätzliche Image-Processing-Library (anders als z.B. Sinfonia CS2 oder Mitsubishi CP-D70DW). Der Treiber ist vollständig in Gutenprint integriert.

### 1.2 Panorama-Drucke

Seit **2023-12-28** werden auf dem DS620 auch diskrete und kontinuierliche Panorama-Drucke (bis zu 3 Blatt) vollständig unterstützt.

### 1.3 Bekannte Probleme + Lösungen

| Problem | Ursache | Lösung |
|---------|---------|--------|
| Falsche Farben (zu dunkel, falsches Gamma) | Gutenprint < 5.3.4 hat falschen Gamma-Wert | **Gutenprint ≥ 5.3.4 installieren** (behebt Problem) |
| Farben wechseln zu S/W nach CMYK-Umstellung | User-Fehler (CMYK nicht verwenden) | **Immer RGB-Farbraum** + ICC-Profil von DNP verwenden |
| Bild leicht skaliert (~3mm Versatz) | CUPS Shrink/Crop/Expand Optionen werden nicht korrekt weitergegeben | Bild exakt auf Druckformat zuschneiden — **gilt für JEDES OS, nicht Linux-spezifisch!** |
| Cutting-Option funktioniert nicht | Feature war initial nicht implementiert | Wurde mittlerweile gefixt — Gutenprint aktuell halten |

### 1.4 Praxis-Beweis: photobooth-app.org

Die **Photobooth App** (Open-Source Python Photo Booth Software) hat eine **offizielle Anleitung** für DNP-Drucker auf Ubuntu 24.04 LTS:

```bash
# 1. Treiber installieren
sudo apt install printer-driver-gutenprint

# 2. CUPS neustarten
sudo systemctl restart cups

# 3. Drucker hinzufügen (USB angeschlossen + eingeschaltet)
# Settings → Printers → Add Printer... → DS620 wird automatisch erkannt

# 4. Drucken via Kommandozeile
lp -d PRINTER_NAME foto.jpg \
  -o PageSize=w288h432 \
  -o orientation-requested=4 \
  -o StpColorPrecision=Best \
  -o Resolution=300dpi \
  -o StpiShrinkOutput=Expand \
  -o StpImageType=Photo \
  -o StpLaminate=Glossy
```

**Das ist exakt unser Setup:** Linux + CUPS + DNP DS620 + `lp` Kommando aus der Booth-App.

### 1.5 Raspberry Pi Einsatz

Auf StackOverflow berichtet ein User, dass er den **DNP DS620 auf einem Raspberry Pi** mit `lpr` erfolgreich betreibt. Wenn ein Pi das kann, kann unser i5-Booth-PC das erst recht.

### 1.6 Fazit DNP DS620

| Aspekt | Bewertung |
|--------|-----------|
| **Linux-Kompatibilität** | ✅ Tier 1 — vollständig unterstützt |
| **Treiber** | Gutenprint (kostenlos, Open Source) |
| **Installation** | 1 Befehl: `apt install printer-driver-gutenprint` |
| **CUPS-Integration** | ✅ Standard CUPS, `lp`/`lpr` Kommando |
| **Farbqualität** | ✅ Gleichwertig mit Windows/Mac ab Gutenprint 5.3.4 |
| **Automatische Erkennung** | ✅ USB Plug-and-Play |
| **Panorama** | ✅ Unterstützt (seit Dez 2023) |
| **Praxis-Bewährt** | ✅ photobooth-app.org + StackOverflow Pi-Berichte |

**Empfehlung: DNP DS620 ist GRÜNES LICHT für Linux. ✅**

---

## 2. Branchenübliche Photo-Booth-Drucker (Vergleich)

### 2.1 Übersicht aller relevanten Modelle

| Modell | Hersteller | Formate | Kapazität (4×6) | Geschw. (4×6) | Gewicht | Linux (Gutenprint) | Preis (ca.) |
|--------|------------|---------|-----------------|----------------|---------|---------------------|-------------|
| **DS620A** | DNP | 4×6, 5×7, 6×8, Panorama | 400/Roll | ~9 Sek | 12 kg | ✅ Tier 1 | ~500-600€ |
| **DS820A** | DNP | bis 8×12, Panorama | 260/Roll (8×10) | ~16 Sek (8×10) | 16 kg | ✅ Tier 1 | ~700-900€ |
| **DS-RX1HS** | DNP | 4×6, 6×8 | **700/Roll** | ~11 Sek | 14 kg | ✅ Tier 1 | ~500-700€ |
| **QW410** | DNP | 4×4, 4×6, 4.5×4.5, 4.5×8 | 150/Roll | ~13 Sek | **6 kg** | ✅ Tier 1 | ~400-500€ |
| **CS2** | Sinfonia | 4×6, 5×7 | 600/Roll | ~8 Sek | **10 kg** | ✅ Tier 1* | ~400-500€ |
| **S3** | Sinfonia | 4×6, 5×7, 6×8 | **900/Roll** | ~8 Sek | 15 kg | ✅ Tier 1* | ~500-600€ |
| **ASK-300** | Fujifilm | 4×6, 5×7, 6×8 | 400/Roll | ~11 Sek | 12 kg | ✅ Tier 1* | ~500-600€ |
| **P525L** | HiTi | 4×6, 5×7, 6×8 | 500/Roll | ~11 Sek | 11 kg | ✅ Tier 2 | ~400-500€ |
| **Model X** | United Printers | 4×6, 5×7, 6×8 | ? | schnell | ~14 kg | ❓ Nicht gelistet | ~400-600$ |

*\* Sinfonia CS2 und Fujifilm ASK-300 benötigen zusätzliche Image-Processing-Library (Open Source, aber extra Schritt)*

### 2.2 Empfehlung nach Einsatzzweck

| Einsatzzweck | Empfehlung | Begründung |
|-------------|------------|-----------|
| **Standard Photo Booth** | **DNP DS620A** | Kompakt, schnell, bewährt, Tier 1 Linux |
| **High-Volume Events** | **Sinfonia S3** oder **DNP DS-RX1HS** | 900 bzw. 700 Drucke/Roll |
| **Große Formate (8×10+)** | **DNP DS820A** | Einziger mit 8×12" in Tier 1 |
| **Mobile / Leicht** | **DNP QW410** | Nur 6 kg, batteriebetrieben möglich |
| **Budget-Einstieg** | **HiTi P525L** | Günstig, WiFi-Option, Tier 2 |

### 2.3 Unsere Empfehlung

**Primär: DNP DS620A** — weil:
- Branchenstandard (meistverkaufter Booth-Drucker weltweit)
- Tier 1 Linux-Support ohne Extra-Libraries
- Kompakteste Bauform in seiner Klasse
- Metallic-Papier, perforiertes Papier verfügbar (für Sticker!)
- <9 Sekunden Druckzeit
- Bewährte CUPS-Integration

**Backup / Später: DNP DS820A** — für Großformat-Events

**Sticker-Druck: DNP DS620A mit Perforations-Media** statt separatem Epson 3500 — weniger Hardware, gleicher Drucker für alles.

### 2.4 Multi-Drucker-Strategie (Event-Setup)

**Grundregel:** 1 Drucker = 1 eingelegtes Medium. Papier-Wechsel = Rolle wechseln.

| Event-Typ | Drucker-Setup | Medium |
|-----------|--------------|--------|
| **Standard Booth** | 1× DNP DS620A | 4×6" Foto-Papier |
| **Booth + Streifen** | 1× DNP DS620A | 4×6" perforiert (2× 2×6" Streifen) |
| **Booth + Mosaic Sticker** | **2× DNP DS620A** | Drucker 1: 4×6" Fotos, Drucker 2: Perforations-Media |
| **Großformat-Event** | 1× DNP DS820A | 8×10" oder 8×12" |

Das Bild wird **vor dem Drucken** auf das exakte Format gerendert — das ist bei **jedem OS** so (Windows, Mac, Linux). Kein Linux-spezifisches Problem.

**Für Kunden:** Wer gleichzeitig Booth-Fotos UND Mosaic-Sticker drucken will, mietet 2 Drucker. Das ist branchenüblich.

### 2.5 Media-Vertriebsstrategie (Nespresso-Modell)

**Partner kaufen Druckmedium ausschließlich von gästefotos.com.**

Begründung: Partner nutzen unsere Marke, unser Logo, unser System → wir kontrollieren die Qualität. Wer unser System nicht will, kann ein anderes benutzen.

**QR-Code Provisioning:** Jede Packung erhält einen QR-Sticker mit HMAC-signiertem Profil:
```
gf://media/v1?sku=DNP-DS620-4x6-GLOSSY-400&batch=2026-03-A1842&prints=400&sig=hmac(...)
```
Partner scannt → Drucker-Profil (PageSize, DPI, Laminate, etc.) wird automatisch geladen + Print-Counter aktiviert.

**Hidden Config:** Die Booth-App hat **keinen UI-Zugang** zu Drucker-Einstellungen. Kein Settings-Menü, kein Dropdown für Papiertyp. Der einzige Weg ein Medium zu aktivieren: **Packung scannen.**

| Was Partner sieht | Was Partner NICHT sieht |
|-------------------|------------------------|
| "DNP 4×6 Glossy ✅ — 327 Prints übrig" | PageSize, DPI, Laminate, CUPS-Optionen |
| "Papier scannen" Button | Drucker-Einstellungen |
| "Papier fast leer — nachbestellen?" | Technische Konfiguration |

Details: → `docs/PHOTO-BOOTH-PLATFORM-PLAN.md` Abschnitt 4.4

---

## 3. Sony ZV-E10 + gPhoto2 — Ergebnis: ⚠️ EINGESCHRÄNKT

### 3.1 Problem

Die Sony ZV-E10 hat **bekannte Probleme** mit gPhoto2:

| Issue | Problem | Status |
|-------|---------|--------|
| **#592** | ZV-E10 nicht in `--list-cameras` bei gPhoto2 2.5.28 | Behoben in neuerer Version |
| **#617** | `capture-image` gibt "Sorry, your camera does not support generic capture" | **Kamera-Firmware/Modus-Problem** |
| **Root Cause** | ZV-E10 meldet im USB-Modus nur "MTP" und "Mass Storage" — **kein PTP** | Firmware-Limitation |

### 3.2 Details

Die ZV-E10 meldet sich über USB als:
```
Device Capabilities:
  No Image Capture, No Open Capture, No vendor specific capture
```

Das bedeutet: Die Kamera unterstützt **keinen Remote-Capture über USB-PTP**. Sie erlaubt nur Datei-Download (lesen von SD-Karte).

### 3.3 Workaround: Sony "PC Remote" / Imaging Edge

Sony-Kameras unterstützen Remote-Capture über die **Sony Remote SDK** oder per **WiFi/PTP-IP**. Das ist aber:
- Proprietär (Sony SDK nur für Windows/Mac)
- Über WiFi (langsamer, instabiler als USB)
- Nicht von gPhoto2 unterstützt

### 3.4 Alternative: Sony mit gPhoto2-Support

Folgende Sony-Kameras haben **bestätigten gPhoto2 Capture-Support**:

| Modell | gPhoto2 Capture | Preis (gebraucht) | Für Booth geeignet? |
|--------|-----------------|-------------------|---------------------|
| **Sony Alpha A6000** | ✅ (PTP) | ~250-350€ | Ja |
| **Sony Alpha A6400** | ✅ (PTP) | ~500-700€ | Ja |
| **Sony Alpha A7 II** | ✅ (PTP) | ~600-800€ | Ja (Overkill) |
| **Sony ZV-1** | ✅ (PC Control Mode) | ~400-500€ | Ja (Kompakt) |

### 3.5 Bessere Wahl: Canon für gPhoto2

Canon-Kameras haben **den besten gPhoto2-Support** (Canon PTP ist am vollständigsten implementiert):

| Modell | gPhoto2 | Preis (neu) | Für Booth |
|--------|---------|-------------|-----------|
| **Canon EOS R100** | ✅ Vollständig | ~450€ | Perfekt |
| **Canon EOS 250D** | ✅ Vollständig | ~500€ | Perfekt |
| **Canon EOS M50 II** | ✅ Vollständig | ~550€ | Perfekt (Fiesta-Standard) |
| **Canon EOS R50** | ✅ Vollständig | ~650€ | Perfekt |

**Hinweis:** Canon EOS R100 ist die **Standard-Kamera bei Fiesta/PBSCO** — branchenerprobte Wahl.

### 3.6 Fazit Kamera

| Option | Bewertung | Empfehlung |
|--------|-----------|------------|
| **Sony ZV-E10 mit gPhoto2** | ⚠️ Kein USB-Capture | Nicht empfohlen als Booth-Kamera |
| **Sony ZV-E10 über WiFi SDK** | ⚠️ Instabil, proprietär | Nur als Notlösung |
| **Canon EOS R100** | ✅ Branchenstandard | **EMPFEHLUNG #1** |
| **Canon EOS 250D / R50** | ✅ Vollständiger Support | Alternative |
| **Sony ZV-E10 behalten** | ✅ Für Video/Vlog | Nicht für Booth, aber anderweitig nutzbar |

**Empfehlung: Canon EOS R100 (~450€) als Booth-Kamera kaufen.** Die Sony ZV-E10 kann weiterhin für Video-Content, 360°-Aufnahmen oder als Backup genutzt werden — aber nicht als primäre Booth-DSLR mit gPhoto2 auf Linux.

---

## 4. Zusammenfassung & Handlungsempfehlung

### ✅ Bestätigt — keine Risiken:
1. **DNP DS620A + CUPS + Linux** = funktioniert, Tier 1, branchenüblich
2. **Gutenprint 5.3.4+** = korrekte Farben, alle Features
3. **Linux-Entscheidung bleibt bestehen** — kein Grund für Windows wegen Drucker

### ⚠️ Anpassung nötig:
4. **Sony ZV-E10** = kein USB-Remote-Capture über gPhoto2
5. **Canon EOS R100** = empfohlene Booth-Kamera (~450€ Zusatz-Investition)
6. **Epson 3500 für Sticker** = wahrscheinlich nicht nötig — DNP DS620A kann perforiertes Papier

### 📋 Nächste Schritte:
1. Canon EOS R100 bestellen + gPhoto2 testen
2. DNP DS620A bestellen + Gutenprint auf Ubuntu testen
3. Sony ZV-E10 für 360°-Spinner / Video-Content einplanen
4. Perforiertes DNP-Media für Sticker-Druck testen

### 💰 Aktualisierte Hardware-Kosten:

| Posten | Alt | Neu | Differenz |
|--------|-----|-----|-----------|
| DSLR | 0€ (ZV-E10 vorhanden) | ~450€ (Canon EOS R100) | +450€ |
| Drucker | ~600-800€ (DNP DS620) | ~500-600€ (DS620A) | ±0€ |
| Sticker-Drucker | ~300€ (Epson 3500) | 0€ (DS620A Perforations-Media) | -300€ |
| **Netto-Differenz** | | | **+150€** |

Die Mehrkosten für die Canon halten sich in Grenzen, und wir sparen den separaten Sticker-Drucker.
