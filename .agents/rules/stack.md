# Stack — live-english-teacher

## Frontend

- Angular ~20.3 (standalone, Signals, `resource()`, inline templates) — Nx workspace
- Apollo Angular (GraphQL queries/mutations) — `apollo-angular@12`
- TailwindCSS v4, PostCSS, daisyUI 5
- Icônes : `@lucide/angular` uniquement (`<svg lucideXxx>`), aucun SVG inline en dur (`xmlns`/`viewBox`/`<path>` interdits dans `apps/frontend/src`)
- Services : chat.service.ts, message.service.ts, tts.service.ts, voice-call.service.ts, vad.service.ts

## Angular Modern Patterns (règles strictes)

### Forms — Interdiction de FormsModule / Reactive Forms

- **FormsModule** : **INTERDIT** dans les imports de composants. Plus aucun `[(ngModel)]`, `[ngModel]`, `(ngModelChange)`.
- **ReactiveFormsModule** : **INTERDIT**. Pas de `FormGroup`, `FormControl`, `FormBuilder`.
- **Remplacement natif elements** (`<input>`, `<textarea>`, `<select>`) :
  ```html
  <!-- AVANT (interdit) -->
  <input [ngModel]="value()" (ngModelChange)="setValue($event)" />

  <!-- APRÈS (correct) -->
  <input [value]="value()" (input)="setValue($any($event.target).value)" />
  ```
- **Remplacement `<select>`** :
  ```html
  <select [value]="selected()" (change)="onSelect($any($event.target).value)">
  ```
- **Composants custom** : utiliser `model()` pour le two-way binding :
  ```typescript
  // Composant enfant
  value = model<T | null>(null);

  // Composant parent
  <app-select [(value)]="mySignal" />
  ```
- **Ne JAMAIS** utiliser `ControlValueAccessor` sauf si un library tierce l'exige explicitement.

### CommonModule — Interdit

- **CommonModule** : **INTERDIT** dans les imports. Le projet utilise `@if`/`@for`/`@switch` (Angular control flow) — aucun besoin de `*ngIf`, `*ngFor`, `*ngSwitch`.
- **Pipes Angular** : importer directement le pipe depuis `@angular/common` si utilisé :
  ```typescript
  // AVANT (interdit)
  imports: [CommonModule]

  // APRÈS (correct)
  imports: [DatePipe, UpperCasePipe]  // uniquement si besoin réel
  ```
- **ngClass** → **`[class]`** binding natif :
  ```html
  <!-- AVANT (interdit) -->
  <div [ngClass]="{active: isActive, primary: isPrimary}"></div>

  <!-- APRÈS (correct) -->
  <div [class]="{active: isActive, primary: isPrimary}"></div>
  ```
- **ngStyle** → **`[style]`** binding natif :
  ```html
  <!-- AVANT (interdit) -->
  <div [ngStyle]="{'background-color': 'red'}"></div>

  <!-- APRÈS (correct) -->
  <div [style]="{'background-color': 'red'}"></div>
  ```
- **DOCUMENT** : importer depuis `@angular/common` (pas depuis `CommonModule`) :
  ```typescript
  import { DOCUMENT } from '@angular/common';
  ```

### Signals — Pattern obligatoire

- **state** : `signal()` pour tout état mutable local.
- **derived** : `computed()` pour les valeurs dérivées (jamais de méthodes dans les templates).
- **two-way binding** : `model()` pour les composants enfants (pas de `output()` + `input()` pour les props bidirectionnelles).
- **side effects** : `effect()` pour réagir aux changements de signaux (pas de `ngOnInit` pour watcher).

### Template

- **Control flow** : `@if`, `@for`, `@switch` uniquement (pas de directives structurelles).
- **track** : obligatoire dans `@for` (`track item.id` ou `track $index`).
- **Méthodes dans templates** : INTERDIT (utiliser `computed()` ou pipes purs).

## Backend

- NestJS 11 + Express 5 (`@as-integrations/express5`), global prefix `api`
- GraphQL : `@nestjs/graphql` + `@nestjs/apollo`, resolver unique `libs/backend/feature-live/src/lib/live.resolver.ts`
- WebSocket : Socket.IO gateway `live.gateway.ts` (⚠️ code mort : le frontend ne s'y connecte pas)
- IA : Gemini via fetch direct (`gemini-live.service.ts`) + Genkit flows (`genkit-flow.ts`, port 3400)
- Prisma 6 + PostgreSQL local (DATABASE_URL dans `.env`)

## Outils

- Nx 22 (build: webpack backend / @angular/build frontend), ESLint 9, Prettier 3 (+ `prettier-plugin-tailwindcss` : tri des classes, `tailwindStylesheet` → `apps/frontend/src/styles.css`)
- pnpm 11 (`--frozen-lockfile`, `allowBuilds` dans pnpm-workspace.yaml), bun pour les scripts

## Contraintes

- Ne jamais changer les versions de deps sans validation explicite → privilégier `--frozen-lockfile`
- Prisma client généré dans le chemin par défaut (`node_modules/@prisma/client`), schema sans `output` custom
- L'ancien `@prisma/cli@2.20.1` reste dans les devDeps (ne pas supprimer) mais ses scripts de build sont bloqués (`allowBuilds: '@prisma/cli': false`)
- Fichiers de génération Prisma : ne pas committer `generated/` (supprimé, output par défaut)
- Thèmes & couleurs : tokens sémantiques daisyUI uniquement (`bg-base-100/200/300`, `text-base-content`, `primary`, etc.). Couleurs codées en dur (`bg-white`, `bg-black`, `bg-[...]`, `text-gray-*`, `bg-gray-*`, `from-blue`, `text-blue`) et `dark:` sont strictement interdits (incompatibles avec `data-theme`). Garde-fou automatique : `scripts/check-theme-tokens.mjs` en prebuild.
