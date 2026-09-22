/**
 * Shared Constants - Public API
 *
 * Single entry point for all shared constants across the monorepo.
 *
 * - api-endpoints: Pure endpoint path constants (safe for both F/E & B/E)
 * - external-apis: External provider configs (safe for both F/E & B/E)
 *
 * For frontend URL helpers (API_URLS, DYNAMIC_ENDPOINTS, etc.), import directly:
 *   import { API_URLS } from '@shared/constants/api-config';
 */

// API Endpoints (REST paths) - pure constants, safe for all
export * from './api-endpoints';

// External API Provider Configs (Gemini, Groq, etc.) - safe for all
// (uses process.env only inside functions with runtime guard)
export * from './external-apis';

// Frontend API Configuration is NOT re-exported here because it imports
// @environment which is frontend-only. The frontend should import directly:
//   import { API_URLS, DYNAMIC_ENDPOINTS } from '@shared/constants/api-config';
