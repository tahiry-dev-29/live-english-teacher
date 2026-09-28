import type {
  TtsVoice,
  TtsModel,
  TtsProviderMeta,
} from '@features/tts-voice/services/elevenlabs-audio.util';
import type { SelectOption } from '@app-shared/ui/select/select.component';

export const SAMPLE_TEXTS: Record<string, string> = {
  en: 'Hello! I am your AI English tutor. How can I help you today?',
  fr: 'Bonjour ! Je suis votre tuteur IA. Comment puis-je vous aider ?',
  es: '¡Hola! Soy tu tutor de IA. ¿Cómo puedo ayudarte hoy?',
  de: 'Hallo! Ich bin dein KI-Tutor. Wie kann ich dir helfen?',
  it: 'Ciao! Sono il tuo tutor AI. Come posso aiutarti oggi?',
  ja: 'こんにちは！あなたのAIチューターです。よろしくお願いします！',
};

export function sampleTextFor(langCode: string): string {
  return SAMPLE_TEXTS[langCode] || SAMPLE_TEXTS['en'] || 'Hello!';
}

export function toTtsProviderOptions(
  providers: TtsProviderMeta[],
): SelectOption[] {
  return [
    { value: 'default', label: 'Server Default' },
    ...providers.map((p) => ({ value: p.id, label: p.label })),
  ];
}

export function toVoiceOptions(voices: TtsVoice[]): SelectOption[] {
  return voices.map((v) => ({
    value: v.id,
    label: v.name + (v.gender ? ` · ${v.gender}` : ''),
  }));
}

export function toTtsModelOptions(models: TtsModel[]): SelectOption[] {
  return models.map((m) => ({ value: m.id, label: m.name }));
}

/** STT model options per TTS provider (pure — moved from the tab shell). */
export function sttModelOptionsFor(providerId: string): SelectOption[] {
  const base: SelectOption[] = [
    { value: 'whisper-large-v3-turbo', label: 'Whisper Large V3 Turbo' },
    { value: 'whisper-large-v3', label: 'Whisper Large V3 (Accurate)' },
    { value: 'distil-whisper-large-v3-en', label: 'Distil Whisper (EN)' },
  ];
  if (providerId === 'openai')
    return [{ value: 'whisper-1', label: 'Whisper-1 (OpenAI)' }, ...base];
  if (providerId === 'google')
    return [{ value: 'google-chirp', label: 'Google Chirp' }, ...base];
  return base;
}

export function getInputValue(event: Event): string {
  const target = event.target;
  if (target instanceof HTMLInputElement) return target.value;
  return '';
}
