# Task 28 — Authentication Microservice Integration (NestJS Backend & Frontend)

**Status: TODO**
**Priority:** 🔴 High — after design tasks (Tasks 22–27)

## Goal

Integrate the user authentication system (Registration, Login, JWT Token, Refresh Token, NestJS Guard, User Session) between the NestJS backend and Angular frontend.

## Scope note (cleaned 2026-09-16)

- Previous duplicate task number 20 resolved: remaining Task 20 is `20_settings-dialog-redesign.md` (DONE); auth is renumbered 28.
- Login & Register pages/modals must follow the design system (daisyUI tokens, 2 themes) from Tasks 22–27.
- After auth: DB sync for preferences (theme, language) removed in Task 21 can be reopened.

## Goal

Integrate the user authentication system (Registration, Login, JWT Token, Refresh Token, NestJS Guard, User Session) between the NestJS backend and Angular frontend.

## Files to create/modify

### Backend (`apps/backend` & `libs/backend`)
- `libs/backend/feature-auth` (or dedicated auth module):
  - `auth.service.ts`: Register, Login, password validation (`bcrypt`), JWT generation.
  - `auth.controller.ts` / `auth.resolver.ts`: Endpoints `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`.
  - `jwt.strategy.ts` & `jwt-auth.guard.ts`: Protect session and chat routes per user.
  - Update Prisma `Session` to automatically associate `userId` with the authenticated user.

### Frontend (`apps/frontend`)
- `apps/frontend/src/app/core/services/auth.service.ts`: JWT token management, `currentUser` state, `login()`, `register()`, `logout()`, `isAuthenticated` signal.
- `apps/frontend/src/app/core/interceptors/auth.interceptor.ts`: Automatic `Authorization: Bearer <token>` header on all REST / SSE / Apollo requests.
- `apps/frontend/src/app/core/components/user-menu/user-menu-component.ts`: Display the real name and email of the logged-in user instead of "Guest User", logout button.
- `apps/frontend/src/app/features/auth/`: Login & Register modal or pages styled with daisyUI 5.

## Steps

1. Implement Auth module on NestJS backend with `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `bcrypt`.
2. Link sessions and chat history to the authenticated user ID in Prisma.
3. Create `AuthService` and `AuthInterceptor` on Angular frontend.
4. Update `UserMenuComponent` to reflect the logged-in user and provide login/logout.
5. Protect routes or display an auth modal if the user is not logged in.

## Acceptance Criteria

- [ ] User can create an account (`/register`) and log in (`/login`).
- [ ] JWT token is stored and sent in requests via the interceptor.
- [ ] Chat sessions are private and associated with the logged-in user account.
- [ ] User menu displays real information and allows logout.
- [ ] `nx run-many -t build` passes without errors.
