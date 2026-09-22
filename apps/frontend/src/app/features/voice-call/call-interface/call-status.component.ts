import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Call status headline + live transcript (T93 split from call-interface). */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-call-status',
  standalone: true,
  template: `
    <div class="mb-8 text-center transition-all duration-500">
      <h2
        class="text-3xl font-light tracking-tight text-base-content/90 md:text-4xl"
      >
        @if (callState() === 'speaking') {
          Speaking...
        } @else if (callState() === 'processing') {
          Thinking...
        } @else if (callState() === 'listening') {
          Listening...
        } @else {
          Ready
        }
      </h2>
      @if (transcript() && callState() === 'listening') {
        <p class="mt-4 animate-pulse text-lg text-primary italic">
          "{{ transcript() }}"
        </p>
      }
    </div>
  `,
})
export class CallStatusComponent {
  readonly callState = input<string>('idle');
  readonly transcript = input<string>('');
}
