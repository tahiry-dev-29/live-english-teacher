# Task 20 — Redesign Settings Dialog (Tabbed Layout + General Theme/i18n + Auto-save)

**Status: DONE**
**Priority:** 🔴 High

## Goal

Redesign the settings dialog into a large tabbed layout with vertical navigation tabs on the left. Each tab groups related settings: General (theme, font, app language), AI Model Configuration, AI Tutor Voices, Learning Language. Add Angular i18n for app language switching. Learning Language must also be selectable from the chat input bar. **No Save/Submit button: each change is persisted immediately (auto-save via services).**

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  Settings                                    [X]     │
├──────────┬───────────────────────────────────────────┤
│ General  │  Theme: [Dark] [Light] [System]           │
│ AI Model │  Font Size: [Small] [Medium] [Large]      │
│ Voices   │  App Language: [EN] [FR] [ES]             │
│ Language │                                            │
│          │                                            │
├──────────┴───────────────────────────────────────────┤
│  (no Save/Cancel footer — auto-save)                 │
└──────────────────────────────────────────────────────┘
```

## Tabs

| Tab | Content |
|-----|---------|
| **General** | Theme toggle (dark/light/system via daisyUI `theme-controller`), Font size selector, App language selector (i18n: en/fr/es) |
| **AI Model** | Provider tabs (Groq/Gemini), Model cards, Custom API Keys with tutorial accordion |
| **Voices** | ElevenLabs voice list with preview play/stop |
| **Language** | Learning language grid (same as current, but also exposed in chat input bar) |

## Files to create/modify

- `apps/frontend/src/app/core/components/settings-dialog/settings-dialog-component.ts` — Full rewrite with tabbed layout
- `apps/frontend/src/app/core/services/theme.service.ts` — **New** — Theme management (dark/light/system) via daisyUI `data-theme`
- `apps/frontend/src/app/core/services/i18n.service.ts` — **New** — App language switching (en/fr/es) with localStorage persistence
- `apps/frontend/src/app/features/chat-room/chat-page.component.ts` — Add language quick-select in chat input bar
- `apps/frontend/src/app/features/chat-room/chat-page.component.html` — Add language chip/button next to input
- `apps/frontend/src/index.html` — Add `lang` attribute binding
- `apps/frontend/src/app/app.config.ts` — Provide `I18nService` if needed

## Auto-save (no Save/Submit button)

- **Principle:** each control writes directly to the source-of-truth service (`ThemeService`, `I18nService`, `AiConfigService`, `ApiKeyService`, `ElevenLabsVoiceService`) + emits `languageChange`/`voiceChange` when relevant. No `temp*` signals, no `handleSave()`.
- The `modal-action` footer with `[Cancel] [Save]` is **removed**. Only the `[X]` close button remains.
- **API Keys**: the input writes via `(ngModelChange)` with debounce (~500 ms) to avoid persisting on every keystroke; the Clear button clears immediately.
- **Voice**: selection emits `voiceChange` immediately (the play/stop preview remains local to the component).
- **Learning Language**: emits `languageChange` immediately.
- **Provider/Model**: direct write + `fetchModels()` if the key has changed.

## Steps

1. Create `ThemeService` with `theme` signal ('dark'|'light'|'system'), persisted in localStorage, applies `data-theme` on `<html>`
2. Create `I18nService` with `lang` signal ('en'|'fr'|'es'), persisted in localStorage, updates `document.documentElement.lang`
3. Rewrite `SettingsDialogComponent` with daisyUI `tabs tabs-lift` for vertical tab navigation
4. Implement General tab: theme toggle, font size, app language
5. Move existing AI Model, Voices, Language sections into their respective tabs
6. Add language quick-select button in chat input bar (opens settings on Language tab)
7. Wire ThemeService into app root to apply theme on startup
8. Remove `temp*`, `handleSave()`, Save/Cancel footer → direct auto-save
9. Build + lint verify

## Acceptance Criteria

- [x] Settings dialog opens as a large modal with vertical tabs on the left
- [x] General tab: theme switches between dark/light/system instantly
- [x] General tab: app language changes UI text (i18n)
- [x] AI Model tab: provider/model selection works (existing)
- [x] Voices tab: voice list with preview works (existing)
- [x] Language tab: learning language selection works (existing)
- [x] Chat input bar has a language quick-select button
- [x] All settings persist in localStorage
- [x] **No Save/Submit button in the dialog; each change is applied + persisted immediately (auto-save)**
- [x] `nx build frontend` passes without errors
- [x] daisyUI components used throughout (tabs, btn, badge, fieldset, collapse)

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  Settings                                    [X]     │
├──────────┬───────────────────────────────────────────┤
│ General  │  Theme: [Dark] [Light] [System]           │
│ AI Model │  Font Size: [Small] [Medium] [Large]      │
│ Voices   │  App Language: [EN] [FR] [ES]             │
│ Language │                                            │
│          │                                            │
├──────────┴───────────────────────────────────────────┤
│                                    [Cancel] [Save]   │
└──────────────────────────────────────────────────────┘
```

## Tabs

| Tab | Content |
|-----|---------|
| **General** | Theme toggle (dark/light/system via daisyUI `theme-controller`), Font size selector, App language selector (i18n: en/fr/es) |
| **AI Model** | Provider tabs (Groq/Gemini), Model cards, Custom API Keys with tutorial accordion |
| **Voices** | ElevenLabs voice list with preview play/stop |
| **Language** | Learning language grid (same as current, but also exposed in chat input bar) |

## Files to create/modify

- `apps/frontend/src/app/core/components/settings-dialog/settings-dialog-component.ts` — Full rewrite with tabbed layout
- `apps/frontend/src/app/core/services/theme.service.ts` — **New** — Theme management (dark/light/system) via daisyUI `data-theme`
- `apps/frontend/src/app/core/services/i18n.service.ts` — **New** — App language switching (en/fr/es) with localStorage persistence
- `apps/frontend/src/app/features/chat-room/chat-page.component.ts` — Add language quick-select in chat input bar
- `apps/frontend/src/app/features/chat-room/chat-page.component.html` — Add language chip/button next to input
- `apps/frontend/src/index.html` — Add `lang` attribute binding
- `apps/frontend/src/app/app.config.ts` — Provide `I18nService` if needed

## Steps

1. Create `ThemeService` with `theme` signal ('dark'|'light'|'system'), persisted in localStorage, applies `data-theme` on `<html>`
2. Create `I18nService` with `lang` signal ('en'|'fr'|'es'), persisted in localStorage, updates `document.documentElement.lang`
3. Rewrite `SettingsDialogComponent` with daisyUI `tabs tabs-lift` for vertical tab navigation
4. Implement General tab: theme toggle, font size, app language
5. Move existing AI Model, Voices, Language sections into their respective tabs
6. Add language quick-select button in chat input bar (opens settings on Language tab)
7. Wire ThemeService into app root to apply theme on startup
8. Build + lint verify

## Acceptance Criteria

- [ ] Settings dialog opens as a large modal with vertical tabs on the left
- [ ] General tab: theme switches between dark/light/system instantly
- [ ] General tab: app language changes UI text (i18n)
- [ ] AI Model tab: provider/model selection works (existing)
- [ ] Voices tab: voice list with preview works (existing)
- [ ] Language tab: learning language selection works (existing)
- [ ] Chat input bar has a language quick-select button
- [ ] All settings persist in localStorage
- [ ] `nx build frontend` passes without errors
- [ ] daisyUI components used throughout (tabs, btn, badge, fieldset, collapse)

## UI/UX Rules (thr-design)

- Use daisyUI `tabs tabs-lift` for vertical tab navigation
- Active tab: `tab-active` class
- Theme toggle: daisyUI `theme-controller` or custom toggle with `data-theme`
- Consistent spacing: `p-6` body, `space-y-6` sections
- Font size: use CSS custom properties or Tailwind `text-sm`/`text-base`/`text-lg`
- All interactive elements must have `focus-visible:ring` for accessibility
- Transitions: `transition-all duration-200` on theme changes
