import { Injectable, inject } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { Apollo } from 'apollo-angular';
import { environment } from '@environment';
import { MESSAGES } from '@core/constants/messages';
import {
  CHAT_MUTATION,
  ChatMutationResult,
} from '@core/graphql/chat.operations';
import { AiConfigService } from '@core/services/ai-config.service';
import { ChatStreamService } from '@core/services/chat-stream.service';

import { ElevenLabsVoiceService } from '@core/services/elevenlabs-voice.service';
import { ApiKeyService } from '@core/services/api-key.service';

export interface AudioChatRequest {
  audioData: string;
  mimeType: string;
  sessionId: string | null;
  targetLanguage: string;
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
  private readonly apollo = inject(Apollo);
  private readonly aiConfig = inject(AiConfigService);
  private readonly chatStream = inject(ChatStreamService);
  private readonly ttsVoiceService = inject(ElevenLabsVoiceService);
  private readonly apiKeyService = inject(ApiKeyService);

  async sendAudio(request: AudioChatRequest): Promise<AudioChatResult> {
    try {
      const result = await this.apollo
        .mutate<ChatMutationResult>({
          mutation: CHAT_MUTATION,
          variables: {
            content: '',
            sessionId: request.sessionId,
            audioData: request.audioData,
            mimeType: request.mimeType,
            targetLanguage: request.targetLanguage,
            model: this.aiConfig.selectedModelId(),
            provider: this.aiConfig.provider(),
          },
          context: {
            headers: new HttpHeaders(this.chatStream.buildApiHeaders()),
          },
        })
        .toPromise();

      if (!result?.data) return { kind: 'empty' };

      return {
        kind: 'ok',
        text: result.data.chat.text,
        sessionId: result.data.chat.sessionId,
      };
    } catch (error) {
      console.error(MESSAGES.log.sendAudioFailed, error);
      return { kind: 'error' };
    }
  }

  async transcribe(
    audioData: string,
    mimeType = DEFAULT_AUDIO_MIME_TYPE,
    language?: string,
    model?: string,
  ): Promise<string | null> {
    try {
      const sttModel = model || this.ttsVoiceService.selectedSttModel();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const groqKey = this.apiKeyService.getKey('groq');
      if (groqKey) {
        headers['x-groq-api-key'] = groqKey;
      }

      const res = await fetch(`${environment.apiBaseUrl}/ai/transcribe`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          audioData,
          mimeType,
          language,
          model: sttModel,
        }),
      });

      if (!res.ok) return null;
      const data = (await res.json()) as { transcript?: string };
      return data.transcript || null;
    } catch (error) {
      console.warn(MESSAGES.log.transcriptionFailed, error);
      return null;
    }
  }
}
