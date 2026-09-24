import { DestroyRef } from '@angular/core';

export class AiConfigIdleHelper {
  constructor(
    private readonly fetchModels: (
      provider?: string,
      force?: boolean,
    ) => Promise<void>,
    private readonly provider: () => string,
    private readonly fetchFailed: () => boolean,
    private readonly setFetchFailed: (value: boolean) => void,
    private readonly liveError: () => string | null,
    private readonly setLiveError: (value: string | null) => void,
    private readonly logger: {
      warn: (message: string, error: unknown) => void;
    },
    private readonly destroyRef: DestroyRef,
  ) {}

  scheduleIdleFetch(): void {
    if (typeof window === 'undefined') return;
    const run = (): void => {
      void this.fetchModels();
    };
    const ric = (
      window as Window & {
        requestIdleCallback?: (
          cb: () => void,
          opts?: { timeout: number },
        ) => void;
      }
    ).requestIdleCallback;
    if (typeof ric === 'function') {
      ric.call(window, run, { timeout: 2000 });
    } else {
      setTimeout(run, 1500);
    }
  }

  resubscribeOnReconnect(): () => void {
    if (typeof window === 'undefined')
      return () => {
        /* noop */
      };

    const onOnline = (): void => {
      this.setFetchFailed(false);
      this.setLiveError(null);
      void this.fetchModels(this.provider(), true);
    };

    window.addEventListener('online', onOnline);
    const cleanup = () => {
      window.removeEventListener('online', onOnline);
    };
    this.destroyRef.onDestroy(cleanup);
    return cleanup;
  }
}
