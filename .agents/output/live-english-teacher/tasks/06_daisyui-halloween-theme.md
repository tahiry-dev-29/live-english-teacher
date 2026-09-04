# Task 06 — Refactor UI avec daisyUI 5 + thème halloween

**Status: DONE**

## Contexte

Le frontend utilise un mix de Tailwind utilitaires bruts et de classes daisyUI.
L'objectif est de basculer entièrement sur **daisyUI 5** avec le thème `halloween`
(composants daisyUI + couleurs sémantiques `primary`/`secondary`/`base-*`/`error`/`success`...).

### État actuel des composants (analyse)

| Composant | Classes daisyUI actuelles | Classes Tailwind personnalisées | Statut |
|-----------|--------------------------|--------------------------------|--------|
| chat-page | none | `bg-gray-950`, `from-blue-400 to-purple-400`, `btn` (non daisyUI), `text-white` | À migrer |
| sidebar | none | `bg-gray-950`, `border-gray-800`, `text-gray-400/50`, `bg-blue-600/50` | À migrer |
| user-menu | none | classes personnalisées avatar, gradient | À migrer |
| settings-dialog | none | classes modal personnalisées | À migrer |
| chat-input | `bg-base-200/80`, `border-base-300`, `loading loading-dots` | `bg-transparent`, `border-none`, `focus-within:border-primary/60` | Partiel |
| message-item | `chat`, `chat-bubble-primary`, `chat-bubble-neutral` | `prose prose-sm`, `max-w-none` | Partiel |
| voice-control | none | `bg-green-100/10`, `text-green-500/20`, `bg-gray-600`, `bg-gray-800/50` | À migrer |
| audio-message-player | `bg-base-200/70`, `bg-primary`, `bg-base-300` | `bg-transparent`, `hover:bg-base-200` | Partiel |
| call-interface | none | classes personnalisées d'état | À migrer |
| not-found-page | none | gradients custom | À migrer |
| tts-tester | none | classes card personnalisées | À migrer |
| audio-recorder | Aucun template HTML | - | À vérifier |

## Implémentation

### Installation & config

- `pnpm add -D daisyui@latest` (Tailwind v4 déjà en place → compatible daisyUI 5)
- `apps/frontend/src/styles.css` : `@plugin "daisyui" { themes: halloween --default; }`
- `apps/frontend/src/index.html` : `data-theme="halloween"` sur `<html>`, titre "Live Teacher"

### Refactor pédagogique (14 composants)

- **chat-page** : `bg-base-100 text-base-content`, header `bg-base-200`, bouton live `btn btn-primary` / `btn btn-success` (mode live)
- **sidebar** : `bg-base-200 border-base-300`, logo `from-primary to-secondary`, boutons `btn`, filtre `input input-bordered input-sm`, historique en `menu` daisyUI
- **user-menu** : avatar `avatar avatar-placeholder` (gradient primary→secondary), bouton settings `btn btn-ghost btn-circle`
- **settings-dialog** : `modal modal-open` + `modal-box`, langues en `btn`, liste voix + `btn btn-circle btn-ghost`, footer Cancel `btn btn-ghost` / Save `btn btn-primary`
- **chat-input** : barre `bg-base-200 border-base-300 rounded-full`, input natif transparent, boutons envoi/stop `btn btn-circle btn-ghost` (envoi `text-primary`), mic `btn btn-circle btn-error` (état rec `btn-error animate-pulse`)
- **message-item** : bulles `chat chat-start/chat-end` + `chat-bubble-primary` (user) / `chat-bubble` neutre (`bg-base-200 text-base-content`, border `base-300`) (IA), bouton Play `btn btn-ghost btn-sm` (`text-secondary`)
- **chat-container** : écran d'accueil `text-base-content`, indicateur chargement `loading loading-dots loading-lg text-primary`, bouton scroll `btn btn-circle bg-primary text-primary-content`
- **audio-recorder** : `btn btn-circle btn-error` (rec) / `btn btn-circle bg-base-300 text-error border-2 border-error animate-pulse` (stop)
- **voice-control** : carte `bg-base-200 border-base-300 rounded-2xl`, play `btn btn-circle btn-success`, stop `btn btn-circle btn-error`, vagues `bg-success` / `bg-success/30`
- **audio-message-player** : `bg-base-200/70 border-base-300`, play `btn btn-circle bg-primary text-primary-content`, vagues `bg-primary`/`bg-base-300`, temps `text-base-content/60`
- **call-interface** : fond `bg-base-100 text-base-content`, indicateur `bg-success`, bars état (listening `bg-primary` / speaking `bg-secondary` / processing `bg-warning` / idle `bg-base-300`), boutons `btn btn-circle btn-ghost` + end call `btn btn-circle btn-error`
- **not-found-page** : fond `bg-base-100`, 404 gradient `from-primary via-secondary to-warning`, bouton home `btn btn-primary`
- **tts-tester** : `card bg-base-200 border-base-300`, select `select select-bordered w-full`, textarea `textarea textarea-bordered`, Speak `btn btn-primary` / Stop `btn btn-error`

## Contraintes

- Couleurs sémantiques daisyUI uniquement (pas de `dark:` avec ces couleurs)
- Ne pas casser la logique TS des composants (inputs, outputs, signaux)
- Aucun commit
- `.agents/rules/stack.md` : mettre à jour la ligne Frontend (daisyUI 5)

## Critères d'acceptation

- [ ] `nx run frontend:build` passe
- [ ] `nx run-many -t lint` passe (0 erreur / 0 warning)
- [ ] `pnpm-lock.yaml` à jour avec daisyui
- [ ] Thème `data-theme="halloween"` actif sur `<html>`
- [ ] Plus aucun `bg-gray-950` / `from-blue-600` / `text-blue-400`... dans les templates frontend
