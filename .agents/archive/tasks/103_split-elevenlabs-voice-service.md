# Task 103 — Split elevenlabs-voice.service.ts (214 lines) to under 200 lines

**Status: DONE (vérifié 2026-09-24 — elevenlabs-voice.service.ts 214 → 200 lignes, eslint 0, build OK, FE 65/65)**
**Plan:** plan-001
**Priority:** 🟡 Moyenne
**Depends:** T101

## Objectif

Diviser le service ElevenLabsVoiceService en déplaçant la logique d'idle load dans un fichier utilitaire séparé (elevenlabs-idle.util.ts) et en séparant éventuellement la logique de changement de provider.

## Etapes

1. Créer un fichier utilitaire pour la logique d'idle load (elevenlabs-idle.util.ts) dans le même répertoire.
2. Modifier le service pour utiliser cet utilitaire.
3. Supprimer la méthode `scheduleIdleLoad` du service.
4. Vérifier que le fichier résultant a moins de 200 lignes.

## Preuves

- wc -l sur le fichier modifié affiche < 200.

## Réalisé (2026-09-24)

- Nouveau `elevenlabs-idle.util.ts` (21 lignes) : `scheduleIdleCallback(run, timeoutMs, fallbackMs)`
  — `requestIdleCallback` avec repli `setTimeout`, garde SSR `typeof window === 'undefined'`.
- `scheduleIdleLoad()` (25 lignes de boilerplateRIC) supprimé ; le catalogue est amorcé par
  `bootstrapCatalog()` (fetchProviders + voix + modèles TTS, même ordre et mêmes clés).
- `elevenlabs-voice.service.ts` : **214 → 200 lignes** (plafond exactement atteint, budget ≤ 200).
- Preuves : ESLint 0 sur le slice, `tsc` 0, `nx build frontend` OK, `vitest` 65/65.