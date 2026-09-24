# Task 104 — Split gemini-stream.spec.ts (216 lines) to under 200 lines

**Status: DONE (vérifié 2026-09-24 — 216 → 45 + 74 + 115 (fixtures), backend 175/175)**
**Plan:** plan-001
**Priority:** 🟡 Moyenne
**Depends:** T101

## Objectif

Diviser la spécification gemini-stream.spec.ts en deux ou plusieurs fichiers de spécification plus petits, chacun couvrant un aspect différent du comportement (par exemple, succès, erreurs, cas limites).

## Etapes

1. Analyser la spécification actuelle pour identifier les groupes de tests logiques.
2. Créer de nouveaux fichiers de spécification (par exemple, gemini-stream-success.spec.ts, gemini-stream-errors.spec.ts, gemini-stream-edgecases.spec.ts).
3. Déplacer les tests appropriés dans chaque nouveau fichier.
4. S'assurer que tous les tests passent toujours.
5. Vérifier que chaque fichier résultant a moins de 200 lignes.

## Preuves

- wc -l sur chaque nouveau fichier de spécification affiche < 200.
- Tous les tests passent.

## Réalisé (2026-09-24)

- `gemini-stream.spec-fixtures.ts` (115) : réimplémentation inline partagée
  (`buildStreamUrl`, `parseGeminiSseLine`, `streamResponseDeltas`, `generateStream`, `chunk`,
  `sseResponse`) — pattern `*.spec-fixtures.ts` déjà utilisé par `ai-chat/`.
- `gemini-stream.spec.ts` (45) : URL `streamGenerateContent?alt=sse`, parsing SSE
  (deltas / keep-alive / `[DONE]` / JSON cassé), réassemblage de frames coupées.
- `gemini-stream-contract.spec.ts` (74) : contrat `generateStream` — yields progressifs,
  quota 429 server-key (throw), 429 user-key (no-throw), absence de clé.
- Preuves : `nx test backend` **175/175, 0 fail** (même total qu'avant split → couverture
  préservée), lint 0, build backend OK. Aucun fichier > 200.