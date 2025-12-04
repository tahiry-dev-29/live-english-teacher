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
  private language = 'fr-FR'; 

  async startCall(callbacks: {
    onTranscriptReady?: (text: string) => void;
    onInactivity?: () => void;
    onStateChange?: (state: CallState) => void;
    language?: string;
  }): Promise<void> {
    this.onTranscriptReady = callbacks.onTranscriptReady;
    this.onInactivity = callbacks.onInactivity;
    this.onStateChange = callbacks.onStateChange;
    this.language = callbacks.language || 'fr-FR';

    try {
      
      await this.vadService.start({
        onSpeechStart: () => this.handleSpeechStart(),
        onSpeechEnd: () => this.handleSpeechEnd(),
      });

      
      this.setupSpeechRecognition();

      
      this.setState(CallState.LISTENING);
      this.startInactivityTimer();
      
      console.log('Voice call started');
    } catch (error) {
      console.error('Error starting voice call:', error);
      throw error;
    }
  }

  stopCall(): void {
    
    this.vadService.stop();

    
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }

    
    this.clearInactivityTimer();

    
    this.setState(CallState.IDLE);
    this.currentTranscript.set('');
    
    console.log('Voice call stopped');
  }

  
  startSpeaking(): void {
    this.setState(CallState.SPEAKING);
    this.clearInactivityTimer();
    
    
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  
  finishSpeaking(): void {
    
    this.setState(CallState.LISTENING);
    this.startInactivityTimer();
    
    
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
    this.recognition.lang = this.language; 

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
      if (event.error === 'network') {
        setTimeout(() => {
          if (this.callState() === CallState.LISTENING) {
            this.recognition?.start();
          }
        }, 1000);
      }
    };

    this.recognition.onend = () => {
      
      if (this.callState() === CallState.LISTENING) {
        setTimeout(() => {
          this.recognition?.start();
        }, 100);
      }
    };

    
    this.recognition.start();
  }

  private handleSpeechStart(): void {
    console.log('VAD: Speech detected');
    
    this.clearInactivityTimer();
    this.startInactivityTimer();
  }

  private handleSpeechEnd(): void {
    console.log('VAD: Speech ended');
    
  }

  private processTranscript(transcript: string): void {
    if (!transcript.trim()) return;

    console.log('Processing transcript:', transcript);
    
    
    this.setState(CallState.PROCESSING);
    this.clearInactivityTimer();

    
    if (this.recognition) {
      this.recognition.stop();
    }

    
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
