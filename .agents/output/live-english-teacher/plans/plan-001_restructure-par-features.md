Plan-ID: plan-001

# Plan 001 — Restructuration par features (pas par types) + budget 200 lignes

**Projet:** live-english-teacher — branche `fix-features-ia-chat`
**Declencheur:** audit `thr-clean-code` — 37 fichiers `.ts` > 200 lignes
**Destination:** fichiers locaux (choix utilisateur)
**Stack:** Angular 20.3 standalone/Signals, aliases `@core/*` `@features/*` `@models/*`, daisyUI semantique, pas de NgModule/FormsModule/CommonModule

## 1. Constat (current_state)

Frontend `apps/frontend/src/app` structure **par types** :
- `core/components/*` (chat-input 533, settings-tab-general 521, audio-player 263, settings-dialog 261, settings-voices 243, call-interface 243, share-dialog 235, sidebar-list 226, select 225, voice-control 219, settings-tags 216)
- `core/services/*` (elevenlabs 457, tts 398, voice-call 363, theme 312, ai-config 304, message 256, tts-cache 220)
- `features/chat-room/*` (chat-page 425, message-item 440) — seule vraie feature, mais `chat-input` vit dans `core/components` alors qu'il importe `@features/chat-room/...` (couplage inverse).

Backend `libs/backend/feature-live/src/lib` a plat par types :
- `ai-stream.controller` 363 + spec 605, `live.resolver` 240 + spec 523, `tts-provider` 518 + spec 638, `ai-provider.spec` 407, `chat-history.spec` 392, `openai-compat` 253, `ai-models` 223 + spec 219, `groq-live` 255, `gemini-live` 216 + spec 216, `mock-prisma` 253, `user-data.controller` 202.
- Des dossiers features existent deja (gemini-live, groq-live, groq-transcribe, tts, chat-history, user-data, elevenlabs) mais cohabitent avec des fichiers racine.

## 2. Cible (interface_proposal) — structure par features

### Frontend — `apps/frontend/src/app/`

```text
app/
  core/             # TRANSVERSE UNIQUEMENT
    graphql/        # chat.operations, graphql.service
    constants/      # messages.ts
    utils/          # api-error, text, time, cookie, device-key, browser-speech.util
    models/         # fusion models/ racine ici (a trancher en T91)
  shared/
    ui/             # select, dropdown-menu, toast, star-background, space-illustration
    not-found-page/ # page 404
  features/
    chat/           # chat-page, chat-container, chat-welcome, message-item, chat-input, audio-recorder + message/chat/chat-stream/chat-audio services
    voice-call/     # call-interface, voice-control, audio-message-player + voice-call/vad/audio-recorder services
    tts-voice/      # tts-tester + tts/tts-cache/elevenlabs/browser-voice/browser-speech services
    settings/       # settings-dialog/* complet + ai-config/theme/language/i18n services
    sessions/       # sidebar-*, share-dialog, user-menu
    user-data/      # memory, prompt-tag, user-profile services
```

Regles : `core/` sans UI ni service metier apres migration. Chaque feature a `index.ts` (barrel). Imports via `@features/<slice>`, jamais `../../..`. `shared/ui` sans dependance metier.

### Backend — `libs/backend/feature-live/src/lib/`

```text
lib/
  ai-chat/      # ai-stream.controller, ai-provider.service, openai-compat, genkit-flow, live.resolver(+types), ai-providers.registry
  ai-models/    # ai-models.service
  tts/          # tts-provider.service, tts-providers.registry, elevenlabs/elevenlabs.service
  transcribe/   # groq-transcribe/, groq-live/, gemini-live/
  chat-history/ # existant
  user-data/    # existant + dto
  tutor/        # tutor-prompt.ts
  shared/       # constants/messages, dto/, testing/mock-prisma
  feature-live.module.ts # assemblage uniquement
```

Regles : specs co-localisees par slice. `feature-live.module.ts` = assemblage (imports de sous-slices).

## 3. Budget 200 lignes — splits prescrits (boundary_analysis)

| Fichier actuel | Lignes | Split prescrit |
|---|---|---|
| chat-input.component.ts | 533 | shell <150 + `chat-input-form.util.ts` + `chat-input-audio.component.ts` + `chat-input-state.service.ts` |
| settings-tab-general | 521 | shell + `settings-profile-form.component.ts` + `settings-appearance.component.ts` + `settings-general.util.ts` |
| elevenlabs-voice.service | 457 | facade <200 + `elevenlabs-catalog.service.ts` + `elevenlabs-audio.util.ts` |
| message-item | 440 | shell + `message-bubble.component.ts` + `message-actions.component.ts` + `message-content.util.ts` |
| chat-page | 425 | orchestration + `chat-page-state.service.ts` + `chat-share.util.ts` |
| tts.service | 398 | facade + `tts-playback.service.ts` + `tts-settings.util.ts` |
| ai-stream.controller 363 + spec 605 | spec split par route (ok/errors/quota) | routes fines + `ai-stream-sse.util.ts` + `ai-stream-validation.pipe.ts` |
| voice-call.service | 363 | etats + `voice-call-signaling.service.ts` + `voice-call-audio.util.ts` |
| theme.service | 312 | service + `theme-tokens.util.ts` + `theme-persistence.service.ts` |
| ai-config.service | 304 | service + `ai-models-catalog.util.ts` + `ai-providers.util.ts` |
| audio-message-player | 263 | shell + `audio-playback.service.ts` + `audio-time.util.ts` |
| settings-dialog-component | 261 | shell + `settings-dialog-state.service.ts` |
| message.service | 256 | facade + `message-store.service.ts` + `message-mapper.util.ts` |
| openai-compat | 253 | service + `openai-request.util.ts` + `openai-response.util.ts` |
| mock-prisma | 253 | service + `mock-prisma.factory.ts` + `mock-prisma.seed.ts` |
| live.resolver 240 + spec 523 | resolver fin + `live-chat.service.ts` ; specs par operation (chat/history) |
| ai-models.service 223 | service + `ai-models-cache.util.ts` |
| tts-provider 518 + spec 638 | facade + `tts-router.service.ts` + `tts-fallback.util.ts` ; specs par provider |
| ai-provider.spec 407 / chat-history.spec 392 | split par provider / par methode |
| call-interface 243, settings-voices 243, share-dialog 235, sidebar-list 226, select 225, voice-control 219, settings-tags 216, tts-cache 220, gemini-live 216, groq-live 255, groq-transcribe.spec 256, user-data.controller 202 | shell + `.util.ts` / sous-composant / sous-service, chaque morceau < 200 |

## 4. Contraintes et garde-fous

- Aliases `@core/*` `@features/*` `@models/*` conserves et etendus (`@shared/*` si cree — MAJ `apps/frontend/tsconfig.json` + `vitest.config.ts`).
- Angular strict : standalone, Signals (signal/computed/model/effect), `@if/@for/@switch`, pas de CommonModule/FormsModule, icones lucide uniquement.
- Migration par `git mv` + codemod d'imports, un slice par task, jamais de big-bang.
- Chaque task : `pnpm lint` + `tsc` + `build backend+frontend` + tests du slice + re-audit `thr-clean-code` du slice (0 flagged).
- Pas de changement de versions deps (`--frozen-lockfile`), pas de modif schema Prisma.

## 5. Sequencage (tasks 91-101, chacune porte `Plan: plan-001`)

- T91 scaffold + aliases + barrels + regle import (prerequis, bloque toutes).
- T92 chat, T93 voice-call, T94 tts-voice, T95 settings, T96 sessions/share — frontend, parallelisables apres T91.
- T97 shared/ui — apres T95/T96 (consommateurs select/dropdown/toast).
- T98 ai-chat, T99 tts+transcribe, T100 user-data+chat-history+tutor — backend, parallelisables entre eux.
- T101 validation finale + re-audit 200 lignes (bloque par toutes).

## 6. Test assertions (Act/Wait/Assert par task)

- Act : `git mv` + codemod imports du slice. Wait : `nx build/test/lint` du projet touche. Assert : (1) 0 import relatif `../../`, (2) 0 fichier du slice > 200 lignes (`wc -l`), (3) tests du slice verts, (4) smoke test route/ecran du slice.

## 7. Risques

- Import circulaire features <-> core → barrel `index.ts` par slice + lint `no-cycle` (a activer en T91).
- `chat-input` -> `@features/chat-room` inverse → resolu en migrant `chat-input` DANS `features/chat`.
- Specs backend volumineuses → split AVANT deplacement pour garder le vert.

**Readiness:** 8/10 — inventaire et splits definis, aliases connus, reste a trancher en T91 : fusion `models/` racine vers `core/models/` et nom d'alias `@shared/*`.
