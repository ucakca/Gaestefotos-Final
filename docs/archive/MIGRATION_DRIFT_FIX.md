# ⚠️ Prisma Migration Drift - SICHERE Lösung

**WICHTIG:** ❌ **NICHT "y" drücken!** Das würde alle Daten löschen!

---

## 🎯 Lösung: Baseline-Migrations erstellen

Die Datenbank hat Migrations angewendet, die lokal fehlen. Wir erstellen Baseline-Migrations, die den aktuellen Zustand dokumentieren.

---

## 📋 Schritt-für-Schritt Anleitung

### Schritt 1: Prüfe welche Migrations fehlen

Prisma hat bereits erkannt:
- `20260118121716_add_design_studio_tables`
- `20260119220000_qr_templates`
- `20260120002700_qr_templates`

### Schritt 2: Erstelle Baseline-Migrations

**Führe diese Befehle aus:**

```bash
cd /root/gaestefotos-app-v2/packages/backend

# Erstelle Verzeichnisse für fehlende Migrations
mkdir -p prisma/migrations/20260118121716_add_design_studio_tables
mkdir -p prisma/migrations/20260119220000_qr_templates
mkdir -p prisma/migrations/20260120002700_qr_templates

# Erstelle Baseline-Migration für design_studio_tables
cat > prisma/migrations/20260118121716_add_design_studio_tables/migration.sql << 'EOF'
-- Baseline Migration: design_projects und design_templates
-- Diese Tabellen existieren bereits in der Datenbank.
-- Diese Migration dokumentiert den bestehenden Zustand.
-- Keine Änderungen nötig - Tabellen sind bereits vorhanden.
EOF

# Erstelle Baseline-Migration für qr_templates
cat > prisma/migrations/20260119220000_qr_templates/migration.sql << 'EOF'
-- Baseline Migration: qr_templates
-- Diese Tabelle existiert bereits in der Datenbank.
-- Diese Migration dokumentiert den bestehenden Zustand.
-- Keine Änderungen nötig - Tabelle ist bereits vorhanden.
EOF

# Erstelle Baseline-Migration für qr_designs
cat > prisma/migrations/20260120002700_qr_templates/migration.sql << 'EOF'
-- Baseline Migration: qr_designs
-- Diese Tabelle existiert bereits in der Datenbank.
-- Diese Migration dokumentiert den bestehenden Zustand.
-- Keine Änderungen nötig - Tabelle ist bereits vorhanden.
EOF
```

### Schritt 3: Markiere Migrations als angewendet

```bash
# Markiere alle drei als bereits angewendet
pnpm exec prisma migrate resolve --applied 20260118121716_add_design_studio_tables
pnpm exec prisma migrate resolve --applied 20260119220000_qr_templates
pnpm exec prisma migrate resolve --applied 20260120002700_qr_templates
```

### Schritt 4: Prüfe Status

```bash
pnpm exec prisma migrate status
```

**Erwartetes Ergebnis:**
```
Database schema is up to date!
```

### Schritt 5: Jetzt neue Migration erstellen

```bash
# Jetzt kannst du die neue Migration erstellen
pnpm exec prisma migrate dev --name add_cms_content_snapshot
```

---

## 🔍 Alternative: Wenn Schritt 3 nicht funktioniert

Falls `prisma migrate resolve` nicht funktioniert, verwende:

```bash
# Erstelle Baseline-Migration manuell
pnpm exec prisma migrate dev --create-only --name baseline_missing_migrations

# Dann editiere die erstellte Migration und mache sie leer (nur Kommentar)
# Dann markiere als angewendet:
pnpm exec prisma migrate resolve --applied <migration_name>
```

---

## ✅ Was passiert?

1. **Baseline-Migrations** dokumentieren den aktuellen DB-Zustand
2. **Keine Daten werden gelöscht** - nur Migration-History wird synchronisiert
3. **Zukünftige Migrations** funktionieren normal

---

## ⚠️ Was NICHT tun:

- ❌ **NICHT "y" drücken** bei der Reset-Abfrage
- ❌ **NICHT `prisma migrate reset`** ausführen
- ❌ **NICHT Schema manuell ändern** ohne Migration

---

**Status:** ⚠️ **WARTET AUF BENUTZER-ENTSCHEIDUNG**  
**Empfehlung:** Führe die Schritte 2-4 aus, dann kannst du Schritt 5 machen
