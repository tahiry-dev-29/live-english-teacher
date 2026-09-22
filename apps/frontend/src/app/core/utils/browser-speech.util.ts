export interface BrowserVoiceMatch {
  voiceName?: string;
  voice?: SpeechSynthesisVoice;
  lang?: string;
}

/**
 * Voice resolution order: explicit object → explicit name → user selection
 * → language match → engine default → first voice.
 */
export function resolveBrowserVoice(
  voices: SpeechSynthesisVoice[],
  match?: BrowserVoiceMatch,
  selectedName?: string | null,
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  const byName = (n: string | undefined): SpeechSynthesisVoice | null =>
    n ? (voices.find((v) => v.name === n) ?? null) : null;
  return (
    byName(match?.voice?.name) ??
    byName(match?.voiceName) ??
    byName(selectedName ?? undefined) ??
    matchLang(voices, match?.lang) ??
    voices.find((v) => v.default) ??
    voices[0] ??
    null
  );
}

function matchLang(
  voices: SpeechSynthesisVoice[],
  lang: string | undefined,
): SpeechSynthesisVoice | null {
  const code = (lang || 'en-US').split('-')[0].toLowerCase();
  return voices.find((v) => v.lang.toLowerCase().startsWith(code)) ?? null;
}

/** Split long texts on sentence boundaries (Chrome ~15 s cutoff). */
export function splitChunks(text: string, limit = 220): string[] {
  const sentences = text
    .split(/(?<=[.!?…\n])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const out: string[] = [];
  let current = '';
  const push = (): void => {
    if (current.trim()) out.push(current.trim());
    current = '';
  };
  for (const s of sentences) {
    if ((current + ' ' + s).trim().length <= limit) {
      current = (current + ' ' + s).trim();
    } else {
      push();
      if (s.length <= limit) {
        current = s;
      } else {
        // Single over-long sentence: hard-split on words.
        for (const word of s.split(/\s+/)) {
          if ((current + ' ' + word).trim().length <= limit) {
            current = (current + ' ' + word).trim();
          } else {
            push();
            current = word;
          }
        }
      }
    }
  }
  push();
  return out.length > 0 ? out : [text.trim()];
}
