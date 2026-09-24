/** Shared TTS header -> provider/key resolution for the AI controller. */
export interface TtsHeaderKeys {
  azureKey?: string;
  elevenKey?: string;
  openaiKey?: string;
  googleKey?: string;
  pollyKey?: string;
  minimaxKey?: string;
  providerKey?: string;
}

export function resolveTtsProvider(
  provider?: string,
  ttsProviderHeader?: string,
): string {
  const raw = ttsProviderHeader || provider;
  return raw === 'default' ? 'elevenlabs' : raw || 'elevenlabs';
}

export function resolveTtsApiKey(
  activeProvider: string,
  keys: TtsHeaderKeys,
): string | undefined {
  const keyMap: Record<string, string | undefined> = {
    azure: keys.azureKey,
    elevenlabs: keys.elevenKey,
    openai: keys.openaiKey,
    google: keys.googleKey,
    polly: keys.pollyKey,
    minimax: keys.minimaxKey,
  };
  return keys.providerKey || keyMap[activeProvider];
}
