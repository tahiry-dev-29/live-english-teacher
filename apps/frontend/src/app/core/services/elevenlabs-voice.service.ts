import { Injectable, signal } from '@angular/core';
import { environment } from '@environment';

export interface TtsVoice {
  id: string;
  name: string;
  lang: string;
  description?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ElevenLabsVoiceService {
  readonly voices = signal<TtsVoice[]>([
    { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George (Warm & Engaging)', lang: 'en-US', description: 'Deep, warm male voice' },
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah (Soft & Natural)', lang: 'en-US', description: 'Calm, friendly female voice' },
    { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni (Dynamic & Clear)', lang: 'en-US', description: 'Energetic male voice' },
    { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold (Crisp & Clear)', lang: 'en-US', description: 'Authoritative male voice' },
    { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam (Smooth & Natural)', lang: 'en-US', description: 'Conversational male voice' },
    { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel (Deep British)', lang: 'en-GB', description: 'Professional British male' },
    { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica (Bright & Playful)', lang: 'en-US', description: 'Young friendly female' },
    { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris (Casual & Friendly)', lang: 'en-US', description: 'Casual conversational voice' },
  ]);

  readonly selectedVoiceId = signal<string>('JBFqnCBsd6RMkjVDRZzb');

  constructor() {
    this.loadVoicesFromBackend();
  }

  async loadVoicesFromBackend(): Promise<void> {
    try {
      const res = await fetch(`${environment.apiBaseUrl}/ai/voices`);
      if (res.ok) {
        const data = (await res.json()) as TtsVoice[];
        if (data && data.length > 0) {
          this.voices.set(data);
        }
      }
    } catch {
      // ignore, default voices kept
    }
  }

  /**
   * Request text-to-speech audio from the backend.
   * Returns base64 audio and mimeType or null if unavailable.
   */
  async generateSpeechAudio(
    text: string,
    voiceId?: string,
    targetLanguage?: string
  ): Promise<{ audioData: string; mimeType: string } | null> {
    const selectedVoice = voiceId || this.selectedVoiceId();
    try {
      const response = await fetch(`${environment.apiBaseUrl}/ai/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceId: selectedVoice,
          targetLanguage,
        }),
      });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as {
        audioData?: string;
        mimeType?: string;
      };
      if (data?.audioData) {
        return {
          audioData: data.audioData,
          mimeType: data.mimeType || 'audio/mpeg',
        };
      }
      return null;
    } catch (error) {
      console.warn('ElevenLabs TTS request failed:', error);
      return null;
    }
  }
}
