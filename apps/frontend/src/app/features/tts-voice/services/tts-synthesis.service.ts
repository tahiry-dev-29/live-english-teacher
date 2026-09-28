import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';
import { ApiKeyService } from '@features/settings/services/api-key.service';
import { API_URLS } from '@shared/constants/api-config';
import { MESSAGES } from '@core/constants/messages';
import { LoggingService } from '@core/services/logging.service';
import { ElevenLabsVoiceService } from './elevenlabs-voice.service';
import {
  buildTtsRequestBody,
  parseTtsAudioPayload,
  resolveActiveProviderId,
} from './elevenlabs-audio.util';
import { toTtsFailure, type TtsFailure } from './tts-failure.util';

export type TtsSynthesisOutcome =
  { ok: true; audioData: string; mimeType: string } | TtsFailure;

/**
 * POST /ai/tts synthesis.
 *
 * Angular 20 rule (.agents/rules/angularv20-http.md): a POST is an explicit
 * action -> HttpClient Observable in a dedicated service. Never a native fetch,
 * never an auto-reactive resource, never inside a component.
 *
 * Failures keep the server cause (quota / key / voice+model) so the UI can say
 * what to fix instead of a generic "TTS not available".
 */
@Injectable({
  providedIn: 'root',
})
export class TtsSynthesisService {
  private readonly logger = inject(LoggingService);
  private readonly apiKeys = inject(ApiKeyService);
  private readonly http = inject(HttpClient);
  private readonly voice = inject(ElevenLabsVoiceService);

  synthesize(
    text: string,
    options: { voiceId?: string; lang?: string } = {},
  ): Observable<TtsSynthesisOutcome> {
    const provider = resolveActiveProviderId(this.voice.selectedProviderId());
    const voiceId = options.voiceId || this.voice.selectedVoiceId();
    const modelId = this.voice.selectedModelId() || undefined;

    return this.http
      .post<{ audioData?: string; mimeType?: string }>(
        API_URLS.tts,
        buildTtsRequestBody(provider, voiceId, modelId, text, options.lang),
        { headers: this.apiKeys.getTtsHeaders(provider) },
      )
      .pipe(
        map((data) => {
          const audio = parseTtsAudioPayload(data ?? {});
          if (!audio) return toTtsFailure(null, provider);
          return { ok: true as const, ...audio };
        }),
        catchError((error: unknown) => {
          this.logger.warn(MESSAGES.log.ttsRequestFailed, error);
          // The interceptor may already have normalized the error: keep both
          // the raw payload (code/provider) and its user-facing text.
          const payload =
            error instanceof HttpErrorResponse ? error.error : null;
          const fallback = error instanceof Error ? error.message : '';
          return of(toTtsFailure(payload, provider, fallback));
        }),
      );
  }
}
