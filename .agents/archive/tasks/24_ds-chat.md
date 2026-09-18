# Task 24 — Dark/Light Design System: Chat (T2)

**Status: DONE**
**Priority:** 🟡 Medium — depends on Task 22

## Scope note (cleanup 2026-09-16)

- Functional concerns (SSE, retry, Copy/Retry/Listen/Fork menu, Markdown parsing) are in Task 21; here only **rendering in both themes**.
- `Retry`/`Fork` handlers: see Task 21 (chat-page.component.ts).

## Goal

Bubbles, markdown, input, recorder, and audio players readable and contrasted in both themes.

## Files

- `apps/frontend/src/app/features/chat-room/components/message-item/message-item.component.ts` — `chat-bubble-primary/neutral/error` already semantic (unchanged); verify `prose` + code-blocks in light
- `apps/frontend/src/app/features/chat-room/components/chat-container/chat-container.component.html` — typing indicator `bg-base-200` + `backdrop-blur-sm` → solid token
- `apps/frontend/src/app/features/chat-room/components/chat-container/chat-welcome.component.ts` — `bg-base-200`, `text-base-content/40` (verify)
- `apps/frontend/src/app/core/components/chat-input/chat-input.component.ts` — `bg-base-300`, `shadow-lg` (verify)
- `apps/frontend/src/app/features/chat-room/components/audio-recorder/audio-recorder.ts` — `btn-error`, `bg-base-300 text-error border-error` (verify)
- `apps/frontend/src/app/core/components/voice-control/voice-control-component.ts` — `bg-base-200 backdrop-blur-md` → solid token
- `apps/frontend/src/app/core/components/audio-message-player/audio-message-player-component.ts` — `bg-base-200/70 backdrop-blur-sm` → solid token

## Steps

1. Replace translucent `/70` backgrounds + `backdrop-blur` with solid tokens.
2. Verify markdown contrast (code, links) in emerald/light.
3. `loading-dots`, spinners, semantic `btn-*` kept.

## Acceptance Criteria

- [x] User/AI/error bubbles contrasted in light
- [x] Markdown (code, bold, lists, links) readable in light
- [x] Input, recorder, players without dark halo in light
- [x] `tsc` front, `eslint`, `prettier --check`, fresh builds pass
