import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TtsService {
  // State
  isPlaying = signal(false);
  currentAudioTime = signal(0);
  totalAudioDuration = signal(0);
  
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  /**
   * Clean Markdown formatting for TTS
   */
  private cleanMarkdown(text: string): string {
    return text
      // Remove bold/italic markers
      .replace(/\*\*(.+?)\*\*/g, '$1')  // **bold**
      .replace(/\*(.+?)\*/g, '$1')      // *italic*
      .replace(/__(.+?)__/g, '$1')      // __bold__
      .replace(/_(.+?)_/g, '$1')        // _italic_
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')   // ```code```
      .replace(/`(.+?)`/g, '$1')        // `code`
      // Remove links
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // [text](url)
      // Remove headers
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
    
    // Cancel any current speech
    window.speechSynthesis.cancel();

    // Clean Markdown before speaking
    const cleanText = this.cleanMarkdown(text);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    this.currentUtterance = utterance;
    
    // Set voice if provided
    if (options?.voice) {
      utterance.voice = options.voice;
    }

    // Set language if provided
    if (options?.lang) {
      utterance.lang = options.lang;
    }

    // Estimate duration (rough approximation: ~150 words per minute)
    const wordCount = cleanText.split(' ').length;
    const estimatedDuration = (wordCount / 150) * 60;
    this.totalAudioDuration.set(estimatedDuration);
    this.currentAudioTime.set(0);

    this.isPlaying.set(true);

    // Track progress
    let startTime = Date.now();
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

  /**
   * Stop current speech
   */
  stop(): void {
    window.speechSynthesis.cancel();
    this.isPlaying.set(false);
    this.currentAudioTime.set(0);
    this.currentUtterance = null;
  }

  /**
   * Pause current speech
   */
  pause(): void {
    if (this.isPlaying()) {
      window.speechSynthesis.pause();
    }
  }

  /**
   * Resume paused speech
   */
  resume(): void {
    if (this.isPlaying()) {
      window.speechSynthesis.resume();
    }
  }
}
