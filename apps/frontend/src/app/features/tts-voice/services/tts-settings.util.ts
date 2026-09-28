/** Pure TTS text/audio-math helpers (T94 split, no Angular deps). */

/** Strip markdown so the spoken text sounds natural. */
export function cleanMarkdownForSpeech(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[*\-+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Downsample analyser FFT bins to `target` 0..1 bars. */
export function downsampleBins(bins: Uint8Array, target: number): number[] {
  const out: number[] = [];
  const per = Math.max(1, Math.floor(bins.length / target));
  for (let i = 0; i < target; i++) {
    let sum = 0;
    let n = 0;
    for (let j = i * per; j < Math.min(bins.length, (i + 1) * per); j++) {
      sum += (bins[j] ?? 0) / 255;
      n++;
    }
    out.push(n > 0 ? Math.min(1, Math.max(0.08, sum / n)) : 0.08);
  }
  return out;
}
