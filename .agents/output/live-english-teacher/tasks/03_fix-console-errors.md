# Task 03 — Fix erreurs console frontend

**Status: DONE**

## Cause racine

Le modèle Gemini `gemini-2.5-flash-preview-09-2025` a été **retiré par Google** →
`404 Not Found` sur chaque message → le frontend affichait "Error: Could not connect
to AI." Vérifié : `gemini-2.5-flash-preview-09-2025` → 404, `gemini-2.5-flash` → 200.
Le modèle TTS `gemini-2.5-flash-preview-tts` reste disponible.

## Fix

`GEMINI_CHAT_MODEL = 'gemini-2.5-flash'` dans `gemini-live.service.ts`.

## Critères d'acceptation

- [x] SSE renvoie une vraie réponse IA (`Hello! Great start. ...`)
- [x] Persistance DB OK (session + messages user/model)
