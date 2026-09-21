import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  input,
} from '@angular/core';
import { LucidePlay } from '@lucide/angular';
import { ChatStreamService } from '@core/services/chat-stream.service';
import { AI_TEST_MESSAGE } from './settings-tab-ai.util';

@Component({
  selector: 'app-ai-live-test',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucidePlay],
  template: `
    <div class="space-y-2 border-t border-base-300 pt-4">
      <div class="flex items-center justify-between">
        <p class="text-xs font-medium uppercase opacity-50">Test live model</p>
        <button
          type="button"
          class="btn gap-1 btn-primary btn-xs"
          (click)="test()"
          [disabled]="testing() || !modelId()"
        >
          <svg lucidePlay class="h-3 w-3"></svg>
          {{ testing() ? 'Testing…' : 'Tester' }}
        </button>
      </div>
      @if (result()) {
        <p class="rounded-lg bg-base-100 p-3 text-xs">{{ result() }}</p>
      }
      @if (error()) {
        <p class="rounded-lg bg-error/10 p-3 text-xs text-error">
          {{ error() }}
        </p>
      }
    </div>
  `,
})
export class AiLiveTestComponent {
  readonly modelId = input<string>('');
  private readonly chatStream = inject(ChatStreamService);
  readonly testing = signal<boolean>(false);
  readonly result = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  async test(): Promise<void> {
    this.testing.set(true);
    this.result.set(null);
    this.error.set(null);
    try {
      let acc = '';
      const res = await this.chatStream.streamChat(
        { message: AI_TEST_MESSAGE, sessionId: null, targetLanguage: 'en' },
        (tok: string) => {
          acc += tok;
        },
      );
      if (res.error) this.error.set(res.error.message);
      else this.result.set(acc || res.text || 'OK (empty reply)');
    } catch {
      this.error.set('Live test failed. Check model / key.');
    } finally {
      this.testing.set(false);
    }
  }
}
