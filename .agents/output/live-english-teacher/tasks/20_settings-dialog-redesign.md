# Task 20 — Redesign Settings Dialog (Tabbed Layout + General Theme/i18n)

**Status: DONE**
**Priorité:** 🔴 Haute

## Goal

Redesign the settings dialog into a large tabbed layout with vertical navigation tabs on the left. Each tab groups related settings: General (theme, font, app language), AI Model Configuration, AI Tutor Voices, Learning Language. Add Angular i18n for app language switching. Learning Language must also be selectable from the chat input bar.

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

## Fichiers à créer/modifier

- `apps/frontend/src/app/core/components/settings-dialog/settings-dialog-component.ts` — Full rewrite with tabbed layout
- `apps/frontend/src/app/core/services/theme.service.ts` — **New** — Theme management (dark/light/system) via daisyUI `data-theme`
- `apps/frontend/src/app/core/services/i18n.service.ts` — **New** — App language switching (en/fr/es) with localStorage persistence
- `apps/frontend/src/app/features/chat-room/chat-page.component.ts` — Add language quick-select in chat input bar
- `apps/frontend/src/app/features/chat-room/chat-page.component.html` — Add language chip/button next to input
- `apps/frontend/src/index.html` — Add `lang` attribute binding
- `apps/frontend/src/app/app.config.ts` — Provide `I18nService` if needed

## Étapes

1. Create `ThemeService` with `theme` signal ('dark'|'light'|'system'), persisted in localStorage, applies `data-theme` on `<html>`
2. Create `I18nService` with `lang` signal ('en'|'fr'|'es'), persisted in localStorage, updates `document.documentElement.lang`
3. Rewrite `SettingsDialogComponent` with daisyUI `tabs tabs-lift` for vertical tab navigation
4. Implement General tab: theme toggle, font size, app language
5. Move existing AI Model, Voices, Language sections into their respective tabs
6. Add language quick-select button in chat input bar (opens settings on Language tab)
7. Wire ThemeService into app root to apply theme on startup
8. Build + lint verify

## Critères d'acceptation

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
