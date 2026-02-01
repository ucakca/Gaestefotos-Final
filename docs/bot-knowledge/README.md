# Bot-Wissensbasis

Diese Dateien werden vom KI-Assistenten verwendet, um Fragen von Hosts zu beantworten.

## Struktur

```
bot-knowledge/
├── faq/                    # Häufige Fragen
│   ├── fotos.md           # Foto-Management
│   ├── gaeste.md          # Gäste einladen
│   ├── qr-code.md         # QR-Code Nutzung
│   └── alben.md           # Album-Verwaltung
│
├── features/               # Feature-Erklärungen
│   ├── face-search.md     # Gesichtserkennung
│   ├── challenges.md      # Foto-Challenges
│   └── guestbook.md       # Gästebuch
│
└── troubleshooting/        # Problemlösung
    ├── upload-fehler.md   # Upload-Probleme
    └── zugriff-probleme.md # Zugriff & Login
```

## Wie der Bot diese Dateien nutzt

1. **Keyword-Matching**: Fragen werden nach Keywords durchsucht
2. **Ähnlichkeits-Suche**: Ähnliche Fragen werden erkannt
3. **Fallback zu KI**: Nur bei neuen Fragen wird Groq API genutzt

## Neue Inhalte hinzufügen

1. Erstelle eine `.md` Datei im passenden Ordner
2. Nutze klare Überschriften (## Frage)
3. Schreibe einfache, verständliche Antworten
4. Der Bot lädt die Dateien automatisch

## Format-Richtlinien

- **Überschriften**: `## Frage?` für jede FAQ
- **Listen**: Nummeriert für Schritte, Bullets für Optionen
- **Fettdruck**: Für wichtige Begriffe
- **Emojis**: Sparsam für visuelle Orientierung
