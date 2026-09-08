# Task 20 — Intégration du microservice d'authentification (NestJS Backend & Frontend)

**Status: TODO**
**Priorité:** 🔴 Haute

## Goal

Intégrer le système d'authentification utilisateur (Inscription, Connexion, JWT Token, Refresh Token, Guard NestJS, Session utilisateur) entre le backend NestJS et le frontend Angular.

## Fichiers à créer/modifier

### Backend (`apps/backend` & `libs/backend`)
- `libs/backend/feature-auth` (ou module auth dédié) :
  - `auth.service.ts` : Register, Login, validation mot de passe (`bcrypt`), génération JWT.
  - `auth.controller.ts` / `auth.resolver.ts` : Endpoints `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`.
  - `jwt.strategy.ts` & `jwt-auth.guard.ts` : Protection des routes sessions et chat par utilisateur.
  - Mise à jour de Prisma `Session` pour associer automatiquement `userId` à l'utilisateur authentifié.

### Frontend (`apps/frontend`)
- `apps/frontend/src/app/core/services/auth.service.ts` : Gestion du token JWT, état `currentUser`, `login()`, `register()`, `logout()`, `isAuthenticated` signal.
- `apps/frontend/src/app/core/interceptors/auth.interceptor.ts` : Ajout automatique du header `Authorization: Bearer <token>` sur toutes les requêtes REST / SSE / Apollo.
- `apps/frontend/src/app/core/components/user-menu/user-menu-component.ts` : Affichage du nom et email réels de l'utilisateur connecté au lieu de "Guest User", bouton Déconnexion.
- `apps/frontend/src/app/features/auth/` : Modale ou pages Login & Register stylisées avec daisyUI 5.

## Étapes

1. Implémenter le module Auth côté backend NestJS avec `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `bcrypt`.
2. Lier les sessions et l'historique de chat à l'ID de l'utilisateur authentifié dans Prisma.
3. Créer l'`AuthService` et l'`AuthInterceptor` côté Angular frontend.
4. Mettre à jour `UserMenuComponent` pour refléter l'utilisateur connecté et proposer la connexion/déconnexion.
5. Protéger les routes ou afficher une modale d'authentification si l'utilisateur n'est pas connecté.

## Critères d'acceptation

- [ ] L'utilisateur peut créer un compte (`/register`) et se connecter (`/login`).
- [ ] Le token JWT est stocké et envoyé dans les requêtes via l'intercepteur.
- [ ] Les sessions de chat sont privées et associées au compte utilisateur connecté.
- [ ] Le menu utilisateur affiche les informations réelles et permet de se déconnecter.
- [ ] `nx run-many -t build` passe sans erreur.
