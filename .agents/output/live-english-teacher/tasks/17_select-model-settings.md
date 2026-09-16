# Task 17 — Sélecteur de modèle IA (Groq / Gemini) dans les paramètres

**Status: DONE**
**Priorité:** 🟡 Moyenne

## Goal

Permettre à l'utilisateur de choisir le modèle d'IA (ex: `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `gemini-2.5-flash`, etc.) depuis la modale de configuration des paramètres (`SettingsDialogComponent`), avec persistance côté client et transmission aux requêtes de chat/stream.

## Réponse : oui, la liste est dynamique (conversation)

- `GET /api/ai/models` (`AiModelsService`) interroge les APIs officielles **avec la clé effective = clé utilisateur (header `x-groq-api-key` / `x-gemini-api-key`) si saisie, sinon clé serveur `.env`**. Donc la liste reflète le compte/quotas liés à la clé active.
- `AiConfigService.fetchModels()` envoie les headers des clés saisies ; `ensureValidSelection()` rebascule sur un modèle valide si la sélection n'existe plus ; bouton Live Sync pour rafraîchir.
- Fallback : 2 modèles Groq + 2 Gemini en dur si aucune clé / API KO.

## Fichiers créés/modifiés

- `libs/backend/feature-live/src/lib/ai-models.service.ts` : Service backend effectuant la découverte dynamique des modèles actifs via les APIs officielles Groq (`/openai/v1/models`) et Google Gemini (`/v1beta/models`) avec fallback automatique.
- `libs/backend/feature-live/src/lib/ai-stream.controller.ts` : Endpoint `GET /api/ai/models` supportant les headers de clés personnalisées.
- `apps/frontend/src/app/core/services/ai-config.service.ts` : Service gérant la synchronisation dynamique (`fetchModels`), la détection de modèles obsolètes et le basculement automatique.
- `apps/frontend/src/app/core/components/settings-dialog/settings-dialog-component.ts` : Section AI Model avec bouton Live Sync (`LucideRotateCw`), état de chargement et sélection persistante.
- `apps/frontend/src/app/core/services/message.service.ts` : Transmission dynamique du modèle et des clés dans les flux SSE et requêtes GraphQL.
- `libs/backend/feature-live/src/lib/ai-provider.service.ts` : Prise en charge du modèle et provider par requête.

## Critères d'acceptation

- [x] L'utilisateur peut changer le provider et le modèle dans la boîte de dialogue de réglages.
- [x] Les modèles disponibles sont découverts dynamiquement auprès des providers (Groq et Gemini) pour éviter les modèles obsolètes.
- [x] Un bouton Live Sync permet de rafraîchir en direct la liste des modèles actifs associés aux clés d'API.
- [x] Le changement persiste après rechargement de page (`localStorage`).
- [x] Les messages de chat utilisent le modèle sélectionné lors du streaming.

## Suivi (replanification providers 2026-09-16)

- La généralisation multi-providers conversation (OpenAI, Anthropic, Mistral, DeepSeek, Qwen…) est replanifiée en **Task 29** (registre dynamique, ordre imposé : 1. provider → 2. clé → 3. modèles). Les clés saisies ici (Groq/Gemini) sont reprises dans la map générique (compat ascendante).
- L'auto-save du dialogue (suppression Save/Cancel) est en **Task 20** et s'applique aussi à cet onglet.
