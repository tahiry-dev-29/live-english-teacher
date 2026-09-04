# live-english-teacher — PRD (V1: daisyUI migration)

## Ce que la V1 fait

Migration du design system frontend vers **daisyUI 5** avec thème `halloween`. Remplacement de tous les Tailwind utilitaires personnalisés (`bg-gray-950`, `from-blue-XXX`, `text-blue-XXX`, etc.) par des classes daisyUI sémantiques (`base-*`, `primary`, `secondary`, `error`, `success`, etc.). Tous les composants UI seront refactorisés pour utiliser les composants et couleurs daisyUI.

## Ce que la V1 NE fait PAS (hors scope volontaire)

- Nouveaux features fonctionnels ou changements de conception
- Migration backend (NestJS, Prisma, GraphQL)
- Remplacement de Socket.IO par SSE (déjà fait en tâche 04)
- Ajout de nouveaux composants ou pages

## Parcours ou cas d'usage clés

1. Connecter au chat session existant
2. Envoyer et recevoir des messages IA avec streaming
3. Mode appel vocal (live call)
4. Interface d'enregistrement audio
5. Gestion des paramètres et voix
6. Affichage des erreurs et états de chargement

## Critères de succès de la V1

- `nx run frontend:build` passe avec 0 erreur
- `nx run-many -t lint` passe avec 0 erreur / 0 warning
- Plus aucune classe `bg-gray-950` / `from-blue-600` / `text-blue-400` dans les templates
- Template `data-theme="halloween"` actif sur `<html>`
- Tous les composants daisyUI listés dans la tâche 06 utilisent les classes sémantiques
- Build de production réussi

## Contraintes techniques connues à ce stade

Voir `.agents/rules/stack.md` pour le détail. Contraintes clés :

- Angular 20.3 standalone, Signals
- daisyUI 5 + thème halloween
- Aucune classe CSS custom `/deep/` ou `@apply` personalisé
- Composants must use daisyUI `btn`, `card`, `modal`, `input`, `select`, etc. sémantiques
