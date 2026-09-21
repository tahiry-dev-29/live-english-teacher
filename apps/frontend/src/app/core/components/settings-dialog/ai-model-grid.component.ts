import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';
import type { AiModel } from '@core/services/ai-config.service';

@Component({
  selector: 'app-ai-model-grid',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    @if (models().length === 0) {
      <p
        class="rounded-lg border border-dashed p-4 text-center text-xs opacity-60"
      >
        {{ emptyMessage() }}
      </p>
    } @else {
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
        @for (model of models(); track model.id) {
          <button
            type="button"
            class="rounded-xl border p-3 text-left transition-all"
            [class.border-primary]="selectedId() === model.id"
            [class.border-base-300]="selectedId() !== model.id"
            (click)="selected.emit(model.id)"
          >
            <p class="text-sm font-semibold">{{ model.name }}</p>
            <p class="line-clamp-2 text-xs opacity-60">
              {{ model.description || model.id }}
            </p>
            <p class="mt-1 truncate font-mono text-[11px] opacity-50">
              {{ model.id }}
            </p>
          </button>
        }
      </div>
    }
  `,
})
export class AiModelGridComponent {
  readonly models = input<AiModel[]>([]);
  readonly selectedId = input<string | null>('');
  readonly emptyMessage = input<string>('No live models.');
  readonly selected = output<string>();
}
