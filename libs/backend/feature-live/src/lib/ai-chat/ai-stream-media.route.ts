import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { SHARED_MESSAGES, SHARED_TTS_ERROR_MESSAGES } from '@shared/constants';
import { BACKEND_MESSAGES } from '../shared/messages';
import {
  TTS_FAILURE_STATUS,
  type TtsFailure,
  type TtsSynthesisOutcome,
} from '../tts/tts-failure.util';
import { resolveTtsApiKey, resolveTtsProvider } from './ai-stream-tts.util';

const logger = new Logger('TtsRoute');

/** Provider-prefixed user-facing text for a failure code. */
function failureText(failure: TtsFailure): string {
  const text =
    SHARED_TTS_ERROR_MESSAGES[failure.code] ??
    SHARED_MESSAGES.error.aiServiceUnavailable;
  return `${failure.provider.toUpperCase()}: ${text}`;
}

/** Failure -> HTTP payload: status + code + provider + actionable message. */
function ttsHttpException(failure: TtsFailure): HttpException {
  const statusCode = TTS_FAILURE_STATUS[failure.code] ?? HttpStatus.BAD_GATEWAY;
  if (failure.code === 'QUOTA_EXCEEDED') {
    logger.warn(
      `${BACKEND_MESSAGES.log.ttsQuotaExceeded} ${failure.provider} ${
        failure.detail ?? ''
      }`,
    );
  }
  return new HttpException(
    {
      statusCode,
      code: failure.code,
      provider: failure.provider,
      message: failureText(failure),
      ...(failure.detail ? { detail: failure.detail } : {}),
    },
    statusCode,
  );
}

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
    }): Promise<TtsSynthesisOutcome | null>;
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
  const outcome = await ttsProviderService.synthesize({
    provider: activeProvider,
    voiceId: dto.voiceId,
    modelId: dto.modelId,
    text: dto.text,
    apiKey,
    targetLanguage: dto.targetLanguage,
  });
  if (!outcome) {
    // Legacy double / empty result: still report the provider, not a bare 503.
    throw ttsHttpException({
      ok: false,
      code: 'PROVIDER_UNAVAILABLE',
      provider: activeProvider,
    });
  }
  if (outcome.ok === false) throw ttsHttpException(outcome);
  return { audioData: outcome.audioData, mimeType: outcome.mimeType };
}
