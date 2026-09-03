import { Injectable } from '@angular/core';

interface RecordingResult {
  base64: string;
  mimeType: string;
}

@Injectable({ providedIn: 'root' })
export class AudioRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  async startRecording(): Promise<void> {
    if (this.mediaRecorder) {
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.chunks = [];
    this.mediaRecorder = new MediaRecorder(stream);
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };
    this.mediaRecorder.start();
  }

  async stopRecording(): Promise<RecordingResult> {
    if (!this.mediaRecorder) {
      throw new Error('No active recording');
    }
    const recorder = this.mediaRecorder;
    const mimeType = recorder.mimeType || 'audio/webm';

    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

    recorder.stop();
    await stopped;

    const blob = new Blob(this.chunks, { type: mimeType });
    const base64 = await this.blobToBase64(blob);

    recorder.stream.getTracks().forEach((track) => track.stop());
    this.mediaRecorder = null;
    this.chunks = [];

    return { base64, mimeType };
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const commaIdx = result.indexOf(',');
        resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }
}
