import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideKey,
  LucideRotateCw,
  LucideEye,
  LucideEyeOff,
  LucideCpu,
  LucideExternalLink,
} from '@lucide/angular';
import {
  AiConfigService,
  AiModel,
  KNOWN_PROVIDERS,
  ProviderInfo,
} from '@core/services/ai-config.service';
import { ApiKeyService } from '@core/services/api-key.service';
import { I18nService } from '@core/services/i18n.service';

@Component({
  selector: 'app-settings-tab-ai',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    LucideKey,
    LucideRotateCw,
    LucideEye,
    LucideEyeOff,
    LucideCpu,
    LucideExternalLink,
  ],
  template: `
    <div class="space-y-6">
      <!-- 1. Provider Selection -->
      <div class="space-y-2">
        <p class="text-xs font-medium uppercase tracking-wider text-base-content/50">
          {{ t('ai.provider') }}
        </p>
        <div class="space-y-1">
          @for (p of providers; track p.id) {
            <button
              type="button"
              class="flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors"
              [class.border-primary]="aiConfig.provider() === p.id"
              [class.bg-primary/5]="aiConfig.provider() === p.id"
              [class.text-primary]="aiConfig.provider() === p.id"
              [class.border-base-300]="aiConfig.provider() !== p.id"
              [class.text-base-content]="aiConfig.provider() !== p.id"
              (click)="onProviderSelect(p.id)"
            >
              <span class="text-sm font-medium">{{ p.label }}</span>
              <div class="flex items-center gap-2">
                @if (p.quotaBadge) {
                  <span class="badge badge-ghost badge-xs">{{ p.quotaBadge }}</span>
                }
                @if (aiConfig.provider() === p.id) {
                  <span class="badge badge-xs badge-primary">Active</span>
                }
              </div>
            </button>
          }
        </div>
      </div>

      <!-- 2. API Key for Selected Provider -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <p class="text-xs font-medium uppercase tracking-wider text-base-content/50">
            API Key ({{ selectedProviderInfo()?.label || aiConfig.provider() }})
          </p>
          <span class="text-xs text-base-content/40">{{ t('ai.custom_keys.optional') }}</span>
        </div>

        <!-- Key mode status -->
        <div class="flex items-center justify-between rounded-lg border border-base-300 bg-base-100/40 px-3 py-2">
          <div class="flex items-center gap-2">
            <svg lucideKey class="h-3.5 w-3.5 text-base-content/40"></svg>
            @if (currentKeyValue()) {
              <span class="text-xs text-base-content/70">Custom key active</span>
              <span class="badge badge-xs badge-success">Custom</span>
            } @else {
              <span class="text-xs text-base-content/70">Using server key</span>
              <span class="badge badge-xs badge-neutral">Server default</span>
            }
          </div>
          @if (selectedProviderInfo()?.consoleUrl) {
            <a
              [href]="selectedProviderInfo()?.consoleUrl"
              target="_blank"
              rel="noopener"
              class="flex link items-center gap-1 text-xs link-primary"
            >
              <span>Get key</span>
              <svg lucideExternalLink class="h-3 w-3"></svg>
            </a>
          }
        </div>

        <div class="join w-full">
          <input
            [type]="showKey() ? 'text' : 'password'"
            class="input-bordered input join-item flex-1 font-mono text-xs input-sm"
            [placeholder]="
              'Enter ' +
              (selectedProviderInfo()?.label || 'provider') +
              ' API key (leave empty for server key)'
            "
            [ngModel]="currentKeyValue()"
            (ngModelChange)="onKeyChange($event)"
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
              title="Remove custom key and fall back to server key"
            >
              Reset to server key
            </button>
          }
        </div>
      </div>

      <!-- 3. Available Models -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <p class="text-xs font-medium uppercase tracking-wider text-base-content/50">
            Available Models
          </p>
          <button
            type="button"
            class="btn gap-1 btn-ghost btn-xs"
            (click)="refreshModels()"
            title="Sync live models from provider"
          >
            <svg
              lucideRotateCw
              class="h-3.5 w-3.5"
              [class.animate-spin]="isModelsLoading()"
            ></svg>
            <span class="text-xs">Sync</span>
          </button>
        </div>

        <div class="space-y-1">
          @if (isModelsLoading() && filteredModels().length === 0) {
            <div class="py-6 text-center text-xs text-base-content/60">
              <span
                class="loading mb-2 loading-sm loading-spinner text-primary"
              ></span>
              <p>Fetching models from provider...</p>
            </div>
          } @else {
            @for (model of filteredModels(); track model.id) {
              <div
                class="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors"
                [class.border-primary]="aiConfig.selectedModelId() === model.id"
                [class.bg-primary/5]="aiConfig.selectedModelId() === model.id"
                [class.border-base-300]="aiConfig.selectedModelId() !== model.id"
                (click)="aiConfig.selectedModelId.set(model.id)"
                (keyup.enter)="aiConfig.selectedModelId.set(model.id)"
                tabindex="0"
                role="button"
              >
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <p class="text-sm font-medium">{{ model.name }}</p>
                    @if (model.isDefault) {
                      <span class="badge badge-ghost badge-xs">Default</span>
                    }
                    @if (aiConfig.selectedModelId() === model.id) {
                      <span class="badge badge-xs badge-primary">Selected</span>
                    }
                  </div>
                  <p class="truncate text-xs text-base-content/50">
                    {{ model.id }}
                    @if (model.description) { · {{ model.description }} }
                  </p>
                </div>
                @if (model.size) {
                  <div class="badge badge-ghost badge-sm shrink-0">{{ model.size }}</div>
                }
              </div>
            }
          }
        </div>
      </div>
    </div>
  `,
})
export class SettingsTabAiComponent {
  readonly aiConfig = inject(AiConfigService);
  readonly apiKeyService = inject(ApiKeyService);
  readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  readonly providers = KNOWN_PROVIDERS;
  readonly showKey = signal<boolean>(false);

  readonly selectedProviderInfo = computed<ProviderInfo | undefined>(() =>
    this.providers.find((p) => p.id === this.aiConfig.provider()),
  );

  readonly currentKeyValue = computed<string>(() =>
    this.apiKeyService.getKey(this.aiConfig.provider()),
  );

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  readonly filteredModels = computed<AiModel[]>(() =>
    this.aiConfig.getModelsForProvider(this.aiConfig.provider()),
  );
  readonly isModelsLoading = computed<boolean>(() => this.aiConfig.loading());

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
    });
  }

  t(key: string): string {
    return this.i18n.t()(key);
  }

  async refreshModels(): Promise<void> {
    await this.aiConfig.fetchModels();
  }

  onProviderSelect(providerId: string): void {
    this.aiConfig.provider.set(providerId);
    const models = this.aiConfig.getModelsForProvider(providerId);
    if (
      models.length > 0 &&
      !models.some((m) => m.id === this.aiConfig.selectedModelId())
    ) {
      this.aiConfig.selectedModelId.set(models[0].id);
    }
    void this.aiConfig.fetchModels(providerId);
  }

  onKeyChange(value: string): void {
    const provider = this.aiConfig.provider();
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.apiKeyService.setKey(provider, value);
      void this.aiConfig.fetchModels(provider);
    }, 500);
  }

  onClearKey(): void {
    const provider = this.aiConfig.provider();
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.apiKeyService.clearKey(provider);
    void this.aiConfig.fetchModels(provider);
  }
}
