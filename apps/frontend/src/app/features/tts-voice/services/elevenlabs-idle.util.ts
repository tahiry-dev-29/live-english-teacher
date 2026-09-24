/**
 * Chunked init (task 88): schedule `run` on browser idle so first paint
 * stays API-free — requestIdleCallback when available, timer fallback.
 */
export function scheduleIdleCallback(
  run: () => void,
  timeoutMs: number,
  fallbackMs: number,
): void {
  if (typeof window === 'undefined') return;
  const ric = (
    window as Window & {
      requestIdleCallback?: (
        cb: () => void,
        opts?: { timeout: number },
      ) => void;
    }
  ).requestIdleCallback;
  if (typeof ric === 'function') ric.call(window, run, { timeout: timeoutMs });
  else setTimeout(run, fallbackMs);
}
