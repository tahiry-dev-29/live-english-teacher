/**
 * Pure routing helpers (dependency-free so node --test can import them).
 * The known provider ids come from the caller (Object.keys of the registry).
 */

/** 'default' → elevenlabs, unknown → null (caller returns null/[]). */
export function resolveProviderId(
  raw?: string,
  knownIds: readonly string[] = [],
): string | null {
  const id = (raw || 'elevenlabs').toLowerCase();
  if (id === 'default') return 'elevenlabs';
  return knownIds.includes(id) ? id : null;
}

export function resolveVoice(
  voiceId: string | undefined,
  defaultVoiceId: string,
): string {
  return voiceId || defaultVoiceId;
}

/** User key first, server env second, '' when none (callers return null/[]). */
export function effectiveKey(apiKey?: string, keyEnv?: string): string {
  return apiKey || (keyEnv ? process.env[keyEnv] || '' : '') || '';
}
