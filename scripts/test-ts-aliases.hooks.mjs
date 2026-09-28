/**
 * Node ESM resolve hook — maps the repo tsconfig path aliases to real files
 * so backend unit specs can `import` decorated Nest services + aliased libs
 * under plain `node --test` (no new dependency).
 *
 * Works together with `@swc-node/register/esm-register` (which transpiles
 * the TS once our hook short-circuits with the `swc` load attribute).
 * Registered via `scripts/test-ts-aliases.register.mjs`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '..',
);

/** Exact aliases, then prefix aliases (first match wins). */
const EXACT = new Map([
  [
    '@live-languages-teacher/data-access-prisma',
    'libs/data-access-prisma/src/index.ts',
  ],
  [
    '@live-languages-teacher/feature-live',
    'libs/backend/feature-live/src/index.ts',
  ],
  ['@shared/constants', 'libs/shared/constants/index.ts'],
]);
const PREFIX = [
  ['@shared/constants/', 'libs/shared/constants/'],
  [
    '@live-languages-teacher/data-access-prisma/',
    'libs/data-access-prisma/src/',
  ],
  ['@live-languages-teacher/feature-live/', 'libs/backend/feature-live/src/'],
];

function mapAlias(specifier) {
  if (EXACT.has(specifier)) return EXACT.get(specifier);
  for (const [prefix, target] of PREFIX) {
    if (specifier.startsWith(prefix))
      return target + specifier.slice(prefix.length);
  }
  return null;
}

function shortCircuit(file, context) {
  return {
    url: pathToFileURL(file).href,
    shortCircuit: true,
    importAttributes: { ...(context.importAttributes ?? {}), swc: file },
  };
}

export async function resolve(specifier, context, nextResolve) {
  const mapped = mapAlias(specifier);
  if (mapped) return shortCircuit(path.join(ROOT, mapped), context);
  // Extensionless relative TS imports (e.g. `./lib/foo` inside libs):
  // Node ESM needs the explicit `.ts` / `/index.ts`.
  if (
    (specifier.startsWith('./') || specifier.startsWith('../')) &&
    context.parentURL
  ) {
    const parent = fileURLToPath(context.parentURL);
    if (/\.m?tsx?$/i.test(parent)) {
      const base = path.resolve(path.dirname(parent), specifier);
      for (const candidate of [base + '.ts', path.join(base, 'index.ts')]) {
        if (fs.existsSync(candidate)) return shortCircuit(candidate, context);
      }
    }
  }
  return nextResolve(specifier);
}
