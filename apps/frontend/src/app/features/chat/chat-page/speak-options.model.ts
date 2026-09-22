/** Options passed to send orchestration: speak callback + live-mode probe. */
export interface SpeakOptions {
  speak: (text: string) => void;
  isLiveMode: () => boolean;
}
