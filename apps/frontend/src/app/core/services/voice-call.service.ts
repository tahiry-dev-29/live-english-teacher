import { Injectable, inject, signal } from '@angular/core';
import { VadService } from './vad.service';

export enum CallState {
  IDLE = 'idle',
  LISTENING = 'listening',
  PROCESSING = 'processing',
  SPEAKING = 'speaking'
}

@Injectable({
  providedIn: 'root'
})
export class VoiceCallService {
  private vadService = inject(VadService);
  
  // State
  callState = signal<CallState>(CallState.IDLE);
  currentTranscript = signal<string>('');
  
  // Speech Recognition
  private recognition: any = null; // SpeechRecognition
  private inactivityTimer: any = null;
  private readonly INACTIVITY_TIMEOUT = 10000; // 10 seconds
  
  // Callbacks
  private onTranscriptReady?: (text: string) => void;
  private onInactivity?: () => void;
  private onStateChange?: (state: CallState) => void;
  private language = 'fr-FR'; // Default to French

  async startCall(callbacks: {
    onTranscriptReady?: (text: string) => void;
    onInactivity?: () => void;
    onStateChange?: (state: CallState) => void;
    language?: string; // Add language parameter
  }): Promise<void> {
    this.onTranscriptReady = callbacks.onTranscriptReady;
    this.onInactivity = callbacks.onInactivity;
    this.onStateChange = callbacks.onStateChange;
    this.language = callbacks.language || 'fr-FR'; // Use provided language or default to French

    try {
      // Start VAD
      await this.vadService.start({
        onSpeechStart: () => this.handleSpeechStart(),
        onSpeechEnd: () => this.handleSpeechEnd(),
      });

      // Setup Speech Recognition
      this.setupSpeechRecognition();

      // Enter listening state
      this.setState(CallState.LISTENING);
      this.startInactivityTimer();
      
      console.log('Voice call started');
    } catch (error) {
      console.error('Error starting voice call:', error);
      throw error;
    }
  }

  stopCall(): void {
    // Stop VAD
    this.vadService.stop();

    // Stop speech recognition
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }

    // Clear timers
    this.clearInactivityTimer();

    // Reset state
    this.setState(CallState.IDLE);
    this.currentTranscript.set('');
    
    console.log('Voice call stopped');
  }

  // Called when AI starts speaking
  startSpeaking(): void {
    this.setState(CallState.SPEAKING);
    this.clearInactivityTimer();
    
    // Stop listening while AI is speaking
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  // Called when AI finishes speaking
  finishSpeaking(): void {
    // Return to listening state
    this.setState(CallState.LISTENING);
    this.startInactivityTimer();
    
    // Restart recognition
    if (this.recognition) {
      this.recognition.start();
    }
  }

  private setupSpeechRecognition(): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('Speech Recognition not supported');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.language; // Use configured language

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Update current transcript
      this.currentTranscript.set(interimTranscript || finalTranscript);

      // If final transcript, process it
      if (finalTranscript) {
        this.processTranscript(finalTranscript);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      
      // Restart if it's a network error
      if (event.error === 'network') {
        setTimeout(() => {
          if (this.callState() === CallState.LISTENING) {
            this.recognition?.start();
          }
        }, 1000);
      }
    };

    this.recognition.onend = () => {
      // Restart if we're still in listening state
      if (this.callState() === CallState.LISTENING) {
        setTimeout(() => {
          this.recognition?.start();
        }, 100);
      }
    };

    // Start recognition
    this.recognition.start();
  }

  private handleSpeechStart(): void {
    console.log('VAD: Speech detected');
    // Reset inactivity timer
    this.clearInactivityTimer();
    this.startInactivityTimer();
  }

  private handleSpeechEnd(): void {
    console.log('VAD: Speech ended');
    // Speech ended, transcript should be processed by recognition.onresult
  }

  private processTranscript(transcript: string): void {
    if (!transcript.trim()) return;

    console.log('Processing transcript:', transcript);
    
    // Enter processing state
    this.setState(CallState.PROCESSING);
    this.clearInactivityTimer();

    // Stop recognition while processing
    if (this.recognition) {
      this.recognition.stop();
    }

    // Notify callback
    this.onTranscriptReady?.(transcript);
  }

  private startInactivityTimer(): void {
    this.clearInactivityTimer();
    
    this.inactivityTimer = setTimeout(() => {
      console.log('Inactivity timeout');
      this.onInactivity?.();
    }, this.INACTIVITY_TIMEOUT);
  }

  private clearInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  private setState(state: CallState): void {
    this.callState.set(state);
    this.onStateChange?.(state);
    console.log('Call state changed:', state);
  }

  getCurrentState(): CallState {
    return this.callState();
  }
}
