import { HttpException, HttpStatus } from '@nestjs/common';
import { BACKEND_MESSAGES } from '../shared/messages';
import { resolveTtsApiKey, resolveTtsProvider } from './ai-stream-tts.util';

/** POST /api/ai/tts body: resolves provider + key and synthesizes audio. */
export async function processTts(
  ttsProviderService: {
    synthesize(input: {
      provider: string;
      voiceId?: string;
      modelId?: string;
      text: string;
      apiKey?: string;
      targetLanguage?: string;
    }): Promise<{ audioData: string; mimeType: string } | null>;
  },
  dto: {
    text: string;
    provider?: string;
    voiceId?: string;
    modelId?: string;
    targetLanguage?: string;
  },
  keys: {
    headerTtsProvider?: string;
    headerProvider?: string;
    providerKey?: string;
    azureKey?: string;
    elevenKey?: string;
    openaiKey?: string;
    googleKey?: string;
    pollyKey?: string;
    minimaxKey?: string;
  },
): Promise<{ audioData: string; mimeType: string }> {
  const activeProvider = resolveTtsProvider(
    dto.provider || keys.headerProvider,
    keys.headerTtsProvider,
  );
  const apiKey = resolveTtsApiKey(activeProvider, {
    azureKey: keys.azureKey,
    elevenKey: keys.elevenKey,
    openaiKey: keys.openaiKey,
    googleKey: keys.googleKey,
    pollyKey: keys.pollyKey,
    minimaxKey: keys.minimaxKey,
    providerKey: keys.providerKey,
  });
  const audio = await ttsProviderService.synthesize({
    provider: activeProvider,
    voiceId: dto.voiceId,
    modelId: dto.modelId,
    text: dto.text,
    apiKey,
    targetLanguage: dto.targetLanguage,
  });
  if (!audio) {
    throw new HttpException(
      BACKEND_MESSAGES.template.ttsUnavailable(activeProvider),
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
  return audio;
}
