# Task 17 — Sélecteur de modèle IA (Groq / Gemini) dans les paramètres

**Status: DONE**
**Priorité:** 🟡 Moyenne

## Goal

Permettre à l'utilisateur de choisir le modèle d'IA (ex: `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `gemini-2.5-flash`, etc.) depuis la modale de configuration des paramètres (`SettingsDialogComponent`), avec persistance côté client et transmission aux requêtes de chat/stream.

## Fichiers à créer/modifier

- `apps/frontend/src/app/core/services/ai-config.service.ts` : Nouveau service gérant le provider actif (`gemini` | `groq`), le modèle sélectionné et la liste des modèles disponibles.
- `apps/frontend/src/app/core/components/settings-dialog/settings-dialog-component.ts` : Ajout d'une section "AI Provider & Model Selection" (tabs ou selects daisyUI).
- `apps/frontend/src/app/core/services/message.service.ts` : Passer le modèle choisi et le provider dans la requête SSE / GraphQL.
- `libs/backend/feature-live/src/lib/ai-stream.controller.ts` : Accepter `model` et `provider` optionnels dans `StreamChatDto`.
- `libs/backend/feature-live/src/lib/ai-provider.service.ts` : Supporter le override du modèle et provider par requête.

## Étapes

1. Créer `AiConfigService` avec signaux `provider` ('groq' | 'gemini') et `selectedModel` sauvegardés dans le `localStorage`.
2. Mettre à jour `SettingsDialogComponent` avec un `<fieldset class="fieldset">` pour choisir le Provider et le Modèle.
3. Propager le choix dans `MessageService` (`streamViaSSE` et `sendViaGraphQL`).
4. Adapter `AiStreamController` et `AiProviderService` pour router la génération avec le modèle fourni.

## Critères d'acceptation

- [ ] L'utilisateur peut changer le provider et le modèle dans la boîte de dialogue de réglages.
- [ ] Le changement persiste après rechargement de page (`localStorage`).
- [ ] Les messages de chat utilisent le modèle sélectionné lors du streaming.
