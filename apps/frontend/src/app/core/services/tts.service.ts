import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TtsService {
  
  isPlaying = signal(false);
  currentAudioTime = signal(0);
  totalAudioDuration = signal(0);
  
  private currentUtterance: SpeechSynthesisUtterance | null = null;

    private cleanMarkdown(text: string): string {
    return text
      
      .replace(/\*\*(.+?)\*\*/g, '$1')  
      .replace(/\*(.+?)\*/g, '$1')      
      .replace(/__(.+?)__/g, '$1')      
      .replace(/_(.+?)_/g, '$1')        
      
      .replace(/```[\s\S]*?```/g, '')   // ```code```
      .replace(/`(.+?)`/g, '$1')        
      
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') 
      
      .replace(/^#{1,6}\s+/gm, '')      // # Header
      // Remove list markers
      .replace(/^[\*\-\+]\s+/gm, '')    // * item
      .replace(/^\d+\.\s+/gm, '')       // 1. item
      // Clean up extra spaces
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Speak text using Web Speech API
   */
  speak(
    text: string, 
    options?: {
      voice?: SpeechSynthesisVoice;
      lang?: string;
      onEnd?: () => void;
      onError?: (error: any) => void;
    }
  ): void {
    if (this.isPlaying()) return;
    
    window.speechSynthesis.cancel();

    const cleanText = this.cleanMarkdown(text);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    this.currentUtterance = utterance;
    
    if (options?.voice) {
      utterance.voice = options.voice;
    }

    if (options?.lang) {
      utterance.lang = options.lang;
    }

    const wordCount = cleanText.split(' ').length;
    const estimatedDuration = (wordCount / 150) * 60;
    this.totalAudioDuration.set(estimatedDuration);
    this.currentAudioTime.set(0);

    this.isPlaying.set(true);

    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      if (!this.isPlaying()) {
        clearInterval(progressInterval);
        return;
      }
      const elapsed = (Date.now() - startTime) / 1000;
      this.currentAudioTime.set(Math.min(elapsed, estimatedDuration));
    }, 100);

    utterance.onend = () => {
      clearInterval(progressInterval);
      this.isPlaying.set(false);
      this.currentAudioTime.set(0);
      this.currentUtterance = null;
      
      options?.onEnd?.();
    };

    utterance.onerror = (e) => {
      console.error('TTS Error:', e);
      clearInterval(progressInterval);
      this.isPlaying.set(false);
      this.currentAudioTime.set(0);
      this.currentUtterance = null;
      
      options?.onError?.(e);
    };

    window.speechSynthesis.speak(utterance);
  }

    stop(): void {
    window.speechSynthesis.cancel();
    this.isPlaying.set(false);
    this.currentAudioTime.set(0);
    this.currentUtterance = null;
  }

    pause(): void {
    if (this.isPlaying()) {
      window.speechSynthesis.pause();
    }
  }

    resume(): void {
    if (this.isPlaying()) {
      window.speechSynthesis.resume();
    }
  }
}
