import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideSquare, LucideMic } from '@lucide/angular';

@Component({
  selector: 'app-message-item',
  standalone: true,
  imports: [CommonModule, LucideSquare, LucideMic],
  template: `
    <div
      class="chat"
      [class.chat-end]="message().role === 'user'"
      [class.chat-start]="message().role === 'ai'"
    >
      <div
        class="chat-bubble max-w-[80%]"
        [class.chat-bubble-primary]="message().role === 'user'"
        [class.chat-bubble-neutral]="message().role === 'ai'"
      >
        <div
          class="prose prose-sm max-w-none"
          [innerHTML]="formatMessage(message().text)"
        ></div>

        @if (message().role === 'ai') {
        <div class="mt-2 flex items-center gap-1">
          <button
            (click)="handlePlayStop()"
            class="btn btn-ghost btn-xs gap-1"
            [class.text-primary]="!isPlaying()"
            [class.text-error]="isPlaying()"
          >
            @if (isPlaying()) {
            <svg lucideSquare class="w-3 h-3"></svg>
            <span>Stop</span>
            } @else {
            <svg lucideMic class="w-3 h-3"></svg>
            <span>Listen</span>
            }
          </button>
        </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .prose {
        color: inherit;
      }

      .prose p {
        margin: 0;
      }
    `,
  ],
})
export class MessageItemComponent {
  message = input.required<{ role: 'user' | 'ai'; text: string }>();
  isPlaying = input<boolean>(false);

  playRequested = output<void>();
  stop = output<void>();

  handlePlayStop() {
    if (this.isPlaying()) {
      this.stop.emit();
    } else {
      this.playRequested.emit();
    }
  }

  formatMessage(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-base-300 px-1 rounded">$1</code>')
      .replace(/\n/g, '<br>');
  }
}
