# Task 05 — Nettoyage des warnings ESLint restants

**Status: DONE**

## Résultat
23 warnings → 0. Fixes : imports inutilisés supprimés, `implements OnDestroy`,
types timers (`ReturnType<typeof setTimeout>`), types SpeechRecognition dédiés
(SpeechRecognitionLike), typage Apollo générique (`query<T>` / `mutate<T>`),
`SpeechSynthesisErrorEvent`, catch sans binding inutile.

## Critères d'acceptation
- [x] `nx run-many -t build lint` → exit 0, 0 erreur, 0 warning

