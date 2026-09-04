# Tâche 15 — STT vocal via Groq Whisper (free tier) — remplacer SpeechRecognition navigateur

**Status:** TODO
**Priorité:** 🔴 Haute
**Date:** 2026-09-04
**Source:** Diagnostic vocal 2026-09-04 — `webkitSpeechRecognition` (serveurs Google) non fiable sous Chromium/Linux : builds sans clé Google → erreur `network`, Firefox le désactive par défaut, Edge ne le supporte pas. La reconnaissance vocale doit passer par une API IA free tier déjà intégrée : **Groq** (task 02).

## Contexte

- Le mode live (`voice-call.service.ts`) utilise `window.SpeechRecognition/webkitSpeechRecognition` = audio envoyé aux serveurs Google, dépendant du navigateur. Sur la machine de dev (Linux, Chromium/Electron), l'API échoue (`network`) ou est absente.
- La VAD (`vad.service.ts`) détecte déjà début/fin de parole côté client — il reste à **enregistrer** l'audio pendant la parole et l'envoyer à une API de transcription.
- L'audio existe déjà comme input chat : `sendAudioMessage()` envoie `audioData` (base64) via `CHAT_MUTATION` → `live.resolver.ts chat()` → `AiProviderService` (Gemini multimodal). Le chemin réseau audio→backend est donc déjà prouvé.
- Groq propose en free tier : `whisper-large-v3` / `whisper-large-v3-turbo` (STT, formats flac/mp3/mp4/m4a/ogg/opus/wav/**webm**, ≤ 25 Mo/fichier, auto-détection de langue).
- ⚠️ TTS : Groq `playai-tts` est **anglais uniquement** → le TTS reste sur Web Speech API (corrigé en 2026-09-04). Seul le **STT** migre vers Groq.

## Actions

### Backend (`libs/backend/feature-live`)

- [ ] Créer `groq-transcribe.service.ts` : appel `POST https://api.groq.com/openai/v1/audio/transcriptions` (multipart/form-data, champ `file` = buffer décodé du base64, `model=whisper-large-v3-turbo`, `language` optionnel depuis `targetLanguage`, `temperature=0`) → renvoyer `{ transcript }`. Réutiliser la config clé `GROQ_API_KEY` du `AiProviderService` (extraire la lecture de clé en helper commun, pas de duplication).
- [ ] Exposer un endpoint REST dans `ai-stream.controller.ts` : `POST /api/ai/transcribe` — body JSON `{ audioData: string (base64), mimeType: string, language?: string }` (cohérent avec le flux audioData existant), DTO class-validator (base64 non vide, mimeType dans liste blanche audio, taille base64 ≤ ~30 Mo). Réponse `{ transcript: string }`.
- [ ] `nx run backend:build` passe.

### Frontend

- [ ] `message.service.ts` : méthode `transcribeAudio(audioData, mimeType, language)` → POST `/api/ai/transcribe`, retourne le transcript (gestion erreur → `null`).
- [ ] `voice-call.service.ts` : remplacer la boucle SpeechRecognition par le flux VAD+MediaRecorder :
  - au `onSpeechStart` : démarrer `MediaRecorder` sur le stream micro déjà ouvert par la VAD (`mimeType: 'audio/webm'`) ;
  - au `onSpeechEnd` : stopper l'enregistrement → blob → base64 → `transcribeAudio()` → si transcript non vide, passer par le chemin existant `processTranscript()` (`onTranscriptReady` inchangé) ;
  - garder `setState(PROCESSING)` pendant l'appel réseau, replanifier l'écoute après `finishSpeaking()`.
- [ ] Fallback : si `STT_PROVIDER` (environment) = `browser` ou si l'endpoint échoue → conserver le chemin SpeechRecognition actuel (le code existant devient la branche fallback, pas supprimé).
- [ ] `environment.ts` / `environment.prod.ts` : ajouter `sttProvider: 'groq' | 'browser'` (défaut `groq`).
- [ ] Optionnel : router `sendAudioMessage()` (chat texte, micro du chat-input) via Whisper quand provider=groq (aujourd'hui l'audio chat ne marche qu'avec Gemini) — sinon le documenter comme limite.

## Dépendances

- Tâche 02 (Groq AI integration) — DONE
- Tâches 04 + 09 (SSE, gateway supprimée) — DONE
- Tâche 08-e2e : nécessite `GROQ_API_KEY` en `.env` (même clé que le chat)

## Critères d'acceptation

- [ ] `curl -X POST localhost:3000/api/ai/transcribe -H 'Content-Type: application/json' -d '{"audioData":"<base64 d'un wav de test>","mimeType":"audio/wav","language":"en"}'` renvoie `{"transcript":"..."}` non vide
  - Générer un wav de test localement : `espeak-ng -w /tmp/test.wav "Hello there how are you"` (espeak-ng déjà installé)
- [ ] `nx run backend:build` et `nx run frontend:build` passent (`--skip-nx-cache`)
- [ ] En mode live dans Chromium/Linux **sans** support Google : parler → transcript affiché → réponse IA → TTS → `finishSpeaking()` réarme l'écoute (cycle complet)
- [ ] Le chemin SpeechRecognition reste fonctionnel quand `sttProvider: 'browser'`
- [ ] Aucun fichiers > 200 lignes (AGENT.MD) — splitter `voice-call.service.ts` si besoin (ex: `stt-recorder.util.ts`)

## Commandes de vérification

```bash
espeak-ng -w /tmp/test.wav "Hello there how are you" && \
  curl -X POST localhost:3000/api/ai/transcribe -H 'Content-Type: application/json' \
  -d "$(node -e 'const fs=require("fs");console.log(JSON.stringify({audioData:fs.readFileSync("/tmp/test.wav").toString("base64"),mimeType:"audio/wav",language:"en"}))')"
nx run backend:build --skip-nx-cache
nx run frontend:build --skip-nx-cache
```
