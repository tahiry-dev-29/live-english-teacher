/** Pure helpers for VoiceControlComponent (T93 split, no Angular deps). */

export function buildFallbackBars(count = 48): number[] {
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    bars.push(0.25 + Math.abs(Math.sin(i * 0.4)) * 0.4);
  }
  return bars;
}

export function formatTimeSecs(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function isBarPlayed(
  index: number,
  totalBars: number,
  progressPct: number,
): boolean {
  if (totalBars === 0) return false;
  return (index / totalBars) * 100 <= progressPct;
}

export function barHeightPx(value: number): number {
  return Math.max(2, Math.min(15, value * 15));
}
