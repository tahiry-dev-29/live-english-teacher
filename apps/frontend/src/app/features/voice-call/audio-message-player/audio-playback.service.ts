import { Injectable } from '@angular/core';
import { base64ToBlob } from '@core/utils/text.util';

export interface AudioPlaybackHandlers {
  onDuration(duration: number): void;
  onEnded(): void;
  onError(error: unknown): void;
}

/** HTMLAudioElement lifecycle for one chat audio bubble (T93 split). */
@Injectable()
export class AudioPlaybackService {
  private audio: HTMLAudioElement | null = null;
  private audioUrl: string | null = null;

  load(
    base64Data: string,
    mimeType: string,
    handlers: AudioPlaybackHandlers,
  ): void {
    this.dispose();
    const blob = base64ToBlob(base64Data, mimeType);
    this.audioUrl = URL.createObjectURL(blob);
    this.audio = new Audio(this.audioUrl);
    const element = this.audio;
    element.onloadedmetadata = () => handlers.onDuration(element.duration);
    element.onended = () => handlers.onEnded();
    element.onerror = (error) => handlers.onError(error);
  }

  async play(): Promise<void> {
    await this.audio?.play();
  }

  pause(): void {
    this.audio?.pause();
  }

  seekTo(time: number): void {
    if (this.audio) this.audio.currentTime = time;
  }

  getCurrentTime(): number {
    return this.audio?.currentTime ?? 0;
  }

  dispose(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.onloadedmetadata = null;
      this.audio.onended = null;
      this.audio.onerror = null;
      this.audio = null;
    }
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
      this.audioUrl = null;
    }
  }
}
