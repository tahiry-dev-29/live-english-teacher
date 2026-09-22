/** Restartable inactivity timer for VoiceCallService (T93 split). */

export interface InactivityTimer {
  start(): void;
  clear(): void;
}

export function createInactivityTimer(
  timeoutMs: number,
  onFire: () => void,
): InactivityTimer {
  let id: ReturnType<typeof setTimeout> | null = null;
  const clear = () => {
    if (id) {
      clearTimeout(id);
      id = null;
    }
  };
  return {
    start() {
      clear();
      id = setTimeout(() => {
        id = null;
        onFire();
      }, timeoutMs);
    },
    clear,
  };
}
