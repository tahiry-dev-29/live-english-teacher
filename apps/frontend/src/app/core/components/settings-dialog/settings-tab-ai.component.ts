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
import {
  AppSelectComponent,
  SelectOption,
} from '@core/components/ui/select/select.component';

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
    LucideExternalLink,
    AppSelectComponent,
  ],
  template: `
    <div class="space-y-6">
      <!-- 1. Provider Selection (Canonical daisyUI fieldset & select) -->
      <fieldset class="fieldset w-full">
        <legend
          class="fieldset-legend text-xs font-medium tracking-wider text-base-content/60 uppercase"
        >
          {{ t('ai.provider') }}
        </legend>
        <div class="flex w-full items-center gap-2">
          <app-select
            class="flex-1"
            [options]="providerOptions"
            [value]="aiConfig.provider()"
            (valueChange)="onProviderSelect($event)"
            size="sm"
            color="primary"
          />
          @if (aiConfig.provider() === 'default') {
            <span class="badge shrink-0 badge-sm badge-success">Server</span>
          } @else if (selectedProviderInfo()?.quotaBadge) {
            <span class="badge shrink-0 badge-sm badge-neutral">{{
              selectedProviderInfo()?.quotaBadge
            }}</span>
          }
        </div>
        <span class="label text-[11px] text-base-content/50">
          Select your conversational intelligence provider or use server default
        </span>
      </fieldset>

      <!-- 2. API Key for Selected Provider -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <p
            class="text-xs font-medium tracking-wider text-base-content/50 uppercase"
          >
            API Key ({{
              aiConfig.provider() === 'default'
                ? 'Server Default'
                : selectedProviderInfo()?.label || aiConfig.provider()
            }})
          </p>
          <span class="text-xs text-base-content/40">{{
            t('ai.custom_keys.optional')
          }}</span>
        </div>

        <!-- Key mode status -->
        <div
          class="flex items-center justify-between rounded-lg border border-base-300 bg-base-100/40 px-3 py-2"
        >
          <div class="flex items-center gap-2">
            <svg lucideKey class="h-3.5 w-3.5 text-base-content/40"></svg>
            @if (aiConfig.provider() === 'default') {
              <span class="text-xs text-base-content/70"
                >Using server preconfigured environment key</span
              >
              <span class="badge badge-xs badge-success">Server Active</span>
            } @else if (currentKeyValue()) {
              <span class="text-xs text-base-content/70"
                >Custom key active</span
              >
              <span class="badge badge-xs badge-success">Custom</span>
            } @else {
              <span class="text-xs text-base-content/70">No key provided</span>
              <span class="badge badge-xs badge-warning">Key required</span>
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

        @if (aiConfig.provider() !== 'default') {
          <div class="join w-full">
            <input
              [type]="showKey() ? 'text' : 'password'"
              class="input-bordered input join-item flex-1 font-mono text-xs input-sm"
              [placeholder]="
                'Enter ' +
                (selectedProviderInfo()?.label || 'provider') +
                ' API key to discover & use models...'
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
        }
      </div>

      <!-- 3. Available Models (Hidden if user has not entered an API key and not using server default) -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <p
            class="text-xs font-medium tracking-wider text-base-content/50 uppercase"
          >
            Available Models
          </p>
          @if (isKeyReady()) {
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
          }
        </div>

        @if (!isKeyReady()) {
          <!-- Empty State: Prompt user to enter API key -->
          <div
            class="flex flex-col items-center justify-center rounded-xl border border-dashed border-base-300 bg-base-100/30 px-4 py-8 text-center"
          >
            <div class="mb-2 rounded-full bg-base-200 p-2.5">
              <svg lucideKey class="h-5 w-5 text-base-content/40"></svg>
            </div>
            <p class="text-xs font-semibold text-base-content">
              API Key required to view available models
            </p>
            <p class="mt-1 max-w-sm text-[11px] text-base-content/60">
              Please enter your
              {{ selectedProviderInfo()?.label || 'provider' }} API key above to
              discover and activate the models list, or select "Server Default"
              to use server configurations.
            </p>
          </div>
        } @else {
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            @if (isModelsLoading() && filteredModels().length === 0) {
              <div
                class="col-span-full py-6 text-center text-xs text-base-content/60"
              >
                <span
                  class="loading mb-2 loading-sm loading-spinner text-primary"
                ></span>
                <p>Fetching models from provider...</p>
              </div>
            } @else {
              @for (model of filteredModels(); track model.id) {
                <div
                  class="flex cursor-pointer flex-col justify-between rounded-xl border p-3 transition-all"
                  [class.border-primary]="
                    aiConfig.selectedModelId() === model.id
                  "
                  [class.bg-primary/5]="aiConfig.selectedModelId() === model.id"
                  [class.border-base-300]="
                    aiConfig.selectedModelId() !== model.id
                  "
                  [class.bg-base-100/30]="
                    aiConfig.selectedModelId() !== model.id
                  "
                  (click)="aiConfig.selectedModelId.set(model.id)"
                  (keyup.enter)="aiConfig.selectedModelId.set(model.id)"
                  tabindex="0"
                  role="button"
                >
                  <div class="min-w-0 space-y-1">
                    <div class="flex items-start justify-between gap-2">
                      <p class="text-sm font-semibold text-base-content">
                        {{ model.name }}
                      </p>
                      <div class="flex shrink-0 items-center gap-1">
                        @if (model.isDefault) {
                          <span class="badge badge-ghost badge-xs"
                            >Default</span
                          >
                        }
                        @if (aiConfig.selectedModelId() === model.id) {
                          <span class="badge badge-xs badge-primary"
                            >Selected</span
                          >
                        }
                      </div>
                    </div>
                    <p class="line-clamp-2 text-xs text-base-content/60">
                      {{ model.description || model.id }}
                    </p>
                  </div>
                  <div
                    class="mt-2.5 flex items-center justify-between border-t border-base-300/60 pt-2 text-[11px] text-base-content/50"
                  >
                    <span class="max-w-[150px] truncate font-mono">{{
                      model.id
                    }}</span>
                    @if (model.size) {
                      <span class="badge badge-ghost badge-xs">{{
                        model.size
                      }}</span>
                    }
                  </div>
                </div>
              }
            }
          </div>
        }
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

  /** Options for the provider app-select, including the server default entry. */
  readonly providerOptions: SelectOption[] = [
    { value: 'default', label: 'Server Default (Default Backend AI)' },
    ...KNOWN_PROVIDERS.map((p) => ({
      value: p.id,
      label: p.quotaBadge ? `${p.label} — (${p.quotaBadge})` : p.label,
    })),
  ];

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

  readonly isKeyReady = computed<boolean>(() => {
    const provider = this.aiConfig.provider();
    if (provider === 'default') return true;
    return !!this.currentKeyValue()?.trim();
  });

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
