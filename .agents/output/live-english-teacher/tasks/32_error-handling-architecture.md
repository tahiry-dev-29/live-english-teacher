# Task 32 — Enterprise error handling & user notification architecture

**Status: TODO**
**Priorité:** 🔴 Haute — dépend de Task 31 (constantes `MESSAGES` déjà mergées)

## Goal

Replace every hardcoded `console.*`/`alert()` and inline error UI with a single, typed, centralized layer — **user-facing Toast notifications** (DaisyUI 5, @lucide/angular) decoupled from **internal debug/security logs**, plus **automatic HTTP + SSE + global-exception interception**.

## Contexte (état actuel — Task 31 déjà fait)

| Élément | Emplacement | Usage |
|---|---|---|
| `MESSAGES` | `core/constants/messages.ts` | texte utilisateur + libellés logs |
| `MESSAGE_TEMPLATES` | `core/constants/messages.ts` | messages interpolated (quota, SSE) |
| `ERROR_CODES` | `core/constants/messages.ts` | codes SSE (`QUOTA_EXCEEDED`) |
| `formatApiError()` | `core/utils/api-error.util.ts` | fonction pure → `ErrorCode` |
| `ChatMessage.kind = 'error'` | `models/chat-message.model.ts` | flag error dans le thread |
| `appendErrorMessage` | `message.service.ts` | crée un message `kind:'error'` |
| `console.error/warn/log` | 24 call-sites (`rg -c`) | logs internes **non centralisés** |
| `alert()` | `chat-page.component.ts:151` | micro permission — **à remplacer** |

### Gap actuel

```
rg -n 'console\.\(error\|warn\|log\)' apps/frontend/src  → 24 occurrences non centralisées
rg -n 'alert(' apps/frontend/src                      → 1 occurrence (micro access)
rg -n 'startsWith..Error.' apps/frontend/src          → 0 (déjà fixé en Task 31 ✅)
```

Aucun `HttpInterceptor` ou `ErrorHandler` n'existe → chaque call-site ré-implémente le fallback.

## Architecture cible

```
core/
├── constants/messages.ts          [EXISTE] MESSAGES, MESSAGE_TEMPLATES, ERROR_CODES
├── utils/api-error.util.ts        [EXISTE] formatApiError(), resolveApiErrorCode()
├── models/notification.model.ts   [CREER]  ToastNotification interface
├── services/
│   ├── notification.service.ts    [CREER]  push error/success/info, queue, auto-dismiss
│   └── logging.service.ts         [CREER]  console + devtools, filtre securite
├── interceptors/
│   ├── error-interceptor.ts       [CREER]  intercepte Apollo HTTP + fetch non-SSE
│   └── network-interceptor.ts     [CREER]  detecte offline/online, navigation guards
└── components/
    └── toast/
        ├── toast.component.ts     [CREER]  <app-toast-container>, DaisyUI 5 toast
        └── toast.component.html   [CREER]  @for sur signal, icones lucide
```

### Separations des responsabilites

| Couche | Responsabilite | Où loggue ? |
|---|---|---|
| NotificationService | UI visible : toasts error/warning/success | DOM (DaisyUI toast) |
| LoggingService | Debug interne + telemetry dev : console.error/warn | DevTools console |
| HttpInterceptor | Capture Apollo + window.fetch | NotificationService + LoggingService |
| ErrorHandler | window.onerror + unhandledrejection | LoggingService (jamais user-visible) |
| NetworkInterceptor | evenements online/offline | NotificationService |

## Étapes

### 32.1 — Modèle `ToastNotification` + enum `NotificationType`
- **Fichier** : `core/models/notification.model.ts`
- `type NotificationType = 'error' | 'warning' | 'success' | 'info'`
- Interface : `{ id: string; type: NotificationType; message: string; action?: { label: string; handler: () => void }; duration: number }`
- Export type guard `isNotificationOfType(notification, type)`.

### 32.2 — `LoggingService` (console dédié, filtrage dev/prod)
- **Fichier** : `core/services/logging.service.ts`
- Méthodes : `error(message, context?)`, `warn(message, context?)`, `info(message, context?)`
- Production : `console.warn`/`console.error` seulement pour `warning`/`error`
- Dév : logging coloré avec préfixe `[live-teacher]`
- Sanitisation : masque les champs `key`/`token`/`password` dans `context`

### 32.3 — `NotificationService` (queue + auto-dismiss)
- **Fichier** : `core/services/notification.service.ts`
- Signal `notifications: Signal<ToastNotification[]>`
- Méthodes : `error(message, options?)`, `warning(message, options?)`, `success(message, options?)`, `info(message, options?)`
- `options` : `{ duration?, action? }` — durée défaut 5s (error) / 3s (autres)
- Méthode `dismiss(id)` — retire de la queue
- Utilise `MESSAGES.*` pour les libellés (pas de hardcoding ici)

### 32.4 — Composant `app-toast` (DaisyUI 5 + lucide)
- **Fichiers** : `core/components/toast/toast.component.{ts,html,css}`
- Standalone, `ChangeDetectionStrategy.OnPush`
- `notifications` input depuis `NotificationService.notifications`
- `@for (n of notifications(); track n.id)` — DaisyUI `div.toast.toast-end`
- Icones lucide par type : error→`LucideTriangleAlert`, warning→`LucideAlertTriangle`, success→`LucideCheckCircle2`, info→`LucideInfo`
- Bouton `LucideX` dismiss
- Animation `transition-opacity duration-300` (CSS native, pas `@angular/animations`)

### 32.5 — `HttpInterceptor` (Apollo + fetch wrapper)
- **Fichier** : `core/interceptors/error-interceptor.ts`
- Intercepte Apollo `error` links → `formatApiError()` → `NotificationService.error()` + `LoggingService.error()`
- **Wrapper `fetchWithErrors`** pour le SSE non couvert par Apollo (`chat-audio.service.ts:93` fetch transcription)
  → retry 1x sur 5xx, sinon → notification error
- **Ne touche pas** `chat-stream.service.ts` — SSE token-stream garde son propre error path

### 32.6 — `NetworkInterceptor` + `GlobalErrorHandler`
- **Fichiers** : `core/interceptors/network-interceptor.ts`, `core/handlers/global-error-handler.ts`
- `NetworkInterceptor` : écoute `window.addEventListener('online/offline')` → toast info
- `GlobalErrorHandler` : implémente `ErrorHandler`, loggue `window.onerror`/`unhandledrejection` → `LoggingService`
- Enregistrements : `provideHttpClient(withInterceptorsFromDi)` + `provideErrorHandler(GlobalErrorHandler)` dans `main.ts`

### 32.7 — Migration des call-sites existants
- `message.service.ts:58,102` → `LoggingService.error()` (conservé pour le thread chat)
- `chat-page.component.ts:151` `alert(...)` → `NotificationService.warning(MESSAGES.error.microphoneAccessDenied)`
- Les 24 `console.*` call-sites → remplacés par `LoggingService` (pas de duplication)
- Register `<app-toast>` dans `chat-page.component.html`

## Critères d'acceptation

1. **Aucun hardcoding console** : `rg -n "console\.\(error\|warn\|log\)" apps/frontend/src` → 0 résultat
2. **Aucun `alert()`** : `rg -n 'alert\(' apps/frontend/src` → 0 résultat
3. **Centralisation** : tous les toasts passent par `NotificationService` (un seul consommateur `<app-toast>`)
4. **Sécurité** : `LoggingService` masque `password`/`token`/`api[_-]?key` via regex
5. **Build** : `npx nx build frontend` → 0 erreur TypeScript (strict)
6. **Lint** : `nx run frontend:lint` → 0 error (eslint-disable ciblé pour `LoggingService`)
7. **Prettier** : `pnpm format:check` → clean
8. **Test manuel** : 1 erreur SSE + 1 erreur HTTP → 1 toast error DaisyUI + 1 log console filtré