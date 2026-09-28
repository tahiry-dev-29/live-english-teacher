import { Injectable, Logger } from '@nestjs/common';
import { audioSuccess, postForAudio, postForJson } from './tts-http.util';
import {
  classifyTtsFailure,
  missingKeyFailure,
  type TtsSynthesisOutcome,
} from './tts-failure.util';
import { parseGoogleAudio, parseMinimaxAudio } from './tts-vendor-parse.util';

/**
 * Vendors without a dedicated client: openai, azure, google, polly, minimax.
 * Outbound calls go through axios (stack rule); every method returns a typed
 * outcome (never a bare null) so POST /ai/tts can report quota / key / voice
 * failures instead of a generic 503.
 */
@Injectable()
export class TtsVendorsService {
  private readonly logger = new Logger(TtsVendorsService.name);

  async openAi(
    text: string,
    voice: string,
    model: string,
    apiKey: string,
  ): Promise<TtsSynthesisOutcome> {
    if (!apiKey) return missingKeyFailure('openai');
    const out = await postForAudio(
      'https://api.openai.com/v1/audio/speech',
      {
        model: model || 'tts-1',
        input: text,
        voice: voice || 'alloy',
        response_format: 'mp3',
      },
      { Authorization: `Bearer ${apiKey}` },
      this.logger,
      'OpenAI TTS',
    );
    if (out.ok === false)
      return classifyTtsFailure('openai', out.status, out.body);
    return audioSuccess(out.data);
  }

  async azure(
    text: string,
    voice: string,
    apiKey: string,
  ): Promise<TtsSynthesisOutcome> {
    if (!apiKey) return missingKeyFailure('azure');
    const region = process.env['AZURE_SPEECH_REGION'] || 'eastus';
    const safe = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const out = await postForAudio(
      `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
      `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='${voice}'>${safe}</voice></speak>`,
      {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
        'User-Agent': 'live-english-teacher',
      },
      this.logger,
      'Azure TTS',
    );
    if (out.ok === false)
      return classifyTtsFailure('azure', out.status, out.body);
    return audioSuccess(out.data);
  }

  async google(
    text: string,
    voiceName: string,
    apiKey: string,
  ): Promise<TtsSynthesisOutcome> {
    if (!apiKey) return missingKeyFailure('google');
    const langCode = voiceName.split('-').slice(0, 2).join('-') || 'en-US';
    const out = await postForJson(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        input: { text },
        voice: { languageCode: langCode, name: voiceName },
        audioConfig: { audioEncoding: 'MP3' },
      },
      {},
      this.logger,
      'Google TTS',
    );
    if (out.ok === false)
      return classifyTtsFailure('google', out.status, out.body);
    const audio = parseGoogleAudio(out.data);
    if (!audio) {
      return classifyTtsFailure('google', 400, 'missing audioContent');
    }
    return { ok: true, audioData: audio, mimeType: 'audio/mpeg' };
  }

  /** AWS Polly needs SigV4 signing — not wired yet (explicit, not a silent null). */
  async polly(voiceId: string): Promise<TtsSynthesisOutcome> {
    this.logger.warn(
      `Polly TTS invoked for voice ${voiceId} (not implemented)`,
    );
    return classifyTtsFailure('polly', 501, 'Polly synthesis is not wired yet');
  }

  async minimax(
    text: string,
    voiceId: string,
    apiKey: string,
  ): Promise<TtsSynthesisOutcome> {
    if (!apiKey) return missingKeyFailure('minimax');
    const out = await postForJson(
      'https://api.minimax.chat/v1/t2a_v2',
      {
        model: 'speech-01-turbo',
        text,
        stream: false,
        voice_setting: {
          voice_id: voiceId || 'female-tutor-01',
          speed: 1.0,
          vol: 1.0,
          pitch: 0,
        },
      },
      { Authorization: `Bearer ${apiKey}` },
      this.logger,
      'MiniMax TTS',
    );
    if (out.ok === false)
      return classifyTtsFailure('minimax', out.status, out.body);
    const audio = parseMinimaxAudio(out.data);
    if (!audio) return classifyTtsFailure('minimax', 400, 'missing data.audio');
    return { ok: true, audioData: audio, mimeType: 'audio/mpeg' };
  }
}
