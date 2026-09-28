import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Apollo } from 'apollo-angular';
import { MESSAGES } from '@core/constants/messages';
import {
  CHAT_MUTATION,
  ChatMutationResult,
} from '@core/graphql/chat.operations';
import { AiConfigService } from '@features/settings/services/ai-config.service';
import { ChatStreamService } from '@features/chat/services/chat-stream.service';

import { ElevenLabsVoiceService } from '@features/tts-voice/services/elevenlabs-voice.service';
import { ApiKeyService } from '@features/settings/services/api-key.service';
import { API_URLS } from '@shared/constants/api-config';
import { LoggingService } from '@core/services/logging.service';

export interface AudioChatRequest {
  audioData: string;
  mimeType: string;
  sessionId: string | null;
  targetLanguage: string;
  /** Invisible LLM-only context (profile/memories) — never stored. */
  context?: string;
}

export type AudioChatResult =
  | { kind: 'ok'; text: string; sessionId: string }
  | { kind: 'empty' }
  | { kind: 'error' };

const DEFAULT_AUDIO_MIME_TYPE = 'audio/webm';

/**
 * Audio transport: audio chat mutation (GraphQL) and Groq Whisper transcription.
 * Owns HTTP concerns only — conversation state stays in MessageService.
 */
@Injectable({
  providedIn: 'root',
})
export class ChatAudioService {
  private readonly logger = inject(LoggingService);
  private readonly apollo = inject(Apollo);
  private readonly aiConfig = inject(AiConfigService);
  private readonly chatStream = inject(ChatStreamService);
  private readonly ttsVoiceService = inject(ElevenLabsVoiceService);
  private readonly apiKeyService = inject(ApiKeyService);
  private readonly http = inject(HttpClient);

  async sendAudio(request: AudioChatRequest): Promise<AudioChatResult> {
    try {
      const result = await firstValueFrom(
        this.apollo.mutate<ChatMutationResult>({
          mutation: CHAT_MUTATION,
          variables: {
            content: '',
            sessionId: request.sessionId,
            audioData: request.audioData,
            mimeType: request.mimeType,
            targetLanguage: request.targetLanguage,
            model: this.aiConfig.selectedModelId(),
            provider: this.aiConfig.provider(),
            context: request.context || undefined,
          },
          context: {
            headers: new HttpHeaders(this.chatStream.buildApiHeaders()),
          },
        }),
      );

      if (!result?.data) return { kind: 'empty' };

      return {
        kind: 'ok',
        text: result.data.chat.text,
        sessionId: result.data.chat.sessionId,
      };
    } catch (error) {
      this.logger.error(MESSAGES.log.sendAudioFailed, error);
      return { kind: 'error' };
    }
  }

  async transcribe(
    audioData: string,
    mimeType = DEFAULT_AUDIO_MIME_TYPE,
    language?: string,
    model?: string,
  ): Promise<string | null> {
    // POST action: explicit user-triggered HttpClient Observable → Promise at
    // the transport boundary (interceptor normalizes HTTP errors to UX text).
    try {
      const sttModel = model || this.ttsVoiceService.selectedSttModel();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const groqKey = this.apiKeyService.getKey('groq');
      if (groqKey) {
        headers['x-groq-api-key'] = groqKey;
      }

      const data = await firstValueFrom(
        this.http.post<{ transcript?: string }>(
          API_URLS.transcribe,
          { audioData, mimeType, language, model: sttModel },
          { headers },
        ),
      );
      return data.transcript || null;
    } catch (error) {
      this.logger.warn(MESSAGES.log.transcriptionFailed, error);
      return null;
    }
  }
}
