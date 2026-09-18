# Task 32 — Enterprise Error Handling & User Notification Architecture

**Status: TODO**
**Priority:** 🔴 High — depends on Task 31 (`MESSAGES` constants already merged)

## Goal

Replace every hardcoded `console.*`/`alert()` and inline error UI with a single, typed, centralized layer — **user-facing Toast notifications** (DaisyUI 5, @lucide/angular) decoupled from **internal debug/security logs**, plus **automatic HTTP + SSE + global-exception interception**.

## Context (current state — Task 31 already done)

| Element | Location | Usage |
|---|---|---|
| `MESSAGES` | `core/constants/messages.ts` | User text + log labels |
| `MESSAGE_TEMPLATES` | `core/constants/messages.ts` | Interpolated messages (quota, SSE) |
| `ERROR_CODES` | `core/constants/messages.ts` | SSE codes (`QUOTA_EXCEEDED`) |
| `formatApiError()` | `core/utils/api-error.util.ts` | Pure function → `ErrorCode` |
| `ChatMessage.kind = 'error'` | `models/chat-message.model.ts` | Error flag in thread |
| `appendErrorMessage` | `message.service.ts` | Creates `kind:'error'` message |
| `console.error/warn/log` | 24 call-sites (`rg -c`) | **Non-centralized** internal logs |
| `alert()` | `chat-page.component.ts:151` | Micro permission — **to replace** |

### Current Gap

```
rg -n 'console\.\(error\|warn\|log\)' apps/frontend/src  → 24 non-centralized occurrences
rg -n 'alert(' apps/frontend/src                      → 1 occurrence (micro access)
rg -n 'startsWith..Error.' apps/frontend/src          → 0 (already fixed in Task 31 ✅)
```

No `HttpInterceptor` or `ErrorHandler` exists → each call-site re-implements the fallback.

## Target Architecture

```
core/
├── constants/messages.ts          [EXISTS] MESSAGES, MESSAGE_TEMPLATES, ERROR_CODES
├── utils/api-error.util.ts        [EXISTS] formatApiError(), resolveApiErrorCode()
├── models/notification.model.ts   [CREATE]  ToastNotification interface
├── services/
│   ├── notification.service.ts    [CREATE]  push error/success/info, queue, auto-dismiss
│   └── logging.service.ts         [CREATE]  console + devtools, security filter
├── interceptors/
│   ├── error-interceptor.ts       [CREATE]  intercepts Apollo HTTP + non-SSE fetch
│   └── network-interceptor.ts     [CREATE]  detects offline/online, navigation guards
└── components/
    └── toast/
        ├── toast.component.ts     [CREATE]  <app-toast-container>, DaisyUI 5 toast
        └── toast.component.html   [CREATE]  @for on signal, lucide icons
```

### Separation of Responsibilities

| Layer | Responsibility | Where it logs? |
|---|---|---|
| NotificationService | Visible UI: toasts error/warning/success | DOM (DaisyUI toast) |
| LoggingService | Internal debug + dev telemetry: console.error/warn | DevTools console |
| HttpInterceptor | Captures Apollo + window.fetch | NotificationService + LoggingService |
| ErrorHandler | window.onerror + unhandledrejection | LoggingService (never user-visible) |
| NetworkInterceptor | online/offline events | NotificationService |

## Steps

### 32.1 — `ToastNotification` model + `NotificationType` enum
- **File**: `core/models/notification.model.ts`
- `type NotificationType = 'error' | 'warning' | 'success' | 'info'`
- Interface: `{ id: string; type: NotificationType; message: string; action?: { label: string; handler: () => void }; duration: number }`
- Export type guard `isNotificationOfType(notification, type)`.

### 32.2 — `LoggingService` (dedicated console, dev/prod filtering)
- **File**: `core/services/logging.service.ts`
- Methods: `error(message, context?)`, `warn(message, context?)`, `info(message, context?)`
- Production: `console.warn`/`console.error` only for `warning`/`error`
- Dev: colored logging with `[live-teacher]` prefix
- Sanitization: masks `key`/`token`/`password` fields in `context`

### 32.3 — `NotificationService` (queue + auto-dismiss)
- **File**: `core/services/notification.service.ts`
- Signal `notifications: Signal<ToastNotification[]>`
- Methods: `error(message, options?)`, `warning(message, options?)`, `success(message, options?)`, `info(message, options?)`
- `options`: `{ duration?, action? }` — default 5s (error) / 3s (others)
- `dismiss(id)` method — removes from queue
- Uses `MESSAGES.*` for labels (no hardcoding here)

### 32.4 — `app-toast` component (DaisyUI 5 + lucide)
- **Files**: `core/components/toast/toast.component.{ts,html,css}`
- Standalone, `ChangeDetectionStrategy.OnPush`
- `notifications` input from `NotificationService.notifications`
- `@for (n of notifications(); track n.id)` — DaisyUI `div.toast.toast-end`
- Lucide icons by type: error→`LucideTriangleAlert`, warning→`LucideAlertTriangle`, success→`LucideCheckCircle2`, info→`LucideInfo`
- `LucideX` dismiss button
- `transition-opacity duration-300` animation (native CSS, not `@angular/animations`)

### 32.5 — `HttpInterceptor` (Apollo + fetch wrapper)
- **File**: `core/interceptors/error-interceptor.ts`
- Intercepts Apollo `error` links → `formatApiError()` → `NotificationService.error()` + `LoggingService.error()`
- **`fetchWithErrors` wrapper** for SSE not covered by Apollo (`chat-audio.service.ts:93` fetch transcription)
  → retry 1x on 5xx, otherwise → error notification
- **Does not touch** `chat-stream.service.ts` — SSE token-stream keeps its own error path

### 32.6 — `NetworkInterceptor` + `GlobalErrorHandler`
- **Files**: `core/interceptors/network-interceptor.ts`, `core/handlers/global-error-handler.ts`
- `NetworkInterceptor`: listens `window.addEventListener('online/offline')` → info toast
- `GlobalErrorHandler`: implements `ErrorHandler`, logs `window.onerror`/`unhandledrejection` → `LoggingService`
- Registrations: `provideHttpClient(withInterceptorsFromDi)` + `provideErrorHandler(GlobalErrorHandler)` in `main.ts`

### 32.7 — Migrate existing call-sites
- `message.service.ts:58,102` → `LoggingService.error()` (kept for chat thread)
- `chat-page.component.ts:151` `alert(...)` → `NotificationService.warning(MESSAGES.error.microphoneAccessDenied)`
- All 24 `console.*` call-sites → replaced by `LoggingService` (no duplication)
- Register `<app-toast>` in `chat-page.component.html`

## Acceptance Criteria

1. **No console hardcoding**: `rg -n "console\.\(error\|warn\|log\)" apps/frontend/src` → 0 result
2. **No `alert()`**: `rg -n 'alert\(' apps/frontend/src` → 0 result
3. **Centralization**: all toasts go through `NotificationService` (single consumer `<app-toast>`)
4. **Security**: `LoggingService` masks `password`/`token`/`api[_-]?key` via regex
5. **Build**: `npx nx build frontend` → 0 TypeScript errors (strict)
6. **Lint**: `nx run frontend:lint` → 0 errors (targeted eslint-disable for `LoggingService`)
7. **Prettier**: `pnpm format:check` → clean
8. **Manual test**: 1 SSE error + 1 HTTP error → 1 DaisyUI error toast + 1 filtered console log
