/**
 * Frontend API Configuration
 *
 * Centralizes base URL resolution for different environments.
 * Provides typed access to API endpoints with full URLs.
 */

import { environment } from '@environment';
import {
  AI_ENDPOINTS,
  USER_ENDPOINTS,
  GRAPHQL_ENDPOINT,
  buildApiUrl,
  type AnyEndpoint,
} from './api-endpoints';

/**
 * Resolved base URLs per environment
 * - Development: http://localhost:3000/api
 * - Production: /api (relative to origin)
 */
export const API_BASE_URL = environment.apiBaseUrl;

/**
 * GraphQL endpoint (used by Apollo)
 */
export const GRAPHQL_URL = environment.graphqlUri;

/**
 * Build full URL for any API endpoint
 */
export function getApiUrl(endpoint: AnyEndpoint): string {
  return buildApiUrl(API_BASE_URL, endpoint);
}

/**
 * Build full URL for AI endpoints
 */
export function getAiUrl(endpoint: keyof typeof AI_ENDPOINTS): string {
  return buildApiUrl(API_BASE_URL, AI_ENDPOINTS[endpoint]);
}

/**
 * Build full URL for User endpoints
 */
export function getUserUrl(endpoint: keyof typeof USER_ENDPOINTS): string {
  const ep = USER_ENDPOINTS[endpoint];
  // Handle dynamic endpoints (functions)
  if (typeof ep === 'function') {
    throw new Error(
      'Dynamic endpoints require parameters. Use the endpoint function directly.',
    );
  }
  return buildApiUrl(API_BASE_URL, ep);
}

/**
 * Pre-resolved AI endpoint URLs (for convenience)
 */
export const AI_URLS = {
  models: getAiUrl('models'),
  chatStream: getAiUrl('chatStream'),
  transcribe: getAiUrl('transcribe'),
  tts: getAiUrl('tts'),
  voices: getAiUrl('voices'),
  ttsModels: getAiUrl('ttsModels'),
  ttsProviders: getAiUrl('ttsProviders'),
} as const;

/**
 * Pre-resolved User endpoint URLs (for convenience)
 */
export const USER_URLS = {
  memories: getUserUrl('memories'),
  tags: getUserUrl('tags'),
  tagsReset: getUserUrl('tagsReset'),
  profile: getUserUrl('profile'),
} as const;

/** Pre-resolved combined API endpoint URLs (AI + User) */
export const API_URLS = {
  ...AI_URLS,
  ...USER_URLS,
} as const;

/**
 * Dynamic endpoint builders (require parameters)
 */
export const DYNAMIC_ENDPOINTS = {
  memoryById: (id: string) =>
    buildApiUrl(API_BASE_URL, USER_ENDPOINTS.memoryById(id)),
  tagByName: (name: string) =>
    buildApiUrl(API_BASE_URL, USER_ENDPOINTS.tagByName(name)),
} as const;

/**
 * Environment info for debugging
 */
export const API_ENV_INFO = {
  isProduction: environment.production,
  baseUrl: API_BASE_URL,
  graphqlUrl: GRAPHQL_URL,
} as const;

export type ApiUrl = string;
