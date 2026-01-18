# Admin Dashboard - Benutzerfreundliche Anleitung

**Für wen ist dieses Dokument?** Für Administratoren ohne technischen Hintergrund.

## Was ist das Admin Dashboard?

Das Admin Dashboard ist deine zentrale Schaltzentrale für die Gästefotos-Plattform. Hier kannst du:
- 📊 Statistiken und Zahlen zur Plattform einsehen
- 👥 Nutzer verwalten
- 🎉 Events überwachen
- 📸 Fotos freigeben oder ablehnen
- 🔍 Fehler und Logs prüfen

## Zugang zum Admin Dashboard

### 1. Anmeldung
1. Gehe zu `https://app.gästefotos.com`
2. Melde dich mit deinem Admin-Account an
3. Klicke oben rechts auf dein Profil → "Admin Dashboard"

### 2. Was du siehst
Nach dem Login siehst du die **Hauptübersicht** mit:
- Anzahl der Nutzer
- Anzahl der Events
- Anzahl der Fotos
- Speicherplatz-Nutzung

## Wichtige Funktionen

### 📊 Dashboard (Startseite)

**Was zeigt es?**
- **Heute:** Wie viele neue Nutzer, Events und Fotos heute hinzugekommen sind
- **Gesamt:** Alle Nutzer, Events, Fotos seit Start
- **Wachstum:** Wie viel mehr Events/Fotos im Vergleich zum Vormonat
- **Speicher:** Wie viel Speicherplatz belegt ist

**Wofür brauche ich das?**
- Schneller Überblick über die Plattform-Aktivität
- Erkennen von Trends (wächst die Plattform?)
- Speicherplatz im Auge behalten

### 🎉 Event Management

**Was kann ich hier tun?**
- Alle Events anzeigen lassen
- Events suchen (nach Name)
- Events aktivieren/deaktivieren
- Events löschen

**Schritt-für-Schritt: Event deaktivieren**
1. Gehe zu `/admin/events`
2. Finde das Event in der Liste
3. Klicke auf den Schalter bei "Aktiv"
4. Das Event ist nun deaktiviert (Gäste können nicht mehr hochladen)

**Wann sollte ich ein Event deaktivieren?**
- Nach Ablauf der Veranstaltung
- Bei Missbrauch
- Auf Wunsch des Event-Erstellers

### 👥 User Management

**Was kann ich hier tun?**
- Alle Nutzer anzeigen
- Nutzer-Rollen ändern (Normal → Admin)
- Nutzer löschen

**Schritt-für-Schritt: Nutzer zum Admin machen**
1. Gehe zu `/admin/users`
2. Finde den Nutzer in der Liste
3. Klicke auf das Dropdown bei "Rolle"
4. Wähle "ADMIN"
5. Bestätige mit Klick auf "Speichern"

**Rollen-Erklärung:**
- **USER** - Normaler Nutzer, kann eigene Events erstellen
- **ADMIN** - Kann alles verwalten (wie du!)
- **SUPERADMIN** - Hat zusätzliche technische Rechte

### 📸 Content Moderation (Fotos prüfen)

**Was kann ich hier tun?**
- Fotos anschauen, die hochgeladen wurden
- Fotos freigeben (veröffentlichen)
- Fotos ablehnen (verstecken)
- Mehrere Fotos auf einmal bearbeiten

**Schritt-für-Schritt: Fotos freigeben**
1. Gehe zu `/admin/photos`
2. Wähle "Pending" im Filter (nur ungeprüfte Fotos)
3. Schaue dir die Fotos an
4. **Option A - Einzeln:**
   - Klicke auf das Häkchen ✓ zum Freigeben
   - Oder auf das X zum Ablehnen
5. **Option B - Mehrere auf einmal:**
   - Setze Häkchen bei den Fotos, die du bearbeiten willst
   - Klicke oben auf "Freigeben" oder "Ablehnen"

**Wann sollte ich Fotos ablehnen?**
- Unangemessene Inhalte
- Spam oder Werbung
- Technisch unbrauchbare Fotos (z.B. komplett schwarz)
- Verstöße gegen die Nutzungsbedingungen

### 🔍 System Logs (Fehlerprotokoll)

**Was zeigt es?**
- Technische Fehler, die auf der Plattform aufgetreten sind
- Zeitpunkt des Fehlers
- Details zum Fehler

**Was muss ich tun?**
Normalerweise: **Nichts!** 

**Aber:**
- Wenn Nutzer Probleme melden → Hier nachschauen, ob es technische Fehler gab
- Regelmäßig alte Logs löschen (älter als 30 Tage)

**Schritt-für-Schritt: Alte Logs löschen**
1. Gehe zu `/admin/logs`
2. Klicke oben auf "Alte Logs löschen (>30 Tage)"
3. Bestätige die Aktion
4. Fertig! Speicherplatz freigegeben

### 📈 Analytics (Statistiken)

**Was zeigt es?**
- **Top Events** - Welche Events haben die meisten Fotos?
- **Top Hosts** - Wer erstellt die meisten Events?
- **Aktivität** - Wie aktiv war die Plattform in den letzten 30 Tagen?

**Wofür brauche ich das?**
- Beliebte Events identifizieren
- Aktive Nutzer erkennen (z.B. für Partnerschaften)
- Trends erkennen (z.B. Hochzeit-Saison)

### ⚙️ System Settings (Systemeinstellungen)

**Was zeigt es?**
- Server-Status (läuft alles?)
- System-Informationen
- Speicherplatz

**Was kann ich tun?**
- System-Gesundheit prüfen
- Bei Problemen: Status-Informationen für Support bereitstellen

## Häufige Aufgaben

### Jeden Tag
- [ ] Dashboard checken (alles OK?)
- [ ] Neue Fotos moderieren (wenn aktiviert)

### Jede Woche
- [ ] Analytics anschauen (Trends erkennen)
- [ ] Speicherplatz prüfen

### Jeden Monat
- [ ] Alte Logs löschen
- [ ] Inaktive Events archivieren

## Fehlerbehebung

### "Ich kann das Admin Dashboard nicht öffnen"
**Mögliche Ursachen:**
1. Du bist nicht als Admin angemeldet
   - **Lösung:** Kontaktiere einen Super-Admin für Rollen-Änderung
2. Du bist nicht eingeloggt
   - **Lösung:** Melde dich zuerst an
3. Technisches Problem
   - **Lösung:** Seite neu laden (F5), Browser-Cache leeren

### "Ich sehe keine Fotos zum Moderieren"
**Mögliche Ursachen:**
1. Es gibt aktuell keine neuen Fotos
   - **Normal!** Komm später wieder
2. Filter ist falsch gesetzt
   - **Lösung:** Setze Filter auf "Pending"
3. Alle Fotos wurden schon moderiert
   - **Super!** Gute Arbeit erledigt

### "Zahlen im Dashboard stimmen nicht"
**Mögliche Ursachen:**
1. Cache nicht aktualisiert
   - **Lösung:** Seite neu laden (F5)
2. Verzögerung in der Datenbank
   - **Lösung:** 1-2 Minuten warten, dann neu laden

### "Ich habe ausversehen etwas gelöscht"
**Was tun?**
1. **Sofort Bescheid geben!** Kontaktiere den technischen Support
2. **Nicht weiterklicken** - Keine weiteren Aktionen durchführen
3. In vielen Fällen können Daten wiederhergestellt werden

## Sicherheits-Tipps

### ✅ DO's (Das solltest du tun)
- ✅ Regelmäßig Passwort ändern
- ✅ 2-Faktor-Authentifizierung aktivieren
- ✅ Nur auf vertrauenswürdigen Geräten anmelden
- ✅ Nach Arbeit ausloggen
- ✅ Verdächtige Aktivitäten melden

### ❌ DON'Ts (Das solltest du NICHT tun)
- ❌ Passwort mit anderen teilen
- ❌ Admin-Zugang auf öffentlichen PCs nutzen
- ❌ Unbekannte Links im Admin-Bereich klicken
- ❌ Ohne Nachdenken viele Datensätze löschen
- ❌ Nutzer ohne Grund zu Admins machen

## Wichtige Hinweise

### ⚠️ Vorsicht bei diesen Aktionen:
1. **Nutzer löschen** - Kann NICHT rückgängig gemacht werden!
2. **Events löschen** - Alle Fotos gehen verloren!
3. **Rollen ändern** - Admins haben volle Macht!
4. **Bulk-Delete** - Mehrere Fotos auf einmal löschen

**Goldene Regel:** Im Zweifel lieber nochmal nachfragen!

## Support & Hilfe

### Wer hilft mir?
- **Technische Probleme:** Technischer Support kontaktieren
- **Fragen zur Nutzung:** Diese Anleitung oder andere Admins fragen
- **Kritische Fehler:** SOFORT technischen Support informieren

### Was braucht der Support von mir?
1. **Was wolltest du tun?** (z.B. "Event löschen")
2. **Was ist passiert?** (z.B. "Fehlermeldung erschien")
3. **Wann ist es passiert?** (Datum + Uhrzeit)
4. **Screenshot** (falls möglich)

## Glossar (Begriffe erklärt)

- **Bulk-Action** = Mehrere Dinge auf einmal bearbeiten
- **Dashboard** = Übersichts-Startseite
- **Filter** = Anzeige eingrenzen (z.B. nur "Pending" Fotos)
- **Log** = Protokoll/Aufzeichnung von Ereignissen
- **Moderation** = Prüfung und Freigabe von Inhalten
- **Pagination** = Seitenweise Anzeige (wenn viele Einträge)
- **Status** = Zustand (z.B. "Pending" = wartet auf Prüfung)

## Schnellreferenz

| Aufgabe | Wo finde ich das? | Was klicke ich? |
|---------|-------------------|-----------------|
| Events anzeigen | `/admin/events` | - |
| Event deaktivieren | `/admin/events` | Schalter bei "Aktiv" |
| Nutzer zu Admin machen | `/admin/users` | Rolle → ADMIN → Speichern |
| Fotos freigeben | `/admin/photos` | Häkchen ✓ |
| Fotos ablehnen | `/admin/photos` | X |
| Logs löschen | `/admin/logs` | "Alte Logs löschen" |
| Statistiken anschauen | `/admin/analytics` | - |

---

**Letzte Aktualisierung:** 18.01.2026  
**Version:** 2.0  
**Fragen?** Technischen Support kontaktieren
