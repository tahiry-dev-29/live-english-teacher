/**
 * Centralized API Endpoints
 *
 * All REST endpoint paths defined as constants for:
 * - Type safety and autocomplete
 * - Single source of truth
 * - Easy refactoring
 * - Clean code: no magic strings scattered across services
 */

// ============================================
// AI Chat & Streaming Endpoints
// ============================================
export const AI_ENDPOINTS = {
  /** GET /api/ai/models - Discover live models for a provider */
  models: '/ai/models' as const,

  /** POST /api/ai/chat/stream - SSE streaming chat */
  chatStream: '/ai/chat/stream' as const,

  /** POST /api/ai/transcribe - Speech-to-text (Groq Whisper) */
  transcribe: '/ai/transcribe' as const,

  /** POST /api/ai/tts - Text-to-speech synthesis */
  tts: '/ai/tts' as const,

  /** GET /api/ai/voices - List available voices for a provider */
  voices: '/ai/voices' as const,

  /** GET /api/ai/tts-models - List TTS models for a provider */
  ttsModels: '/ai/tts-models' as const,

  /** GET /api/ai/tts-providers - List TTS providers with metadata */
  ttsProviders: '/ai/tts-providers' as const,
} as const;

// ============================================
// User Data Endpoints (Memories, Tags, Profile)
// ============================================
export const USER_ENDPOINTS = {
  /** GET/POST /api/user/memories - User memory CRUD */
  memories: '/user/memories' as const,

  /** PATCH/DELETE /api/user/memories/:id - Single memory operations */
  memoryById: (id: string) => `/user/memories/${id}` as const,

  /** GET/POST /api/user/tags - Prompt tag CRUD */
  tags: '/user/tags' as const,

  /** PATCH/DELETE /api/user/tags/:name - Single tag operations */
  tagByName: (name: string) =>
    `/user/tags/${encodeURIComponent(name)}` as const,

  /** DELETE /api/user/tags/reset - Reset custom tags to defaults */
  tagsReset: '/user/tags/reset' as const,

  /** GET/PUT /api/user/profile - User profile */
  profile: '/user/profile' as const,
} as const;

// ============================================
// GraphQL Endpoint
// ============================================
export const GRAPHQL_ENDPOINT = '/graphql' as const;

// ============================================
// Helper: Build full URL from base + endpoint
// ============================================
export function buildApiUrl(baseUrl: string, endpoint: string): string {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${cleanBase}${cleanEndpoint}`;
}

// ============================================
// Type exports for consumers
// ============================================
export type AiEndpoint = (typeof AI_ENDPOINTS)[keyof typeof AI_ENDPOINTS];
export type UserEndpoint = {
  [K in keyof typeof USER_ENDPOINTS]: (typeof USER_ENDPOINTS)[K] extends string
    ? (typeof USER_ENDPOINTS)[K]
    : never;
}[keyof typeof USER_ENDPOINTS];
export type AnyEndpoint = AiEndpoint | UserEndpoint | typeof GRAPHQL_ENDPOINT;
