import type { AiProviderConfig } from '../ai-chat/ai-providers.registry';
import type { DiscoveredAiModel } from './ai-model.model';

/** Drops non-chat models (audio/image/embed/moderation) from /models lists. */
export function filterChatModels<T extends { id: string }>(models: T[]): T[] {
  return models.filter((m) => {
    const id = m.id.toLowerCase();
    return !(
      id.includes('whisper') ||
      id.includes('tts') ||
      id.includes('dall-e') ||
      id.includes('embed') ||
      id.includes('moderation') ||
      id.includes('guard')
    );
  });
}

/** Keeps generateContent-capable Gemini models only. */
export function filterGeminiModels<T extends {
  name: string;
  supportedGenerationMethods?: string[];
}>(models: T[]): T[] {
  return models.filter((m) => {
    const name = m.name.toLowerCase();
    const methods = m.supportedGenerationMethods || [];
    if (!methods.includes('generateContent')) return false;
    if (
      name.includes('embedding') ||
      name.includes('aqa') ||
      name.includes('imagen') ||
      name.includes('robotics')
    ) {
      return false;
    }
    return name.includes('gemini');
  });
}

/** Effective key for one provider (header key wins over env). */
export function effectiveProviderKey(
  config: AiProviderConfig,
  keys: Record<string, string>,
): string {
  return keys[config.id] || process.env[config.keyEnv] || '';
}

/** Formats a raw model id into a display name ('gpt-4o-mini' -> 'Gpt 4o Mini'). */
export function formatModelName(id: string): string {
  return id
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** Extracts a size token ('70b' -> '70B') from a model id. */
export function extractModelSize(id: string): string | undefined {
  const match = id.match(/(\d+b)/i);
  return match ? match[1].toUpperCase() : undefined;
}

/** Maps raw OpenAI-compatible models to discovered entries (max 20). */
export function mapOpenAiModels(
  config: AiProviderConfig,
  rawList: { id: string }[],
): DiscoveredAiModel[] {
  const filtered = filterChatModels(rawList);
  if (filtered.length === 0) return [];
  return filtered.slice(0, 20).map((m, idx) => ({
    id: m.id,
    name: formatModelName(m.id),
    provider: config.id,
    description: `Live from ${config.label}`,
    size: extractModelSize(m.id),
    isDefault: idx === 0 || m.id === config.defaultModel,
  }));
}
