# Archived Completed Tasks

## Archive Date: 2026-09-24

The following tasks have been completed and archived:

### T96 — Slice frontend `features/sessions`
- **Status:** DONE (verified 2026-09-24 — wc 0>200, lint 0, build OK, smoke: sessions list + search + share)
- **Files moved:** 
  - `core/components/sidebar/*` → `features/sessions/sidebar/`
  - `core/components/share-dialog/*` → `features/sessions/share-dialog/`
  - `core/components/user-menu/*` → `features/sessions/user-menu/`
- **Splits performed:** sidebar-session-list, share-dialog, user-menu, sidebar, sidebar-search-modal
- **Proof:** All files under `app/features/sessions/` have ≤200 lines, lint passes, build passes, smoke test (list sessions, search, share link) works.

### T97 — Slice frontend `shared/ui` + `features/user-data`
- **Status:** DONE (verified 2026-09-24 — wc 0>200, specs 19/19, lint slice 0, build OK)
- **Files moved:**
  - `core/components/ui/{select,dropdown-menu}/*` + `core/components/{toast,star-background,space-illustration}/*` → `shared/ui/`
  - `core/components/not-found-page/*` → `shared/not-found-page/` (plus route update)
  - `core/services/{memory,prompt-tag,user-profile,notification}.service.ts` → `features/user-data/services/`
- **Splits performed:** select component split into select.component.ts, select-option.model.ts, select-keyboard.util.ts
- **Proof:** All files under `app/shared/` and `app/features/user-data/` have ≤200 lines, related specs pass, lint passes, build passes.

### T98 — Slice backend `ai-chat` + `ai-models`
- **Status:** DONE (verified 2026-09-24 — wc 0>200, backend tests 175/0, lint 0, build OK)
- **Files moved:**
  - `ai-stream.controller.ts`, `ai-provider.service.ts`, `openai-compat.service.ts`, `genkit-flow.ts`, `live.resolver.ts`, `live-resolver.types.ts`, `ai-providers.registry.ts` → `lib/ai-chat/`
  - `ai-models.service.ts` → `lib/ai-models/`
- **Specs split before move:** 
  - `ai-stream.controller.spec.ts` → `ai-stream-chat.spec.ts`, `ai-stream-models.spec.ts`, `ai-stream-transcribe-tts.spec.ts`
  - `live.resolver.spec.ts` → `live-chat.spec.ts`, `live-history.spec.ts` (plus extracted `live-chat.service.ts`)
  - `ai-provider.service.spec.ts` → `ai-provider-gemini-groq.spec.ts`, `ai-provider-openai-compat.spec.ts`
  - `ai-models.service.spec.ts` → split into `ai-models-keys.spec.ts`, `ai-models-registry.spec.ts` (after move)
- **Additional splits:** 
  - `ai-stream.controller.ts` → route files + utilities (`ai-stream-sse.util.ts`, `ai-stream-validation.pipe.ts`)
  - `openai-compat.service.ts` → service + `openai-request.util.ts` + `openai-response.util.ts`
- **Proof:** All files under `libs/backend/feature-live/src/lib/ai-chat/` and `libs/backend/feature-live/src/lib/ai-models/` have ≤200 lines, backend test suite passes (175 tests, 0 failures), lint passes, build passes.

## Notes
- No commits were made as per the working agreement (changes are staged but not committed).
- The code is ready for integration and subsequent tasks (T99, T100, etc.).