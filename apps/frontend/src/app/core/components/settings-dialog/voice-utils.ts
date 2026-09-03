/**
 * Sample texts for voice preview in different languages.
 */
export const SAMPLE_TEXTS: Record<string, string> = {
  en: 'Hello! This is a sample of my voice. Nice to meet you!',
  fr: 'Bonjour! Ceci est un exemple de ma voix. Enchanté!',
  es: '¡Hola! Este es un ejemplo de mi voz. ¡Mucho gusto!',
  de: 'Hallo! Dies ist ein Beispiel meiner Stimme. Freut mich!',
  it: 'Ciao! Questo è un esempio della mia voce. Piacere!',
  ja: 'こんにちは！これは私の声のサンプルです。よろしくお願いします！',
};

/**
 * Preview a voice using the Web Speech API.
 */
export function previewVoice(
  voice: SpeechSynthesisVoice,
  playingVoice: (value: string | null) => void
): void {
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    playingVoice(null);
    return;
  }

  window.speechSynthesis.cancel();
  const langCode = voice.lang.split('-')[0].toLowerCase();
  const text = SAMPLE_TEXTS[langCode] || SAMPLE_TEXTS['en'];

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.rate = 1;
  utterance.pitch = 1;

  utterance.onstart = () => playingVoice(voice.name);
  utterance.onend = () => playingVoice(null);
  utterance.onerror = () => playingVoice(null);

  window.speechSynthesis.speak(utterance);
}
