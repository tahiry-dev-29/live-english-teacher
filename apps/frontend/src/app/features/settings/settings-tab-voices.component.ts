import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { LucideEye, LucideEyeOff } from '@lucide/angular';
import { ElevenLabsVoiceService } from '@features/tts-voice/services/elevenlabs-voice.service';
import { ApiKeyService } from '@features/settings/services/api-key.service';
import { I18nService } from '@features/settings/services/i18n.service';
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
  sttModelOptionsFor,
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
  templateUrl: './settings-tab-voices.component.html',
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
  readonly sttModelOptions = computed<SelectOption[]>(() =>
    sttModelOptionsFor(this.ttsService.selectedProviderId()),
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

  onProviderSelect(providerId: string | null): void {
    if (!providerId) return;
    this.ttsService.setProviderId(providerId);
  }

  onKeyInput(event: Event): void {
    const value = getInputValue(event);
    const provider = this.ttsService.selectedProviderId();
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.apiKeyService.setKey(provider, value);
      // Use server key if no client-side key
      const useServerKey = !value;
      void this.ttsService.loadVoicesForProvider(provider, useServerKey);
      void this.ttsService.loadTtsModelsForProvider(provider, useServerKey);
    }, 500);
  }

  onClearKey(): void {
    const p = this.ttsService.selectedProviderId();
    this.apiKeyService.clearKey(p);
    // After clearing, try with server key
    void this.ttsService.loadVoicesForProvider(p, true);
    void this.ttsService.loadTtsModelsForProvider(p, true);
  }
}
