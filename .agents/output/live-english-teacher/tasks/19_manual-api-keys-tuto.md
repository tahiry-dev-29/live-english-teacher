# Task 19 — Gestion manuelle des clés d'API (Groq & Gemini) avec tutoriel & liens directs

**Status: DONE**
**Priorité:** 🟡 Moyenne

## Goal

Permettre aux utilisateurs de saisir manuellement leurs propres clés API (Groq et Gemini) dans la boîte de dialogue des paramètres, avec stockage local sécurisé (`localStorage`), mini-tutoriel d'obtention de clés étape par étape et liens directs vers les consoles développeurs.

## Fichiers créés/modifiés

- `apps/frontend/src/app/core/services/api-key.service.ts` : Service Angular gérant les clés API Groq et Gemini (`localStorage`, signaux réactifs, getters pour headers HTTP).
- `apps/frontend/src/app/core/components/settings-dialog/settings-dialog-component.ts` : Section Custom Keys avec inputs sécurisés, affichage/masquage mot de passe, bouton pour vider le champ, statuts visuels, accordéon tutoriel et liens directs vers la console Groq et Google AI Studio.
- `apps/frontend/src/app/core/services/message.service.ts` : Injection des headers `x-groq-api-key` et `x-gemini-api-key` dans les requêtes SSE et les mutations GraphQL via `HttpHeaders`.
- `apps/frontend/src/app/core/services/ai-config.service.ts` : Envoi des clés personnalisées pour la découverte dynamique des modèles du compte utilisateur.
- `libs/backend/feature-live/src/lib/ai-stream.controller.ts` : Extraction des en-têtes HTTP de clés d'API et propagation aux services d'inférence et de découverte.
- `libs/backend/feature-live/src/lib/live.resolver.ts` : Extraction des headers depuis le contexte GraphQL et transmission aux providers IA.
- `libs/backend/feature-live/src/lib/groq-live/groq-live.service.ts` : Prise en charge prioritaire de la clé Groq utilisateur.
- `libs/backend/feature-live/src/lib/gemini-live/gemini-live.service.ts` : Prise en charge prioritaire de la clé Gemini utilisateur.

## Critères d'acceptation

- [x] L'utilisateur peut renseigner, tester et effacer ses propres clés API Groq et Gemini.
- [x] Le tutoriel d'obtention est clair, lisible avec liens directs vers Google AI Studio et Groq Console.
- [x] Si une clé personnalisée est saisie, elle est utilisée en priorité lors des requêtes IA (SSE stream, GraphQL chat, découverte de modèles).

## Suivi (replanification providers 2026-09-16)

- Les clés par provider (ordre 1. provider → 2. clé → 3. modèles, tous providers) sont généralisées en **Task 29** (conversation) et **Task 30** (TTS) avec map générique `custom_api_keys` (compat ascendante Groq/Gemini).
- L'auto-save avec debounce (~500 ms) des inputs de clés est spécifié en **Task 20**.
