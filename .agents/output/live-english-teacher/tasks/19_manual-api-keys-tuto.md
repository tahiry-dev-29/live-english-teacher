# Task 19 — Gestion manuelle des clés d'API (Groq & Gemini) avec tutoriel & liens directs

**Status: DONE**
**Priorité:** 🟡 Moyenne

## Goal

Permettre aux utilisateurs de saisir manuellement leurs propres clés API (Groq et Gemini) dans la boîte de dialogue des paramètres, avec stockage local sécurisé (`localStorage`), mini-tutoriel d'obtention de clés étape par étape et liens directs vers les consoles développeurs.

## Fichiers à créer/modifier

- `apps/frontend/src/app/core/services/api-key.service.ts` : Service Angular stockant `groqApiKey` et `geminiApiKey` (signaux, persistance chiffrée ou obfuscée dans localStorage, méthode de validation).
- `apps/frontend/src/app/core/components/settings-dialog/settings-dialog-component.ts` : Section "Custom API Keys" avec inputs sécurisés (masquage/affichage du token), badges de statut (Custom key active / Server default), lien direct Groq Console (`https://console.groq.com/keys`) et Google AI Studio (`https://aistudio.google.com/app/apikey`), ainsi qu'un accordéon/collapse daisyUI contenant le mini tutoriel pas-à-pas.
- `apps/frontend/src/app/core/services/message.service.ts` & headers de requête : Envoi des headers personnalisés optionnels `x-groq-api-key` / `x-gemini-api-key` dans les requêtes SSE / REST / GraphQL.
- `libs/backend/feature-live/src/lib/ai-stream.controller.ts` & `libs/backend/feature-live/src/lib/ai-provider.service.ts` : Prise en compte de la clé API fournie dans les headers si présente, sinon fallback sur la clé serveur `.env`.

## Étapes

1. Créer `ApiKeyService` avec signaux `customGroqKey`, `customGeminiKey`, `hasCustomGroqKey`, `hasCustomGeminiKey`.
2. Mettre en place l'UI dans `SettingsDialogComponent` :
   - Inputs avec bouton reveal/hide (`LucideEye` / `LucideEyeOff`).
   - Accordéon tutoriel daisyUI (`<div class="collapse collapse-arrow bg-base-100">`).
   - Liens directs avec icône externe (`LucideExternalLink`).
3. Transmettre les clés aux endpoints backend via headers HTTP `x-groq-key` / `x-gemini-key`.
4. Mettre à jour `AiProviderService` pour utiliser la clé fournie par l'utilisateur prioritairement.

## Critères d'acceptation

- [ ] L'utilisateur peut renseigner, tester et effacer ses propres clés API Groq et Gemini.
- [ ] Le tutoriel d'obtention est clair, lisible avec liens directs vers Google AI Studio et Groq Console.
- [ ] Si une clé personnalisée est saisie, elle est utilisée en priorité lors des requêtes IA.
