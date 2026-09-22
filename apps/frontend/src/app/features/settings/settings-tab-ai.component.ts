import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { LucideRotateCw, LucideEye, LucideEyeOff } from '@lucide/angular';
import { AiConfigService } from '@features/settings/services/ai-config.service';
import { KNOWN_PROVIDERS } from '@features/settings/services/ai-providers.util';
import { ApiKeyService } from '@features/settings/services/api-key.service';
import { I18nService } from '@features/settings/services/i18n.service';
import {
  AppSelectComponent,
  SelectOption,
} from '@core/components/ui/select/select.component';
import { AiModelGridComponent } from './ai-model-grid.component';
import { AiLiveTestComponent } from './ai-live-test.component';
import { toProviderOptions, getInputValue } from './settings-tab-ai.util';

@Component({
  selector: 'app-settings-tab-ai',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LucideRotateCw,
    LucideEye,
    LucideEyeOff,
    AppSelectComponent,
    AiModelGridComponent,
    AiLiveTestComponent,
  ],
  template: `
    <div class="space-y-5">
      <app-select
        selectId="settings-ai-provider"
        [label]="t('ai.provider')"
        [options]="providerOptions"
        [(value)]="aiConfig.provider"
        size="sm"
        color="primary"
      />
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <p class="text-xs font-medium uppercase opacity-50">
            API Key ({{ selectedProviderInfo()?.label || 'Server' }})
          </p>
          @if (currentKeyValue()) {
            <span class="badge badge-xs badge-success">Custom</span>
          } @else if (aiConfig.provider() === 'default') {
            <span class="badge badge-xs badge-success">Server</span>
          } @else {
            <span class="badge badge-xs badge-warning">Required</span>
          }
        </div>
        @if (aiConfig.provider() !== 'default') {
          <div class="join w-full">
            <input
              [type]="showKey() ? 'text' : 'password'"
              class="input-bordered input join-item flex-1 font-mono text-xs input-sm"
              placeholder="Enter API key for live models…"
              [value]="currentKeyValue()"
              (input)="onKeyInput($event)"
            />
            <button
              type="button"
              class="btn join-item btn-ghost btn-sm"
              (click)="showKey.set(!showKey())"
              aria-label="Toggle key visibility"
            >
              @if (showKey()) {
                <svg lucideEyeOff class="h-4 w-4"></svg>
              } @else {
                <svg lucideEye class="h-4 w-4"></svg>
              }
            </button>
            @if (currentKeyValue()) {
              <button
                type="button"
                class="btn join-item btn-ghost text-error btn-sm"
                (click)="onClearKey()"
              >
                Reset
              </button>
            }
          </div>
        }
      </div>
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <p class="text-xs font-medium uppercase opacity-50">
            Live Models ({{ filteredModels().length }})
          </p>
          <button
            type="button"
            class="btn gap-1 btn-ghost btn-xs"
            (click)="refreshModels()"
          >
            <svg
              lucideRotateCw
              class="h-3.5 w-3.5"
              [class.animate-spin]="aiConfig.loading()"
            ></svg>
            Sync
          </button>
        </div>
        <app-ai-model-grid
          [models]="filteredModels()"
          [selectedId]="aiConfig.selectedModelId()"
          [emptyMessage]="
            aiConfig.liveError() || 'No live models. Check key / server.'
          "
          (selected)="aiConfig.selectedModelId.set($event)"
        />
      </div>
      <app-ai-live-test [modelId]="aiConfig.selectedModelId()" />
    </div>
  `,
})
export class SettingsTabAiComponent {
  readonly aiConfig = inject(AiConfigService);
  readonly apiKeyService = inject(ApiKeyService);
  readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);
  readonly showKey = signal<boolean>(false);
  readonly providerOptions: SelectOption[] = toProviderOptions(KNOWN_PROVIDERS);
  readonly selectedProviderInfo = computed(() =>
    KNOWN_PROVIDERS.find((p) => p.id === this.aiConfig.provider()),
  );
  readonly currentKeyValue = computed(() =>
    this.apiKeyService.getKey(this.aiConfig.provider()),
  );
  readonly filteredModels = computed(() =>
    this.aiConfig.getModelsForProvider(this.aiConfig.provider()),
  );
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
    });
  }

  t(key: string): string {
    return this.i18n.t()(key);
  }

  async refreshModels(): Promise<void> {
    this.aiConfig.fetchFailed.set(false);
    await this.aiConfig.fetchModels(this.aiConfig.provider(), true);
  }

  onKeyInput(event: Event): void {
    const value = getInputValue(event);
    const provider = this.aiConfig.provider();
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.apiKeyService.setKey(provider, value);
      this.aiConfig.fetchFailed.set(false);
      void this.aiConfig.fetchModels(provider, true);
    }, 500);
  }

  onClearKey(): void {
    const provider = this.aiConfig.provider();
    this.apiKeyService.clearKey(provider);
    this.aiConfig.fetchFailed.set(false);
    void this.aiConfig.fetchModels(provider, true);
  }
}
