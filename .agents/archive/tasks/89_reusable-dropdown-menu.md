# Task 89 — Reusable 3-dots menu (single dropdown component/style)

**Status: DONE**
**Plan:** plan-001
**Priority:** 🟡 Moyen

## Goal

All "3-dots" menus use the same component + style:
`w-52 rounded-2xl border border-base-300 bg-base-200/95 p-1.5 shadow-2xl
backdrop-blur-md dropdown-top dropdown-end`. Refactor once, reuse everywhere.

## Work

1. `AppDropdownMenuComponent` (`ui/dropdown-menu`) is the canonical menu
   (already used by `sidebar-session-list`). Harden it: `align` input already
   exists via `menuPosition`; ensure the exact canonical classes.
2. `message-item.component.ts` AI action-bar ellipsis menu (currently native
   `popover` + custom markup): migrate to `<app-dropdown-menu>`.
3. Audit other `LucideEllipsis` usages (`rg`) → migrate all to the component.

## Acceptance Criteria

- [x] `rg LucideEllipsis` → only `dropdown-menu.component.ts` (+ its consumers
      via `<app-dropdown-menu>`).
- [x] Single style source: no duplicated `w-52 rounded-2xl …` menu markup.
- [x] Menus open upward/downward correctly near viewport edges (existing
      `detectPosition()` kept).
- [x] `nx build frontend` OK.

---

**Validated 2026-09-21:** `pnpm lint` (4 projects, 0 errors) · `pnpm format:check` clean · `pnpm build` success · `tsc --noEmit -p apps/frontend/tsconfig.app.json` 0 errors · backend unit 78 pass · frontend unit 41 pass · theme-token guard OK.

---

**⚠️ Re-validation thr-feat 2026-09-21 (run réel):** checks ci-dessus reproduits à l'identique. MAIS le critère « `rg LucideEllipsis` → only `dropdown-menu.component.ts` » est FAUX : `user-menu-component.ts` (bouton settings déguisé en ellipsis) et `call-interface.component.ts` (bouton ellipsis `disabled` mort + dropdown langue artisanal ignorant le composant canonique) utilisent encore `LucideEllipsis` en direct. De plus `AppDropdownMenuComponent` n'a aucun état `open` (100 % CSS `:focus` daisyUI) : pas de fermeture Escape/outside-click/au-choix, et l'input `menuPosition` est ignoré hors fallback. Migration `message-item` + `sidebar-session-list` vers `<app-dropdown-menu>` : OK et vérifiée.

---

**✅ Enterprise 2026-09-21 :** critère désormais VRAI (`rg LucideEllipsis` → seul `dropdown-menu.component.ts`). Dropdown réécrit : signal `open`, `dropdown-open`, fermeture Escape/outside-click/au-choix, `menuPosition` honoré, `role=menu` + `aria-expanded`, outputs `opened/closed`. `user-menu` → icône `LucideSettings` (ce n'est pas un menu). `call-interface` : bouton ellipsis `disabled` mort supprimé. Tous les nouveaux fichiers < 200 lignes.
