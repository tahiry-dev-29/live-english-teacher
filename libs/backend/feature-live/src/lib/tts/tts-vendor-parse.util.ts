/**
 * Vendor JSON payload extraction for TTS synthesis.
 * Dependency-free (node --test imports it): returns the base64 audio string,
 * or null when the vendor envelope is unusable (caller classifies the failure).
 */

/** Google Cloud TTS returns base64 audio inside `audioContent`. */
export function parseGoogleAudio(data: unknown): string | null {
  const audio = (data as { audioContent?: string } | null)?.audioContent;
  return audio || null;
}

/** MiniMax returns base64 audio inside `data.audio`. */
export function parseMinimaxAudio(data: unknown): string | null {
  const audio = (data as { data?: { audio?: string } } | null)?.data?.audio;
  return audio || null;
}
