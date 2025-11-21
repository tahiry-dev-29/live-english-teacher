import { Injectable, signal } from '@angular/core';

export interface VadEvent {
  type: 'speechStart' | 'speechEnd' | 'silence';
  timestamp: number;
  volume?: number;
}

@Injectable({
  providedIn: 'root'
})
export class VadService {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private animationFrameId: number | null = null;
  
  // VAD parameters
  private readonly SPEECH_THRESHOLD = 30; // Volume threshold (0-255)
  private readonly SPEECH_START_DELAY = 300; // ms before considering it speech
  private readonly SPEECH_END_DELAY = 1000; // ms of silence before considering speech ended
  
  // State
  private isSpeaking = signal(false);
  private speechStartTime: number | null = null;
  private lastSpeechTime: number | null = null;
  private stream: MediaStream | null = null;
  
  // Callbacks
  private onSpeechStart?: () => void;
  private onSpeechEnd?: () => void;
  private onSilence?: () => void;

  async start(callbacks: {
    onSpeechStart?: () => void;
    onSpeechEnd?: () => void;
    onSilence?: () => void;
  }): Promise<void> {
    this.onSpeechStart = callbacks.onSpeechStart;
    this.onSpeechEnd = callbacks.onSpeechEnd;
    this.onSilence = callbacks.onSilence;

    try {
      // Get microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      // Setup Web Audio API
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;

      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.microphone.connect(this.analyser);

      // Create data array for analysis with explicit ArrayBuffer to avoid type issues
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(new ArrayBuffer(bufferLength));

      // Start monitoring
      this.monitor();
      
      console.log('VAD started successfully');
    } catch (error) {
      console.error('Error starting VAD:', error);
      throw error;
    }
  }

  stop(): void {
    // Stop monitoring
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Close audio context
    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Stop media stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // Reset state
    this.isSpeaking.set(false);
    this.speechStartTime = null;
    this.lastSpeechTime = null;
    
    console.log('VAD stopped');
  }

  private monitor(): void {
    if (!this.analyser || !this.dataArray) return;

    // Get current audio data
    this.analyser.getByteTimeDomainData(this.dataArray);

    // Calculate RMS (Root Mean Square) volume
    const volume = this.calculateRMS(this.dataArray);
    const now = Date.now();

    // Check if volume exceeds threshold
    if (volume > this.SPEECH_THRESHOLD) {
      // Potential speech detected
      if (!this.isSpeaking()) {
        // Not currently speaking, check if sustained
        if (!this.speechStartTime) {
          this.speechStartTime = now;
        } else if (now - this.speechStartTime > this.SPEECH_START_DELAY) {
          // Speech confirmed
          this.isSpeaking.set(true);
          this.onSpeechStart?.();
          console.log('Speech started', { volume });
        }
      }
      
      // Update last speech time
      this.lastSpeechTime = now;
    } else {
      // Volume below threshold
      if (this.isSpeaking()) {
        // Currently speaking, check for silence
        if (this.lastSpeechTime && now - this.lastSpeechTime > this.SPEECH_END_DELAY) {
          // Speech ended
          this.isSpeaking.set(false);
          this.speechStartTime = null;
          this.onSpeechEnd?.();
          console.log('Speech ended');
        }
      } else {
        // Not speaking, reset speech start time
        this.speechStartTime = null;
      }
    }

    // Continue monitoring
    this.animationFrameId = requestAnimationFrame(() => this.monitor());
  }

  private calculateRMS(dataArray: Uint8Array): number {
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = (dataArray[i] - 128) / 128; // Normalize to -1 to 1
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / dataArray.length);
    return rms * 255; // Scale back to 0-255
  }

  getCurrentVolume(): number {
    if (!this.analyser || !this.dataArray) return 0;
    this.analyser.getByteTimeDomainData(this.dataArray);
    return this.calculateRMS(this.dataArray);
  }

  isCurrentlySpeaking(): boolean {
    return this.isSpeaking();
  }
}
