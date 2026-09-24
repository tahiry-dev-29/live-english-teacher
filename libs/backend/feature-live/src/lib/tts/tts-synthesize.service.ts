import { Injectable, Logger } from '@nestjs/common';
import { ElevenLabsService } from './elevenlabs/elevenlabs.service';
import { fetchAudio, toAudioResult } from './tts-http.util';
import type { TtsSynthesisResult } from './tts-provider.service';

/** Per-vendor synthesis. Null = unavailable (no browser fallback). */
@Injectable()
export class TtsSynthesizeService {
  private readonly logger = new Logger(TtsSynthesizeService.name);

  constructor(private readonly elevenLabsService: ElevenLabsService) {}

  async elevenLabs(
    text: string,
    voiceId: string,
    apiKey: string,
    modelId?: string,
  ): Promise<TtsSynthesisResult | null> {
    if (apiKey) {
      const audio = await fetchAudio(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
            Accept: 'audio/mpeg',
          },
          body: JSON.stringify({
            text,
            model_id: modelId || 'eleven_multilingual_v2',
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        },
        this.logger,
        'Custom ElevenLabs TTS',
      );
      if (audio) return toAudioResult(audio);
      this.logger.warn('Custom ElevenLabs TTS failed');
    }
    return this.elevenLabsService.generateTtsAudio(text, voiceId);
  }

  async openAi(
    text: string,
    voice: string,
    model: string,
    apiKey: string,
  ): Promise<TtsSynthesisResult | null> {
    if (!apiKey) return null;
    const audio = await fetchAudio(
      'https://api.openai.com/v1/audio/speech',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || 'tts-1',
          input: text,
          voice: voice || 'alloy',
          response_format: 'mp3',
        }),
      },
      this.logger,
      'OpenAI TTS',
    );
    return audio ? toAudioResult(audio) : null;
  }

  async azure(
    text: string,
    voice: string,
    apiKey: string,
  ): Promise<TtsSynthesisResult | null> {
    if (!apiKey) return null;
    const region = process.env['AZURE_SPEECH_REGION'] || 'eastus';
    const safe = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const audio = await fetchAudio(
      `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
          'User-Agent': 'live-english-teacher',
        },
        body: `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='${voice}'>${safe}</voice></speak>`,
      },
      this.logger,
      'Azure TTS',
    );
    return audio ? toAudioResult(audio) : null;
  }

  async google(
    text: string,
    voiceName: string,
    apiKey: string,
  ): Promise<TtsSynthesisResult | null> {
    if (!apiKey) return null;
    const langCode = voiceName.split('-').slice(0, 2).join('-') || 'en-US';
    try {
      const res = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { text },
            voice: { languageCode: langCode, name: voiceName },
            audioConfig: { audioEncoding: 'MP3' },
          }),
        },
      );
      if (!res.ok) {
        this.logger.error(`Google TTS error: ${res.status}`);
        return null;
      }
      const data = (await res.json()) as { audioContent?: string };
      return data.audioContent
        ? { audioData: data.audioContent, mimeType: 'audio/mpeg' }
        : null;
    } catch (e) {
      this.logger.error(`Google TTS failed: ${e}`);
      return null;
    }
  }

  async polly(voiceId: string): Promise<TtsSynthesisResult | null> {
    this.logger.log(`Polly TTS invoked for voice ${voiceId}`);
    return null;
  }

  async minimax(
    text: string,
    voiceId: string,
    apiKey: string,
  ): Promise<TtsSynthesisResult | null> {
    if (!apiKey) return null;
    try {
      const res = await fetch('https://api.minimax.chat/v1/t2a_v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'speech-01-turbo',
          text,
          stream: false,
          voice_setting: {
            voice_id: voiceId || 'female-tutor-01',
            speed: 1.0,
            vol: 1.0,
            pitch: 0,
          },
        }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { data?: { audio?: string } };
      return data.data?.audio
        ? { audioData: data.data.audio, mimeType: 'audio/mpeg' }
        : null;
    } catch (e) {
      this.logger.error(`MiniMax TTS failed: ${e}`);
      return null;
    }
  }
}
