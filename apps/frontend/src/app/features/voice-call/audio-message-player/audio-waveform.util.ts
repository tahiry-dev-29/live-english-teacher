/** Pure waveform helpers for AudioMessagePlayer (T93 split, no Angular deps). */

export function generateWaveformBars(count = 32): number[] {
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    const value = 0.2 + Math.sin(i * 0.3) * 0.3 + Math.random() * 0.5;
    bars.push(Math.min(1, Math.max(0.1, value)));
  }
  return bars;
}

export function isBarPlayedByProgress(
  index: number,
  totalBars: number,
  currentTime: number,
  duration: number,
): boolean {
  if (totalBars === 0 || duration === 0) return false;
  return index / totalBars <= currentTime / duration;
}

export function waveformBarHeight(value: number): number {
  return Math.max(4, value * 28);
}
