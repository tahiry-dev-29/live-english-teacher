# live-english-teacher — PRD (V1: daisyUI migration)

## What V1 does

Migration of the frontend design system to **daisyUI 5** with `halloween` theme. Replacement of all custom Tailwind utilities (`bg-gray-950`, `from-blue-XXX`, `text-blue-XXX`, etc.) with daisyUI semantic classes (`base-*`, `primary`, `secondary`, `error`, `success`, etc.). All UI components will be refactored to use daisyUI components and colors.

## What V1 does NOT do (out of scope by design)

- New functional features or design changes
- Backend migration (NestJS, Prisma, GraphQL)
- Socket.IO to SSE replacement (already done in task 04)
- Adding new components or pages

## Key user journeys

1. Connect to an existing chat session
2. Send and receive AI messages with streaming
3. Voice call mode (live call)
4. Audio recording interface
5. Settings and voice management
6. Error display and loading states

## V1 success criteria

- `nx run frontend:build` passes with 0 errors
- `nx-run-many -t lint` passes with 0 errors / 0 warnings
- No more `bg-gray-950` / `from-blue-600` / `text-blue-400` classes in templates
- Template `data-theme="halloween"` active on `<html>`
- All daisyUI components listed in task 06 use semantic classes
- Production build succeeds

## Known technical constraints at this stage

See `.agents/rules/stack.md` for details. Key constraints:

- Angular 20.3 standalone, Signals
- daisyUI 5 + halloween theme
- No custom CSS `/deep/` or custom `@apply`
- Components must use daisyUI `btn`, `card`, `modal`, `input`, `select`, etc. semantic tokens
