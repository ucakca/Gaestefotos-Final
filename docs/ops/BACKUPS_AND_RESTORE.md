# Backups & Restore (Production)

## Ziel

- Datenverlust-Risiko reduzieren.
- Wiederherstellung planbar (RTO/RPO).

## Was muss gesichert werden?

- PostgreSQL Datenbank (Prisma Models)
- Objekt-Storage (Fotos/Videos) falls nicht durch Provider-Snapshots abgedeckt
- Secrets/ENV (nicht in Git) – separat sicher verwahren

## Backup Strategie (empfohlen)

- Täglich: DB Backup (logical `pg_dump` oder managed snapshots)
- Zusätzlich: regelmäßige Snapshots / point-in-time recovery (wenn Provider das kann)
- Aufbewahrung: z.B. 14 Tage daily + 3 Monate weekly (je nach Bedarf)

## Restore Drill

Mindestens 1x vor Launch testen:

- Backup einspielen in eine Staging-DB
- App startet und kann read-only Queries ausführen

## Dokumentation

- Wo liegen Backups (Pfad/Provider)?
- Wer hat Zugriff?
- Wie wird Restore durchgeführt?
- Wie wird geprüft, ob Backup „brauchbar“ ist?
