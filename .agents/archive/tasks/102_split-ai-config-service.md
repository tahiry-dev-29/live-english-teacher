# Task 102 — Split ai-config.service.ts (201 lines) to under 200 lines

**Status: DONE (vérifié 2026-09-24 — ai-config.service.ts 212 → 176 lignes, tsc 0, lint 0, build OK, FE 65/65)**
**Plan:** plan-001
**Priority:** 🟡 Moyenne
**Depends:** T101

## Objectif

Diviser le service AiConfigService en déplaçant la logique d'idle et de reconnect dans un fichier utilitaire séparé (ai-config-idle.util.ts) déjà créé, puis supprimer les méthodes correspondantes du service.

## Etapes

1. Vérifier que le fichier utilitaire ai-config-idle.util.ts existe et contient la logique nécessaire.
2. Supprimer les méthodes `scheduleIdleFetch` et `resubscribeOnReconnect` du service AiConfigService.
3. S'assurer que le constructeur utilise déjà l'utilitaire (déjà fait dans T101).
4. Vérifier que le fichier résultant a moins de 200 lignes.

## Preuves

- wc -l sur le fichier modifié affiche < 200.

## Réalisé (2026-09-24)

- `ai-config-idle.util.ts` (déjà créé par l'agent parallèle) **finalisé** : signature
  `fetchModels: (provider?: string, force?: boolean) => Promise<void)` — corrige le
  `TS2554: Expected 0 arguments, but got 2` (le reconnect forçait le refetch mais le
  callback ignorait les args).
- Suppression des 2 méthodes mortes du service (`scheduleIdleFetch`, `resubscribeOnReconnect`,
  35 lignes) — le constructeur appelle déjà l'helper.
- Callback corrigé : `(provider, force) => this.fetchModels(provider, force)` → le refetch
  `online` repasse bien en mode `force`.
- `ai-config.service.ts` : **212 → 176 lignes** · `ai-config-idle.util.ts` : 59.
- Preuves : `tsc -p apps/frontend/tsconfig.app.json` **0 erreur**, `pnpm lint` frontend 0,
  `nx build frontend` OK, `vitest` 65/65 (dont `ai-config.service.spec.ts`).