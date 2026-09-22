/** Pure helpers for CallInterfaceComponent (T93 split, no Angular deps). */

export type CallVisualState = 'idle' | 'listening' | 'processing' | 'speaking';

export function formatCallDuration(
  startTimeMs: number,
  nowMs = Date.now(),
): string {
  const diff = Math.max(0, Math.floor((nowMs - startTimeMs) / 1000));
  const mins = Math.floor(diff / 60)
    .toString()
    .padStart(2, '0');
  const secs = (diff % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

export function computeVisualizerBars(
  count: number,
  callState: string,
  nowMs = Date.now(),
): number[] {
  const isActive = callState === 'speaking' || callState === 'processing';
  const baseHeight = isActive ? 40 : 15;
  const variance = isActive ? 60 : 10;
  const speed = isActive ? 0.2 : 0.05;
  return Array.from({ length: count }, (_, i) => {
    const time = nowMs * speed;
    const wave = Math.sin(time * 0.01 + i * 0.5) * 0.5 + 0.5;
    const random = Math.random() * 0.3;
    return Math.max(5, (baseHeight + wave * variance) * (1 + random));
  });
}

export function barOpacity(index: number, total: number): number {
  const center = total / 2;
  const dist = Math.abs(index - center);
  return Math.max(0.3, 1 - (dist / center) * 0.8);
}
