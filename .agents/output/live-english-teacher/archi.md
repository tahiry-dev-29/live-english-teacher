# live-english-teacher — Architecture technique

## Stack (`.agents/rules/stack.md`)

**Frontend**: Angular ~20.3 (standalone, Signals, `resource()`, inline templates) — Nx workspace

- DaisyUI 5 + thème `halloween` (déjà dans `styles.css` : `@plugin "daisyui" { themes: halloween --default; }`)
- TailwindCSS v4, PostCSS
- Services: chat.service.ts, message.service.ts, tts.service.ts, voice-call.service.ts, vad.service.ts
- Aucun NgModule — tous les composants sont **standalone**

**Backend**: NestJS 11 + Express 5 (`@as-integrations/express5`), global prefix `api`

- GraphQL : `@nestjs/graphql` + `@nestjs/apollo`, resolver unique `live.resolver`
- WebSocket : Gateway identifiée comme code mort (aucun socket.io-client côté frontend)
- IA : Gemini via fetch direct + Genik flows
- Prisma 6 + PostgreSQL local

**Outils**: Nx 22, ESLint 9, Prettier 2, pnpm 11

**Contraintes**:

- Ne jamais changer les versions deps sans validation explicite → `--frozen-lockfile`
- Prisma client généré dans le chemin par défaut
- **Pas de `synchronize: true` en prod**
- **DTOs validés** via class-validator
- **Pas de NgModules** — Angular Signals only
- **Couleurs sémantiques daisyUI uniquement** (pas de `dark:` avec ces couleurs)
- Interdiction imports relatifs 2+ niveaux — path aliases `@environment`, `@models/*`, `@core/*`, `@features/*`

## Modélisation des données

Aucune modélisation de données supplémentaire — les données existent déjà en PostgreSQL via Prisma schema. La migration concerne uniquement le rendu frontend. Les schémas Prisma (sessions, messages) restent inchangés.

## Modules / services backend

Aucun changement backend requis pour cette V1. L'API (GraphQL via Apollo resolvers + SSE streaming `POST /api/ai/chat/stream`) est inchangée. Le gateway Socket.IO `live.gateway.ts` a été marqué comme code mort (task 04) mais les dépendances `socket.io` restent pour l'instant dans `package.json` par contrainte `frozen-lockfile`.

## Endpoints API

| Méthode  | Route                 | Description                                                       | Auth                        |
| -------- | --------------------- | ----------------------------------------------------------------- | --------------------------- |
| POST     | `/api/ai/chat/stream` | Streaming réponse IA token par token, création/séance persistance | Oui (AI_PROVIDER dans .env) |
| Mutation | GraphQL `chat`        | Envoyer message utilisateur                                       | Oui                         |
| GET      | `/api/sessions`       | Lister sessions utilisateur                                       | Oui                         |

## Routes & composants frontend — Migration daisyUI 5

| Route / Composant      | Classes actuelles                                                                                                                 | Classes cibles daisyUI                                                                                                                                                               | Statut     |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| `chat-page`            | `bg-gray-950`, `from-blue-400 to-purple-400`, `text-white`, `btn` (custom)                                                        | `base-100`, `base-content`, `btn btn-primary`/`btn-success`, `data-theme="halloween"`                                                                                                | À migrer   |
| `sidebar`              | `bg-gray-950`, `bg-gray-900`, `border-gray-800`, `text-gray-400/50`, `bg-blue-600/50`                                             | `base-200`, `base-300`, `border-base-300`, `btn btn-ghost btn-circle`                                                                                                                | À migrer   |
| `user-menu`            | Classes avatar custom, gradients                                                                                                  | `avatar`, `avatar-placeholder`, `btn btn-ghost btn-circle`                                                                                                                           | À migrer   |
| `settings-dialog`      | Modales custom                                                                                                                    | `modal`, `modal-box`, `btn btn-primary`/`btn btn-ghost`, `select select-bordered`, `textarea textarea-bordered`                                                                      | À migrer   |
| `chat-input`           | `bg-base-200/80`, `border-base-300`, `loading loading-dots`, `btn btn-circle btn-primary/btn-error`                               | **Déjà partiel** — conserver classes existantes, étendre avec `input input-bordered`, supprimer `bg-transparent`/`border-none`                                                       | Partiel ✅ |
| `message-item`         | `chat chat-end/chat-start`, `chat-bubble-primary`, `chat-bubble-neutral`, `prose prose-sm`                                        | **Déjà partiel** — conserver `chat`, `chat-bubble-primary`, `chat-bubble-neutral`, `prose`, ajouter couleurs `base-*` sémantiques                                                    | Partiel ✅ |
| `voice-control`        | `bg-green-100/10`, `text-green-500/20`, `bg-gray-600`, `bg-gray-800/50`, `btn btn-circle btn-success`, `btn btn-circle btn-error` | `base-200`, `base-300`, `base-content`, `btn btn-circle btn-success`, `btn btn-circle btn-error`, `bg-base-200/70` bordure                                                           | À migrer   |
| `audio-message-player` | `bg-base-200/70`, `bg-primary`, `bg-base-300`, `btn btn-circle btn-primary`, `text-base-content/60`                               | **Déjà partiel** — conserver `bg-base-200/70`, `bg-primary`, `bg-base-300`, `btn btn-circle bg-primary text-primary-content`                                                         | Partiel ✅ |
| `call-interface`       | Indicateurs d'état custom, bars de statut                                                                                         | `bg-base-100`, `text-base-content`, indicateurs `bg-success`/`bg-secondary`/`bg-warning`/`bg-base-300`, boutons `btn btn-circle btn-ghost`, `btn btn-circle btn-error` (fin d'appel) | À migrer   |
| `not-found-page`       | Gradients custom `from-blue-400 to-purple-400`                                                                                    | `bg-base-100`, `from-primary via-secondary to-warning`, `btn btn-primary`                                                                                                            | À migrer   |
| `tts-tester`           | Classes card/custom, select/textarea custom                                                                                       | `card`, `bg-base-200`, `border-base-300`, `select select-bordered`, `textarea textarea-bordered`, `btn btn-primary`/ `btn btn-error`                                                 | À migrer   |
| `audio-recorder`       | Aucun template HTML                                                                                                               | Vérifier — peut être inline ou composant sans template                                                                                                                               | À vérifier |

## Décisions d'architecture notables

1. **Theme halloween** : thème par défaut daisyUI 5 pour marquer la migration. Peut être changé plus tard via `data-theme` sur `<html>` ou contrôleur de thème daisyUI.

2. **Pas de CSS custom** : toutes les couleurs doivent venir des sémantiques daisyUI (`primary`, `secondary`, `base-*, error, success`). Interdiction d'utiliser `bg-gray-950`, `from-blue-600`, `text-blue-400` ou toute classe Tailwind non daisyUI dans les templates.

3. **Signal-based** : tous les composants doivent rester compatibles Angular 20.3 standalone/Signals. Pas de conversion NgModules nécessaire — les composants sont déjà standalone.

4. **Réutilisation partielle** : `chat-input` et `message-item` utilisent déjà certaines classes daisyUI (`bg-base-200/80`, `border-base-300`, `loading loading-dots`, `chat`, `chat-bubble-primary`, `chat-bubble-neutral`, `prose`). Ces composants doivent être **étendus** plutôt que recréés de zéro. Cibler le remplacement des seules classes non-daisyUI (`bg-transparent`, `border-none`, `focus-within:border-primary/60`, les couleurs custom).

5. **Backend inchangé** : pas d'API nouvelle, pas de migration SSE nécessaire (déjà fait en tâche 04). Le frontend accède aux mêmes endpoints GraphQL + SSE avec des classes de présentation daisyUI.

6. **Path aliases** : tous les imports relatifs `../../` doivent être remplacés par les aliases `@environment`, `@models/*`, `@core/*`, `@features/*` définis dans `apps/frontend/tsconfig.json`. 15 imports ont déjà été réécrits (voir decisions.md).

7. **Lockfile contrainte** : `pnpm-lock.yaml` verrouillée. Toute mise à jour de daisyUI doit se faire avec `pnpm add daisyui@latest` et validation build.

8. **Aucun commit** pendant la migration — chaque tâche doit être validée séparément ou pas du tout selon la politique du projet.
