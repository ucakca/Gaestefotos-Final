# Git Policy (Repo Hygiene)

Dieses Repo ist produktiv und wird auf Servern deployed. Damit Änderungen nicht „unsichtbar“ werden oder lokal divergent laufen, gelten folgende Regeln.

## Ziel

- Keine „versteckten“ Änderungen durch lokale Ignore-Regeln.
- Reproduzierbare Builds und nachvollziehbare Commits.
- Klare Trennung zwischen:
  - Repo-weiten Ignore-Regeln (`.gitignore`)
  - rein lokalen Einstellungen (`.git/info/exclude`, IDE)

## Regeln

### 1) `.git/info/exclude` nur für echte lokale Noise

Erlaubt (Beispiele):

- IDE/OS-Müll (falls nicht schon durch `.gitignore` abgedeckt)
- persönliche Scratch-Dateien außerhalb von produktiven Pfaden

Nicht erlaubt:

- Patterns, die auf **getrackte** Pfade matchen (z.B. `packages/*/src/**`)
- Patterns, die echte Feature-Arbeit „verstecken“ können

Warum?

- `git status` wird unzuverlässig.
- Änderungen können übersehen und nie committed werden.
- Team-Mitglieder sehen unterschiedliche Realität.

### 2) Alles, was für alle gilt, kommt in `.gitignore`

- Build-Outputs (`dist/`, `.next/`, `out/`, etc.)
- Logs, Coverage, Test-Reports
- lokale Secrets / Credentials (z.B. `.env`, `/credentials/`)

### 3) Repo-Inhalte niemals „weg-ignorieren“, wenn sie Teil des Produkts sind

Wenn ein Ordner „zu noisy“ ist, ist das meistens ein Signal für:

- fehlende `.gitignore` Einträge für Generated/Build Artefakte
- falsche Projektstruktur (z.B. Generated Files im `src/`)

### 4) Einzeldateien lokal ausblenden (Ausnahmefall)

Wenn du **eine** Datei lokal ändern musst, aber nicht committen willst (z.B. temporäre Debug-Änderung), nutze stattdessen:

- `git update-index --assume-unchanged <file>`

und später wieder:

- `git update-index --no-assume-unchanged <file>`

Das ist immer besser als ganze Verzeichnisse in `.git/info/exclude` zu verstecken.

## Quick Checks

- **Verdacht auf „versteckte“ Änderungen**:
  - `git status --porcelain`
  - `git ls-files -m`
  - `git ls-files -o --exclude-standard`

- **Wenn plötzlich sehr viele untracked Files auftauchen**:
  - prüfen, ob vorher `.git/info/exclude` produktive Pfade enthalten hat

