import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { LucideEye, LucideEyeOff } from '@lucide/angular';
import { ElevenLabsVoiceService } from '@core/services/elevenlabs-voice.service';
import { ApiKeyService } from '@core/services/api-key.service';
import { I18nService } from '@core/services/i18n.service';
import {
  AppSelectComponent,
  SelectOption,
} from '@core/components/ui/select/select.component';
import { VoiceLiveTestComponent } from './voice-live-test.component';
import { BrowserVoicePickerComponent } from './browser-voice-picker.component';
import {
  toTtsProviderOptions,
  toVoiceOptions,
  toTtsModelOptions,
  getInputValue,
} from './settings-tab-voices.util';

@Component({
  selector: 'app-settings-tab-voices',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LucideEye,
    LucideEyeOff,
    AppSelectComponent,
    VoiceLiveTestComponent,
    BrowserVoicePickerComponent,
  ],
  template: `
    <div class="space-y-5">
      <app-select
        selectId="settings-tts-provider"
        [label]="t('voices.provider')"
        [options]="ttsProviderOptions()"
        [(value)]="ttsService.selectedProviderId"
        size="sm"
        color="primary"
      />
      @if (
        ttsService.selectedProviderId() !== 'default' &&
        ttsService.selectedProviderId() !== 'browser' &&
        selectedProviderMeta()?.hasCustomKeys
      ) {
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <p class="text-xs font-medium uppercase opacity-50">
              API Key ({{ selectedProviderMeta()?.label }})
            </p>
            @if (currentKeyValue()) {
              <span class="badge badge-xs badge-success">Active</span>
            } @else {
              <span class="badge badge-xs badge-warning">Required</span>
            }
          </div>
          <div class="join w-full">
            <input
              [type]="showKey() ? 'text' : 'password'"
              class="input-bordered input join-item flex-1 font-mono text-xs input-sm"
              placeholder="Enter API key for live voices…"
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
        </div>
      }
      @if (ttsService.ttsModels().length > 0) {
        <app-select
          selectId="settings-tts-model"
          [label]="t('voices.model')"
          [options]="ttsModelOptions()"
          [(value)]="ttsService.selectedModelId"
          size="sm"
          color="primary"
        />
      }
      <div class="space-y-2">
        <p class="text-xs font-medium uppercase opacity-50">
          {{ t('voices.title') }} ({{ ttsService.voices().length }})
        </p>
        @if (ttsService.loading()) {
          <p class="py-2 text-xs opacity-60">Loading live voices…</p>
        } @else if (ttsService.voices().length === 0) {
          <p
            class="rounded-lg border border-dashed p-4 text-center text-xs opacity-60"
          >
            {{ ttsService.liveError() || 'No live voices. Add an API key.' }}
          </p>
        } @else {
          <app-select
            selectId="settings-tutor-voice"
            [options]="voiceOptions()"
            [(value)]="ttsService.selectedVoiceId"
            size="sm"
            color="primary"
          />
          <app-voice-live-test [voiceId]="ttsService.selectedVoiceId()" />
        }
      </div>
      <div class="space-y-1.5 border-t border-base-300 pt-4">
        <app-select
          selectId="settings-stt-model"
          [label]="t('voices.stt_model')"
          [options]="sttModelOptions()"
          [(value)]="ttsService.selectedSttModel"
          size="sm"
          color="primary"
        />
      </div>
      <app-browser-voice-picker />
    </div>
  `,
})
export class SettingsTabVoicesComponent {
  readonly ttsService = inject(ElevenLabsVoiceService);
  readonly apiKeyService = inject(ApiKeyService);
  readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);
  readonly showKey = signal<boolean>(false);
  readonly selectedProviderMeta = computed(() =>
    this.ttsService.currentProviderMeta(),
  );
  readonly currentKeyValue = computed(() =>
    this.apiKeyService.getKey(this.ttsService.selectedProviderId()),
  );
  readonly ttsProviderOptions = computed<SelectOption[]>(() =>
    toTtsProviderOptions(this.ttsService.providers()),
  );
  readonly voiceOptions = computed<SelectOption[]>(() =>
    toVoiceOptions(this.ttsService.voices()),
  );
  readonly ttsModelOptions = computed<SelectOption[]>(() =>
    toTtsModelOptions(this.ttsService.ttsModels()),
  );
  readonly sttModelOptions = computed<SelectOption[]>(() => {
    const p = this.ttsService.selectedProviderId();
    const base: SelectOption[] = [
      { value: 'whisper-large-v3-turbo', label: 'Whisper Large V3 Turbo' },
      { value: 'whisper-large-v3', label: 'Whisper Large V3 (Accurate)' },
      { value: 'distil-whisper-large-v3-en', label: 'Distil Whisper (EN)' },
    ];
    if (p === 'browser')
      return [{ value: 'web-speech', label: 'Web Speech (live)' }, ...base];
    if (p === 'openai')
      return [{ value: 'whisper-1', label: 'Whisper-1 (OpenAI)' }, ...base];
    if (p === 'google')
      return [{ value: 'google-chirp', label: 'Google Chirp' }, ...base];
    return [...base, { value: 'web-speech', label: 'Web Speech (fallback)' }];
  });
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
    });
  }

  t(key: string): string {
    return this.i18n.t()(key);
  }

  onKeyInput(event: Event): void {
    const value = getInputValue(event);
    const provider = this.ttsService.selectedProviderId();
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.apiKeyService.setKey(provider, value);
      void this.ttsService.loadVoicesForProvider(provider);
      void this.ttsService.loadTtsModelsForProvider(provider);
    }, 500);
  }

  onClearKey(): void {
    const p = this.ttsService.selectedProviderId();
    this.apiKeyService.clearKey(p);
    void this.ttsService.loadVoicesForProvider(p);
    void this.ttsService.loadTtsModelsForProvider(p);
  }
}
