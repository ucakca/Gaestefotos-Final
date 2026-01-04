# 2FA Key Rotation (TOTP Secret Encryption)

## Ziel

- Verschlüsselungs-Key rotieren, ohne bestehende TOTP-Secrets ungültig zu machen.

## Env Vars

- `TWO_FACTOR_ENCRYPTION_KEY` (legacy single key)
- `TWO_FACTOR_ENCRYPTION_KEYS` (neu, comma-separated)

## Verhalten

- Encrypt: nimmt immer den **ersten** Key aus `TWO_FACTOR_ENCRYPTION_KEYS`.
- Decrypt: probiert **alle** Keys in Reihenfolge.

## Rotation Ablauf (empfohlen)

1) Neuen Key hinzufügen (vorne):

- `TWO_FACTOR_ENCRYPTION_KEYS="NEW_KEY,OLD_KEY"`

2) Deploy Backend.

3) Warten (bis alle aktiven TOTP-Secrets einmal erfolgreich gelesen wurden) und/oder einen Zeitraum definieren.

4) Alten Key entfernen:

- `TWO_FACTOR_ENCRYPTION_KEYS="NEW_KEY"`

## Notes

- Keys müssen stabil und sicher gespeichert werden (Secret Manager / Plesk ENV / Vault etc.).
- Nie Keys in Git committen.
