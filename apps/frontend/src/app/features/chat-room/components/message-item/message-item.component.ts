import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-message-item',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="chat"
      [class.chat-end]="message().role === 'user'"
      [class.chat-start]="message().role === 'ai'"
    >
      <div
        class="max-w-[80%] rounded-2xl px-4 py-3 mb-3 shadow-sm transition-all hover:shadow-md"
        [class.chat-bubble-primary]="message().role === 'user'"
        [class.bg-base-200]="message().role === 'ai'"
        [class.text-base-content]="message().role === 'ai'"
      >
        <div
          class="prose max-w-none"
          [innerHTML]="formatMessage(message().text)"
        ></div>

        @if (message().role === 'ai') {
        <button
          (click)="handlePlayStop()"
          class="btn btn-ghost btn-sm mt-2 inline-flex items-center gap-2 group"
        >
          @if (isPlaying()) {
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-4 h-4 group-hover:text-error"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z"
            />
          </svg>
          <span>Stop</span>
          } @else {
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-4 h-4 group-hover:text-secondary"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.757 3.63 8.25 4.51 8.25H6.75Z"
            />
          </svg>
          <span>Play</span>
          }
        </button>
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
        font-size: 0.95rem;
        line-height: 1.6;
      }

      .prose strong {
        font-weight: 600;
        color: inherit;
      }

      .prose code {
        background: rgba(0, 0, 0, 0.2);
        padding: 0.2em 0.4em;
        border-radius: 0.25rem;
        font-size: 0.9em;
      }

      .prose p {
        margin: 0.5em 0;
      }

      .prose p:first-child {
        margin-top: 0;
      }

      .prose p:last-child {
        margin-bottom: 0;
      }
    `,
  ],
})
export class MessageItemComponent {
  message = input.required<{ role: 'user' | 'ai'; text: string }>();
  isPlaying = input(false);

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
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }
}
