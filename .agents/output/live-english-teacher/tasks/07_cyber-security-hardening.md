# Tâche 07 — Audit sécurité & hardening

**Status:** DONE
**Priorité:** 🔴 Critique
**Date:** 2026-09-02
**Source:** Audit `thr-cyber`

## Contexte

Audit SAST/secrets réalisé sur le repo `fix-features-ia-chat`. 12 findings identifiés (2 critiques, 4 hauts, 5 moyens, 1 info).

## Findings à traiter

### 🔴 Critique

1. **Secrets dans `.env`** — `GEMINI_API_KEY` et mot de passe DB en clair. Action : vérifier rotation de la clé Gemini (si commit accidentel dans l'historique git, la révoquer). Enforcer `.env.example` sans valeurs réelles.
2. **Credentials DB** — `postgresql://tahiry:tahiry4534@localhost:5432/...` — mot de passe faible/faible entropy.

### 🟠 Haute

3. **CORS wildcard** — `app.enableCors()` sans origine → remplacer par liste blanche (`http://localhost:4200` en dev).
4. **Helmet / headers** — Ajouter `helmet` ou headers manuels (`X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`).
5. **Rate limiting** — Installer `@nestjs/throttler` sur `/api/ai/chat/stream` et mutations GraphQL.
6. **AuthGuard** — Décider si auth nécessaire (SSO, JWT) ou si l'app reste locale uniquement.

### 🟡 Moyenne

7. **GraphQL introspection** — Désactiver en prod (`introspection: false`).
8. **Genkit port 3400** — Binding `127.0.0.1` au lieu de `0.0.0.0`.
9. **Debug logging** — Supprimer `console.log` exposant base64 audio dans `live.resolver.ts`.
10. **Validation Resolver** — Ajouter `class-validator` DTO sur `live.resolver.ts` (content, sessionId).
11. **Error handling** — Catch silencieux → logger l'erreur avant de retourner `false`.

### 🟢 Info

12. **`@prisma/cli@2.20.1`** — Documenter pourquoi il reste (legacy) pour ne pas le supprimer accidentellement.

## Critères d'acceptation

- [ ] `.env` contient uniquement des placeholders dans `.env.example`
- [ ] `helmet` installé et configuré dans `main.ts`
- [ ] CORS restreint aux origines autorisées
- [ ] `@nestjs/throttler` actif sur endpoints IA
- [ ] `console.log` debug supprimés de `live.resolver.ts`
- [ ] Décision auth documentée dans `.agents/memory/decisions.md`

## Commandes de vérification

```bash
pnpm run lint
pnpm run build
curl -I http://localhost:3000/api/ai/chat/stream | grep -i "x-content-type-options\|content-security-policy"
```
