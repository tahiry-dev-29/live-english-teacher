/**
 * Registers the tsconfig path-alias resolve hook for backend unit tests.
 * Usage: `node --import @swc-node/register/esm-register
 *          --import ./scripts/test-ts-aliases.register.mjs --test ...`
 * (this file registers second, so its hook runs first; anything unmapped
 * falls through to swc-node's own resolver).
 */
import { register } from 'node:module';

register('./test-ts-aliases.hooks.mjs', import.meta.url);
