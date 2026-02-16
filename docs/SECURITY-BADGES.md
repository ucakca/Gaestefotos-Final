# Security Badges & Zertifizierungen für gästefotos.com

> Stand: 15.02.2026 — Recherche-Ergebnis

---

## Relevante Optionen für uns (SaaS, B2C/B2B, Deutschland, DSGVO)

### 1. 🏆 Trusted Shops Gütesiegel (EMPFOHLEN für B2C)
- **Was**: Bekanntestes deutsches Trust-Siegel für Online-Shops/Services
- **Kosten**: ab ~99 €/Monat (je nach Umsatz)
- **Aufwand**: Prüfung durch Trusted Shops Auditor, ~2-4 Wochen
- **Prüft**: DSGVO-Konformität, AGB, Impressum, Widerrufsrecht, Zahlungssicherheit
- **Vorteil**: Höchste Bekanntheit bei deutschen Verbrauchern, Käuferschutz inklusive
- **URL**: https://business.trustedshops.com/products/trustmark
- **Passt für uns**: ✅ JA — wir verkaufen Pakete (B2C) über WooCommerce

### 2. 🔒 TÜV Süd "Safer Shopping" Siegel
- **Was**: TÜV-geprüftes Sicherheitssiegel
- **Kosten**: ab ~500 €/Jahr
- **Aufwand**: Technische + rechtliche Prüfung, ~4-6 Wochen
- **Prüft**: Datenschutz, Datensicherheit, Online-Inhalte, Prozesse
- **Vorteil**: Hohe Vertrauenswürdigkeit durch TÜV-Marke
- **URL**: https://www.tuvsud.com/de-de/dienstleistungen/produktzertifizierung/safer-shopping

### 3. 🛡️ GDPR/DSGVO-Zertifizierung (Art. 42 DSGVO)
- **Was**: Offizielle DSGVO-Datenschutz-Zertifizierung
- **Kosten**: ~1.000-5.000 € (je nach Anbieter)
- **Aufwand**: Datenschutz-Audit, Verarbeitungsverzeichnis, TOM-Dokumentation
- **Prüft**: Technische & organisatorische Maßnahmen, Datenschutzerklärung, Auftragsverarbeitung
- **Anbieter**: ePrivacy GmbH, datenschutz cert, TÜV
- **Passt für uns**: ✅ JA — wir verarbeiten Fotos mit Gesichtserkennung (sensible Daten)

### 4. 📊 SOC 2 Type II (für B2B/Enterprise)
- **Was**: Internationaler Standard für Datensicherheit bei Cloud-Services
- **Kosten**: 10.000-50.000 € (abhängig von Scope)
- **Aufwand**: 6-12 Monate, externer Auditor
- **Prüft**: Security, Availability, Processing Integrity, Confidentiality, Privacy
- **Passt für uns**: ⚠️ Erst wenn B2B-Partner es verlangen — aktuell zu teuer

### 5. 🏅 ISO 27001 (Enterprise-Level)
- **Was**: Internationaler Standard für Informationssicherheits-Management (ISMS)
- **Kosten**: 15.000-50.000 € (Zertifizierung + Aufbau ISMS)
- **Aufwand**: 6-18 Monate
- **Passt für uns**: ❌ Zu früh — erst ab signifikantem B2B-Umsatz sinnvoll

---

## Empfehlung: 3-Stufen-Plan

### Stufe 1 — JETZT machbar (0 €)
- ✅ **Security-Seite erstellen** auf gästefotos.com mit unseren Maßnahmen:
  - SSL/TLS Verschlüsselung
  - AES-256-GCM API-Key-Verschlüsselung
  - EXIF/GPS-Stripping (Datenschutz)
  - ClamAV Virus-Scanning
  - Firewall (ufw) aktiv
  - DSGVO-konform (EU-Hosting, Consent-Management)
  - Automatische Backups (daily/weekly/monthly)
  - Rate-Limiting & DDoS-Schutz
- ✅ **Trust-Badges auf der Landingpage**:
  - 🇦🇹 **Made in Austria** — Entwicklung & Betrieb aus Österreich
  - 🇪🇺 **EU-Hosting** — Server in der EU (Hetzner, Deutschland)
  - 🔒 **DSGVO-konform** — Datenschutz nach EU-Recht, Consent-Management
  - 🌱 **Green Hosting** — Hetzner nutzt 100% Ökostrom, CO₂-neutral
- ✅ **Verarbeitungsverzeichnis** erstellen (DSGVO Art. 30)

### Stufe 2 & 3 — Später evaluieren (aktuell nicht zutreffend)
- 🏆 **Trusted Shops Gütesiegel** (~100 €/Mo) — erst bei höherem B2C-Volumen
- 🛡️ **DSGVO-Zertifizierung** (~1-5K €) — erst bei B2B-Partnern/Enterprise-Kunden
- 📊 **SOC 2 / ISO 27001** — erst bei internationalem Wachstum

---

## Unser aktueller Security-Status

| Maßnahme | Status | Details |
|----------|--------|---------|
| SSL/TLS | ✅ | Let's Encrypt, auto-renew |
| AES-256-GCM | ✅ | API-Key-Verschlüsselung |
| EXIF-Stripping | ✅ | GPS/Metadaten entfernt |
| Virus-Scan | ✅ | ClamAV 1.4.3 integriert |
| Firewall | ✅ | ufw aktiv, 14 Ports |
| IP-Hashing | ✅ | SHA-256 für DSGVO |
| Rate-Limiting | ✅ | Per-Route Limiter |
| DB-Backups | ✅ | pg_dump daily/weekly/monthly |
| SQL-Injection-Schutz | ✅ | Prisma.sql überall |
| XSS-Schutz | ✅ | HTML-Escaping in E-Mails |
| Auth | ✅ | JWT + Session, Role-based |
| Upload-Validierung | ✅ | Magic-Byte + MIME-Type |
| DSGVO-Consent | ✅ | Face Search Einwilligung |
| Audit-Log | ✅ | Admin-Aktionen protokolliert |

> *Erstellt: 15.02.2026*
