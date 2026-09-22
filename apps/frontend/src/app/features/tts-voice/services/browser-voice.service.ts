import {
  Injectable,
  signal,
  computed,
  inject,
  DestroyRef,
} from '@angular/core';
import type { BrowserVoiceMatch } from '@core/utils/browser-speech.util';
import { resolveBrowserVoice } from '@core/utils/browser-speech.util';

const STORAGE_KEY = 'tts_browser_voice';

/**
 * Live browser voice list + persisted user selection.
 * Single source of truth for every Web Speech consumer (chat playback,
 * voice picker, previews) — no more orphaned per-component selections.
 */
@Injectable({
  providedIn: 'root',
})
export class BrowserVoiceService {
  private readonly destroyRef = inject(DestroyRef);

  readonly browserVoices = signal<SpeechSynthesisVoice[]>([]);
  readonly selectedVoiceName = signal<string | null>(this.loadStored());
  readonly engineChecked = signal<boolean>(false);

  readonly speechSupported = computed(
    () => typeof window !== 'undefined' && 'speechSynthesis' in window,
  );
  readonly ready = computed(
    () => this.speechSupported() && this.browserVoices().length > 0,
  );

  private voicesHandler: (() => void) | null = null;

  constructor() {
    if (this.speechSupported()) {
      const handler = (): void => this.refreshVoices();
      this.voicesHandler = handler;
      window.speechSynthesis.addEventListener('voiceschanged', handler);
    }
    this.destroyRef.onDestroy(() => this.dispose());
  }

  /** Warm up the engine and load voices (cheap to repeat). */
  ensureVoices(): void {
    if (!this.speechSupported()) {
      this.engineChecked.set(true);
      return;
    }
    const synth = window.speechSynthesis;
    if (synth.getVoices().length === 0) {
      try {
        const probe = new SpeechSynthesisUtterance('.');
        probe.volume = 0;
        synth.speak(probe);
      } catch {
        // ignore — engineChecked still flips on voiceschanged/timeout
      }
      setTimeout(() => this.refreshVoices(), 600);
      return;
    }
    this.refreshVoices();
  }

  setSelectedVoiceName(name: string | null): void {
    this.selectedVoiceName.set(name);
    try {
      if (typeof localStorage !== 'undefined') {
        if (name) localStorage.setItem(STORAGE_KEY, name);
        else localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }

  resolveVoice(match?: BrowserVoiceMatch): SpeechSynthesisVoice | null {
    return resolveBrowserVoice(
      this.browserVoices(),
      match,
      this.selectedVoiceName(),
    );
  }

  private refreshVoices(): void {
    if (!this.speechSupported()) {
      this.engineChecked.set(true);
      return;
    }
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      this.browserVoices.set([...voices]);
      const current = this.selectedVoiceName();
      if (!current || !voices.some((v) => v.name === current)) {
        const def =
          voices.find((v) => v.default) ||
          voices.find((v) => v.lang.startsWith('en'));
        this.setSelectedVoiceName(def?.name ?? voices[0]?.name ?? null);
      }
    }
    this.engineChecked.set(true);
  }

  private loadStored(): string | null {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
    return null;
  }

  private dispose(): void {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
    if (this.voicesHandler && this.speechSupported()) {
      window.speechSynthesis.removeEventListener(
        'voiceschanged',
        this.voicesHandler,
      );
      this.voicesHandler = null;
    }
  }
}
