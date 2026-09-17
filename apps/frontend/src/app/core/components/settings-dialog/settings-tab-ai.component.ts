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
      <fieldset class="fieldset">
        <legend
          class="fieldset-legend flex w-full items-center justify-between text-sm font-semibold"
        >
          <span>{{ t('ai.provider') }}</span>
          <span class="badge badge-outline text-xs badge-accent">Multi-provider</span>
        </legend>

        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
          @for (p of providers; track p.id) {
            <button
              type="button"
              class="btn flex items-center justify-between normal-case btn-sm"
              [class.btn-primary]="aiConfig.provider() === p.id"
              [class.btn-outline]="aiConfig.provider() !== p.id"
              (click)="onProviderSelect(p.id)"
            >
              <span class="truncate">{{ p.label }}</span>
              @if (p.quotaBadge) {
                <span class="badge badge-xs badge-ghost">{{ p.quotaBadge }}</span>
              }
            </button>
          }
        </div>
      </fieldset>

      <!-- 2. API Key for Selected Provider -->
      <fieldset class="fieldset">
        <legend
          class="fieldset-legend flex w-full items-center justify-between text-sm font-semibold"
        >
          <span class="flex items-center gap-2">
            <svg lucideKey class="h-4 w-4"></svg>
            API Key ({{ selectedProviderInfo()?.label || aiConfig.provider() }})
          </span>
          <span class="badge badge-ghost text-xs">{{
            t('ai.custom_keys.optional')
          }}</span>
        </legend>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs text-base-content/70">
              {{ currentKeyValue() ? 'Using custom API key' : 'Using server default (if configured)' }}
            </span>
            @if (selectedProviderInfo()?.consoleUrl) {
              <a
                [href]="selectedProviderInfo()?.consoleUrl"
                target="_blank"
                rel="noopener"
                class="link flex items-center gap-1 text-xs link-primary"
              >
                <span>Get API key</span>
                <svg lucideExternalLink class="h-3 w-3"></svg>
              </a>
            }
          </div>

          <div class="join w-full">
            <input
              [type]="showKey() ? 'text' : 'password'"
              class="input-bordered input join-item flex-1 font-mono text-xs input-sm"
              [placeholder]="'Enter ' + (selectedProviderInfo()?.label || 'provider') + ' API key...'"
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
              >
                {{ t('ai.keys.clear') }}
              </button>
            }
          </div>
        </div>
      </fieldset>

      <!-- 3. Models Discovered with Effective Key -->
      <fieldset class="fieldset">
        <legend
          class="fieldset-legend flex w-full items-center justify-between text-sm font-semibold"
        >
          <span class="flex items-center gap-2">
            <svg lucideCpu class="h-4 w-4"></svg>
            Available Models
          </span>
          <button
            type="button"
            class="btn gap-1 btn-ghost btn-xs"
            (click)="refreshModels()"
            title="Refresh live models"
          >
            <svg
              lucideRotateCw
              class="h-3.5 w-3.5"
              [class.animate-spin]="isModelsLoading()"
            ></svg>
            <span class="text-xs">Live Sync</span>
          </button>
        </legend>

        <div class="space-y-2">
          @if (isModelsLoading() && filteredModels().length === 0) {
            <div class="py-6 text-center text-xs text-base-content/60">
              <span
                class="loading mb-2 loading-sm loading-spinner text-primary"
              ></span>
              <p>Discovering available models...</p>
            </div>
          } @else {
            @for (model of filteredModels(); track model.id) {
              <div
                class="flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all"
                [class.border-primary]="aiConfig.selectedModelId() === model.id"
                [class.bg-primary/10]="aiConfig.selectedModelId() === model.id"
                [class.border-base-300]="
                  aiConfig.selectedModelId() !== model.id
                "
                [class.bg-base-100/50]="aiConfig.selectedModelId() !== model.id"
                (click)="aiConfig.selectedModelId.set(model.id)"
                (keyup.enter)="aiConfig.selectedModelId.set(model.id)"
                tabindex="0"
                role="button"
              >
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <p class="text-sm font-semibold">{{ model.name }}</p>
                    @if (aiConfig.selectedModelId() === model.id) {
                      <span class="badge badge-xs badge-primary">Selected</span>
                    }
                    @if (model.isDefault) {
                      <span class="badge badge-ghost badge-xs">Default</span>
                    }
                  </div>
                  <p class="truncate text-xs text-base-content/60">
                    {{ model.id }} · {{ model.description }}
                  </p>
                </div>
                @if (model.size) {
                  <div class="badge badge-ghost badge-sm">{{ model.size }}</div>
                }
              </div>
            }
          }
        </div>
      </fieldset>
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

