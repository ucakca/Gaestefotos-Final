# ⚠️ Prisma Migration Drift - Sichere Lösung

**Datum:** 2026-01-10  
**Problem:** Migration Drift erkannt - Datenbank hat Tabellen, die nicht in Migrations dokumentiert sind

---

## 🚨 WICHTIG: NICHT "y" drücken!

**Prisma möchte das Schema zurücksetzen → ALLE DATEN WÜRDEN GELÖSCHT!**

---

## 📋 Problem-Analyse

### Fehlende Migrations in Dateisystem:

Die Datenbank hat folgende Migrations angewendet, die lokal fehlen:
- `20260118121716_add_design_studio_tables`
- `20260119220000_qr_templates` (2x?)
- `20260120002700_qr_templates`

### Tabellen in DB, aber nicht in Migrations:

- `design_projects` ✅ (existiert im Schema)
- `design_templates` ✅ (existiert im Schema)
- `password_reset_tokens` ✅ (existiert im Schema)
- `print_service_settings` ✅ (existiert im Schema)
- `qr_designs` ✅ (existiert im Schema)
- `qr_templates` ✅ (existiert im Schema)

**Gute Nachricht:** Alle Tabellen existieren bereits im Prisma Schema!

---

## ✅ Sichere Lösung (OHNE Datenverlust)

### Option 1: Baseline-Migration erstellen (EMPFOHLEN)

**Schritt 1:** Migration als "baseline" markieren

```bash
cd /root/gaestefotos-app-v2/packages/backend

# Erstelle eine Baseline-Migration, die den aktuellen DB-Zustand dokumentiert
pnpm exec prisma migrate resolve --applied 20260118121716_add_design_studio_tables
pnpm exec prisma migrate resolve --applied 20260119220000_qr_templates
pnpm exec prisma migrate resolve --applied 20260120002700_qr_templates
```

**Schritt 2:** Prüfe ob das funktioniert

```bash
pnpm exec prisma migrate status
```

**Schritt 3:** Falls das nicht funktioniert, erstelle manuelle Baseline-Migration

```bash
# Erstelle leere Migration, die als Baseline dient
mkdir -p prisma/migrations/20260118121716_add_design_studio_tables
echo "-- Baseline: Diese Tabellen existieren bereits in der DB" > prisma/migrations/20260118121716_add_design_studio_tables/migration.sql

mkdir -p prisma/migrations/20260119220000_qr_templates
echo "-- Baseline: Diese Tabellen existieren bereits in der DB" > prisma/migrations/20260119220000_qr_templates/migration.sql

mkdir -p prisma/migrations/20260120002700_qr_templates
echo "-- Baseline: Diese Tabellen existieren bereits in der DB" > prisma/migrations/20260120002700_qr_templates/migration.sql
```

**Schritt 4:** Markiere als angewendet

```bash
pnpm exec prisma migrate resolve --applied 20260118121716_add_design_studio_tables
pnpm exec prisma migrate resolve --applied 20260119220000_qr_templates
pnpm exec prisma migrate resolve --applied 20260120002700_qr_templates
```

### Option 2: Schema mit DB synchronisieren (Alternative)

**Wenn Option 1 nicht funktioniert:**

```bash
# 1. Aktuelles Schema aus DB ziehen
pnpm exec prisma db pull

# 2. Prüfe Unterschiede
pnpm exec prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma \
  --script > /tmp/drift.sql

# 3. Prüfe die Unterschiede
cat /tmp/drift.sql

# 4. Falls leer/nur Indexes: Erstelle Baseline-Migration
```

---

## 🎯 Empfohlene Vorgehensweise

### Schritt 1: Prüfe Migration-History in DB

```bash
cd /root/gaestefotos-app-v2/packages/backend
psql $DATABASE_URL -c "SELECT migration_name, applied_steps_count FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 10;"
```

### Schritt 2: Erstelle Baseline-Migrations

```bash
# Erstelle Verzeichnisse für fehlende Migrations
mkdir -p prisma/migrations/20260118121716_add_design_studio_tables
mkdir -p prisma/migrations/20260119220000_qr_templates
mkdir -p prisma/migrations/20260120002700_qr_templates

# Erstelle leere Migration-Dateien (Baseline)
cat > prisma/migrations/20260118121716_add_design_studio_tables/migration.sql << 'EOF'
-- Baseline Migration
-- Diese Tabellen existieren bereits in der Datenbank:
-- - design_projects
-- - design_templates
-- Diese Migration dokumentiert den bestehenden Zustand.
EOF

cat > prisma/migrations/20260119220000_qr_templates/migration.sql << 'EOF'
-- Baseline Migration
-- Diese Tabellen existieren bereits in der Datenbank:
-- - qr_templates
-- Diese Migration dokumentiert den bestehenden Zustand.
EOF

cat > prisma/migrations/20260120002700_qr_templates/migration.sql << 'EOF'
-- Baseline Migration
-- Diese Tabellen existieren bereits in der Datenbank:
-- - qr_designs
-- Diese Migration dokumentiert den bestehenden Zustand.
EOF
```

### Schritt 3: Markiere als angewendet

```bash
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
pnpm exec prisma migrate dev --name add_cms_content_snapshot
```

---

## ⚠️ Was NICHT tun:

1. ❌ **NICHT "y" drücken** - Das würde alle Daten löschen!
2. ❌ **NICHT `prisma migrate reset`** - Löscht alle Daten
3. ❌ **NICHT Schema manuell ändern** ohne Migration

---

## 🔍 Warum ist das passiert?

**Mögliche Ursachen:**
1. Migrations wurden manuell in DB angewendet (ohne Prisma)
2. Migrations wurden gelöscht/verschoben
3. Schema wurde direkt in DB geändert
4. Git-Repository wurde zurückgesetzt, aber DB nicht

**Lösung:** Baseline-Migrations erstellen, die den aktuellen Zustand dokumentieren.

---

## ✅ Nach erfolgreicher Baseline

**Dann kannst du:**
- ✅ Neue Migrations erstellen (`prisma migrate dev`)
- ✅ Schema ändern ohne Datenverlust
- ✅ Migrations-History ist konsistent

---

**Status:** ⚠️ **WARTET AUF BENUTZER-ENTSCHEIDUNG**  
**Empfehlung:** Option 1 (Baseline-Migrations) - KEIN Datenverlust!
