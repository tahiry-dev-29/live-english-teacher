# Stack — live-english-teacher

## Frontend

- Angular ~20.3 (standalone, Signals, `resource()`, inline templates) — Nx workspace
- Apollo Angular (GraphQL queries/mutations) — `apollo-angular@12`
- TailwindCSS v4, PostCSS, daisyUI 5
- Icons: `@lucide/angular` only (`<svg lucideXxx>`), no inline SVG hardcoded (`xmlns`/`viewBox`/`<path>` forbidden in `apps/frontend/src`)
- Services: chat.service.ts, message.service.ts, tts.service.ts, voice-call.service.ts, vad.service.ts

## Angular Modern Patterns (strict rules)

### Forms — FormsModule / Reactive Forms Forbidden

- **FormsModule**: **FORBIDDEN** in component imports. No more `[(ngModel)]`, `[ngModel]`, `(ngModelChange)`.
- **ReactiveFormsModule**: **FORBIDDEN**. No `FormGroup`, `FormControl`, `FormBuilder`.
- **Native element replacement** (`<input>`, `<textarea>`, `<select>`):
  ```html
  <!-- BEFORE (forbidden) -->
  <input [ngModel]="value()" (ngModelChange)="setValue($event)" />

  <!-- AFTER (correct) -->
  <input [value]="value()" (input)="setValue($any($event.target).value)" />
  ```
- **`<select>` replacement**:
  ```html
  <select [value]="selected()" (change)="onSelect($any($event.target).value)">
  ```
- **Custom components**: use `model()` for two-way binding:
  ```typescript
  // Child component
  value = model<T | null>(null);

  // Parent component
  <app-select [(value)]="mySignal" />
  ```
- **NEVER** use `ControlValueAccessor` unless a third-party library explicitly requires it.

### CommonModule — Forbidden

- **CommonModule**: **FORBIDDEN** in imports. Project uses `@if`/`@for`/`@switch` (Angular control flow) — no need for `*ngIf`, `*ngFor`, `*ngSwitch`.
- **Angular pipes**: import the pipe directly from `@angular/common` if used:
  ```typescript
  // BEFORE (forbidden)
  imports: [CommonModule]

  // AFTER (correct)
  imports: [DatePipe, UpperCasePipe]  // only if actually needed
  ```
- **ngClass** → **`[class]`** native binding:
  ```html
  <!-- BEFORE (forbidden) -->
  <div [ngClass]="{active: isActive, primary: isPrimary}"></div>

  <!-- AFTER (correct) -->
  <div [class]="{active: isActive, primary: isPrimary}"></div>
  ```
- **ngStyle** → **`[style]`** native binding:
  ```html
  <!-- BEFORE (forbidden) -->
  <div [ngStyle]="{'background-color': 'red'}"></div>

  <!-- AFTER (correct) -->
  <div [style]="{'background-color': 'red'}"></div>
  ```
- **DOCUMENT**: import from `@angular/common` (not from `CommonModule`):
  ```typescript
  import { DOCUMENT } from '@angular/common';
  ```

### Signals — Mandatory Pattern

- **state**: `signal()` for all mutable local state.
- **derived**: `computed()` for derived values (never methods in templates).
- **two-way binding**: `model()` for child components (not `output()` + `input()` for bidirectional props).
- **side effects**: `effect()` to react to signal changes (not `ngOnInit` for watching).
### When to use `linkedSignal` vs `computed` vs `effect`
- Use `computed`: When state is **strictly** derived from other state and should never be manually updated.
- Use `linkedSignal`: When state is derived from other state, but the user **must** be able to override or manually update it.
- **Never** use `effect` to sync one piece of state to another. That is an anti-pattern. Use `computed` or `linkedSignal` instead.
## Resource Status Signals

The `Resource` object provides several signals to read its current state:

- `value()`: The resolved data, or `undefined`.
- `hasValue()`: Type-guard boolean. `true` if a value exists.
- `isLoading()`: Boolean indicating if the loader is currently running.
- `error()`: The error thrown by the loader, or `undefined`.
- `status()`: A string constant representing the exact state (`'idle'`, `'loading'`, `'resolved'`, `'error'`, `'reloading'`, `'local'`).

### Template

- **Control flow**: `@if`, `@for`, `@switch` only (no structural directives).
- **track**: mandatory in `@for` (`track item.id` or `track $index`).
- **Methods in templates**: FORBIDDEN (use `computed()` or pure pipes).

## Backend

- NestJS 11 + Express 5 (`@as-integrations/express5`), global prefix `api`
- GraphQL: `@nestjs/graphql` + `@nestjs/apollo`, single resolver `libs/backend/feature-live/src/lib/live.resolver.ts`
- WebSocket: Socket.IO gateway `live.gateway.ts` (⚠️ dead code: frontend does not connect to it)
- AI: Gemini via direct fetch (`gemini-live.service.ts`) + Genkit flows (`genkit-flow.ts`, port 3400)
- Prisma 6 + local PostgreSQL (DATABASE_URL in `.env`)

## Tools

- Nx 22 (build: webpack backend / @angular/build frontend), ESLint 9, Prettier 3 (+ `prettier-plugin-tailwindcss`: class sorting, `tailwindStylesheet` → `apps/frontend/src/styles.css`)
- pnpm 11 (`--frozen-lockfile`, `allowBuilds` in pnpm-workspace.yaml), bun for scripts

## Constraints

- Never change dependency versions without explicit validation → prefer `--frozen-lockfile`
- Prisma client generated in default path (`node_modules/@prisma/client`), schema without custom `output`
- `prisma.config.ts` at the repo root is **mandatory** (schema path, migrations path, `datasource.url` from `DATABASE_URL`) — Prisma 6.19 refuses to generate/run without it. After a fresh clone: `npx prisma generate` (the client is not committed); check DB with `npx prisma migrate status`.
- Legacy `@prisma/cli@2.20.1` stays in devDeps (do not remove) but its build scripts are blocked (`allowBuilds: '@prisma/cli': false`)
- Prisma generation files: do not commit `generated/` (deleted, default output)
- ESLint root `eslint.config.mjs`: `@typescript-eslint/no-unused-vars` allows `^_` prefixed identifiers (`argsIgnorePattern`, `varsIgnorePattern`, `caughtErrorsIgnorePattern`, `destructuredArrayIgnorePattern`) + `ignoreRestSiblings` — intentional unused mock params must be named `_param`.
- Startup perf: never fetch on service construction. Defer initial loaders to `requestIdleCallback` (setTimeout fallback) and keep resources lazy (`resource()` behind a `_shouldLoad*` guard) so first paint ships with zero API calls (see tasks 81/88).
- Themes & colors: daisyUI semantic tokens only (`bg-base-100/200/300`, `text-base-content`, `primary`, etc.). Hardcoded colors (`bg-white`, `bg-black`, `bg-[...]`, `text-gray-*`, `bg-gray-*`, `from-blue`, `text-blue`) and `dark:` are strictly forbidden (incompatible with `data-theme`). Automated guard: `scripts/check-theme-tokens.mjs` in prebuild.
