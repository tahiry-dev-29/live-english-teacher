# Task 30 — Providers TTS multi-fournisseurs + voix/modèles audio dynamiques

**Status: TODO**
**Priorité:** 🔴 Haute — après Task 20 (auto-save), avant Task 27 (validation)

## Goal

Fonctionnalité TTS complète : **le provider audio se choisit depuis une liste**, sa clé se saisit, puis **voix et modèles audio** sont découverts dynamiquement avec la clé effective. Même ordre imposé : **1. provider → 2. clé → 3. voix/modèles**.

## Contexte (état actuel)

- TTS = ElevenLabs en dur (`ElevenLabsService`, 8 voix en dur, `ELEVENLABS_API_KEY` serveur) + fallback Web Speech. Aucun choix de provider, aucune clé utilisateur, aucun modèle audio sélectionnable.
- STT = Groq Whisper `whisper-large-v3-turbo` en dur (TFN : modèle fixe, pas de choix).

## Liste providers TTS (donnée utilisateur, à exposer dans l'UI avec quotas)

| Fournisseur | Quota gratuit/mois | Qualité | Avis |
|---|---|---|---|
| Azure Speech | 500 000 caractères (gratuit à vie) | ⭐⭐⭐⭐⭐ Neural | **Meilleur choix** (quota + naturel) |
| Google Cloud | 1 à 4 M (selon voix) | ⭐⭐⭐⭐ fluide | Ultra généreux en volume |
| AWS Polly | 1 à 5 M | ⭐⭐⭐ correct à très bon | Gratuit 12 premiers mois seulement |
| OpenAI | 0 (payant dès le 1er caractère) | ⭐⭐⭐⭐⭐ naturel | Bloque vite sans carte |
| MiniMax | Crédits d'essai limités | ⭐⭐⭐⭐ | Quota variable |
| ElevenLabs (existant) | quota compte | ⭐⭐⭐⭐⭐ | Conservé comme provider du registre |
| Web Speech (navigateur) | illimité local | ⭐⭐ selon OS | Fallback gratuit toujours dispo |

## Registre TTS (backend, symétrique au registre conversation Task 29)

- `libs/backend/feature-live/src/lib/tts/tts-providers.registry.ts` — **créer** : `{ id, label, quotaNote, quality, voicesUrl, keyHeader, keyEnv, consoleUrl, defaultModel }`.
- Service routeur `TtsProviderService` : `getVoices(providerId, key?)`, `synthesize(providerId, voiceId, modelId?, text, key?)`.
- Adaptateurs : ElevenLabs (existante, à brancher sur le registre), Azure (`/cognitiveservices/v1`, clé = `Ocp-Apim-Subscription-Key`, voix via `GET /voices/list`), Google (`text:synthesize`, voix via `GET /voices`), AWS Polly (`DescribeVoices` + `SynthesizeSpeech` — SDK ou SigV4), OpenAI (`POST /v1/audio/speech`, modèles `tts-1` / `tts-1-hd`, voix listées), MiniMax (`/v1/t2a_v2`, voix catalogue).
- `POST /api/ai/tts` et `GET /api/ai/voices` acceptent `provider` (+ `modelId`, `voiceId`) et la clé via header ; clé effective = header sinon `.env` ; jamais en log.
- Prévisualisation voix (bouton play) via le provider actif.

## Frontend

- `TtsProviderService` (ou extension `ElevenLabsVoiceService` renommé) : `ttsProvider` signal (id registre, persisté), `ttsVoices`, `ttsModels` (si le provider expose des modèles : OpenAI tts-1/hd, Azure neural…), `fetchTtsVoices(providerId)` avec header de clé.
- `TtsService.speak()` : route vers le provider actif ( ElevenLabs → Azure → Google → Polly → OpenAI → MiniMax → Web Speech fallback), avec `providerId`, `voiceId`, `modelId` transmis au backend.
- Clés TTS dans `ApiKeyService` (map générique partagée avec Task 29, ex. `custom_api_keys['azure_tts']`).
- Onglet Voices du dialogue : 1. provider (+ quota/qualité/avis) → 2. clé (+ console/tuto) → 3. voix + modèles (auto-save, cf. Task 20).

## STT (complément, même chantier)

- `GroqTranscribeService` : modèle Whisper paramétrable (`whisper-large-v3-turbo` par défaut, autres `distil-*` sélectionnables) + clé utilisateur Groq si saisie (header existant).
- Option : exposer le choix du modèle STT dans l'onglet Voices (petit select, auto-save).

## Fichiers

- `libs/backend/feature-live/src/lib/tts/tts-providers.registry.ts` — créer
- `libs/backend/feature-live/src/lib/tts/tts-provider.service.ts` — créer (routeur)
- `libs/backend/feature-live/src/lib/tts/providers/*.ts` — adaptateurs (azure, google, polly, openai, minimax, elevenlabs)
- `libs/backend/feature-live/src/lib/elevenlabs/elevenlabs.service.ts` — brancher sur le registre (garder 8 voix en fallback)
- `libs/backend/feature-live/src/lib/ai-stream.controller.ts` — `GET /api/ai/voices?provider=`, `POST /api/ai/tts` (+ provider/modelId)
- `libs/backend/feature-live/src/lib/feature-live.module.ts` — providers TTS
- `libs/backend/feature-live/src/lib/groq-transcribe/groq-transcribe.service.ts` — modèle paramétrable + clé user
- `apps/frontend/src/app/core/services/api-key.service.ts` — clés TTS (map partagée, cf. Task 29)
- `apps/frontend/src/app/core/services/elevenlabs-voice.service.ts` — généraliser en provider TTS (ou nouveau service)
- `apps/frontend/src/app/core/services/tts.service.ts` — routage provider actif
- `apps/frontend/src/app/core/components/settings-dialog/settings-dialog-component.ts` — onglet Voices (ordre 1→2→3)

## Étapes

1. Registre TTS + routeur + ElevenLabs branché dessus (zéro régression).
2. Adaptateurs Azure, Google, Polly, OpenAI, MiniMax (voix + synthèse + modèles).
3. Endpoints voices/tts provider-aware + clés effectives.
4. Frontend : service TTS généralisé + `TtsService.speak()` routé + clés.
5. Onglet Voices (1. provider → 2. clé → 3. voix/modèles, auto-save) + select modèle STT.
6. Build + lint + prettier verify.

## Critères d'acceptation

- [ ] Chaque provider TTS liste ses voix (et modèles) avec la clé effective ; sans clé : voix serveur ou catalogue, jamais vide
- [ ] Quota/qualité/avis affichés par provider (tableau ci-dessus)
- [ ] Sélection provider → clé → voix/modèle appliquée immédiatement (auto-save)
- [ ] `speak()` utilise le provider/voix/modèle actifs ; fallback Web Speech si KO
- [ ] Modèle STT Whisper paramétrable (+ clé user si saisie)
- [ ] `nx build frontend` + `nx build backend` sans erreur, eslint/prettier verts
