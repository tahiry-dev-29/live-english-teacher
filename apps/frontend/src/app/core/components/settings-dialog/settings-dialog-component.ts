import { Component, input, output, signal, computed, effect, viewChild, ElementRef, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideX, LucideSquare, LucidePlay,
  LucideMessageSquare, LucideSparkle, LucideEye, LucideEyeOff,
  LucideKey, LucideSettings, LucidePalette, LucideBot, LucideMic,
  LucideLanguages, LucideSun, LucideMoon, LucideMonitor,
} from '@lucide/angular';
import { ElevenLabsVoiceService, TtsVoice } from '@core/services/elevenlabs-voice.service';
import { AiConfigService, AiProvider, AiModel } from '@core/services/ai-config.service';
import { ApiKeyService } from '@core/services/api-key.service';
import { ThemeService, Theme } from '@core/services/theme.service';
import { I18nService, AppLanguage } from '@core/services/i18n.service';

interface Language {
  code: string;
  name: string;
  flag: string;
}

type SettingsTab = 'general' | 'ai_model' | 'voices' | 'language';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-settings-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
  LucideX, LucideSquare, LucidePlay,
    LucideMessageSquare, LucideSparkle, LucideEye, LucideEyeOff,
    LucideKey, LucideSettings, LucidePalette, LucideBot, LucideMic,
    LucideLanguages, LucideSun, LucideMoon, LucideMonitor,
  ],
  template: `
    <dialog #dialogEl class="modal">
      <div class="modal-box max-w-4xl p-0 h-[85vh] flex overflow-hidden bg-base-200 text-base-content border border-base-300 shadow-2xl">

        <!-- Left: Tab Navigation -->
        <div class="w-48 bg-base-300/50 border-r border-base-300 flex flex-col shrink-0">
          <div class="p-4 border-b border-base-300 flex items-center gap-2">
            <svg lucideSettings class="w-5 h-5 text-primary"></svg>
            <h3 class="font-bold text-sm">{{ t('settings.title') }}</h3>
          </div>

          <div class="flex flex-col p-2 gap-1 flex-1">
            <button
              type="button"
              class="btn btn-sm justify-start gap-2 normal-case"
              [class.btn-primary]="activeTab() === 'general'"
              [class.btn-ghost]="activeTab() !== 'general'"
              (click)="activeTab.set('general')"
            >
              <svg lucidePalette class="w-4 h-4"></svg>
              {{ t('settings.general') }}
            </button>
            <button
              type="button"
              class="btn btn-sm justify-start gap-2 normal-case"
              [class.btn-primary]="activeTab() === 'ai_model'"
              [class.btn-ghost]="activeTab() !== 'ai_model'"
              (click)="activeTab.set('ai_model')"
            >
              <svg lucideBot class="w-4 h-4"></svg>
              {{ t('settings.ai_model') }}
            </button>
            <button
              type="button"
              class="btn btn-sm justify-start gap-2 normal-case"
              [class.btn-primary]="activeTab() === 'voices'"
              [class.btn-ghost]="activeTab() !== 'voices'"
              (click)="activeTab.set('voices')"
            >
              <svg lucideMic class="w-4 h-4"></svg>
              {{ t('settings.voices') }}
            </button>
            <button
              type="button"
              class="btn btn-sm justify-start gap-2 normal-case"
              [class.btn-primary]="activeTab() === 'language'"
              [class.btn-ghost]="activeTab() !== 'language'"
              (click)="activeTab.set('language')"
            >
              <svg lucideLanguages class="w-4 h-4"></svg>
              {{ t('settings.language') }}
            </button>
          </div>
        </div>

        <!-- Right: Tab Content -->
        <div class="flex-1 flex flex-col min-w-0">
          <!-- Close button -->
          <div class="flex justify-end p-3 border-b border-base-300 shrink-0">
            <form method="dialog">
              <button class="btn btn-sm btn-circle btn-ghost" (click)="handleCancel()" aria-label="Close">
                <svg lucideX class="w-4 h-4"></svg>
              </button>
            </form>
          </div>

          <!-- Scrollable content -->
          <div class="flex-1 overflow-y-auto p-6">

            <!-- ═══════ GENERAL TAB ═══════ -->
            @if (activeTab() === 'general') {
            <div class="space-y-6">
              <!-- Theme -->
              <fieldset class="fieldset">
                <legend class="fieldset-legend font-semibold text-sm">{{ t('general.theme') }}</legend>
                <div class="flex gap-2">
                  <button type="button" class="btn btn-sm btn-outline gap-2 flex-1"
                    [class.btn-primary]="tempTheme() === 'dark'"
                    (click)="tempTheme.set('dark')">
                    <svg lucideMoon class="w-4 h-4"></svg>
                    {{ t('general.theme.dark') }}
                  </button>
                  <button type="button" class="btn btn-sm btn-outline gap-2 flex-1"
                    [class.btn-primary]="tempTheme() === 'light'"
                    (click)="tempTheme.set('light')">
                    <svg lucideSun class="w-4 h-4"></svg>
                    {{ t('general.theme.light') }}
                  </button>
                  <button type="button" class="btn btn-sm btn-outline gap-2 flex-1"
                    [class.btn-primary]="tempTheme() === 'system'"
                    (click)="tempTheme.set('system')">
                    <svg lucideMonitor class="w-4 h-4"></svg>
                    {{ t('general.theme.system') }}
                  </button>
                </div>
              </fieldset>

              <!-- Font Size -->
              <fieldset class="fieldset">
                <legend class="fieldset-legend font-semibold text-sm">{{ t('general.font_size') }}</legend>
                <div class="flex gap-2">
                  <button type="button" class="btn btn-sm btn-outline flex-1"
                    [class.btn-primary]="tempFontSize() === 'small'"
                    (click)="tempFontSize.set('small')">
                    <span class="text-xs">{{ t('general.font.small') }}</span>
                  </button>
                  <button type="button" class="btn btn-sm btn-outline flex-1"
                    [class.btn-primary]="tempFontSize() === 'medium'"
                    (click)="tempFontSize.set('medium')">
                    <span class="text-sm">{{ t('general.font.medium') }}</span>
                  </button>
                  <button type="button" class="btn btn-sm btn-outline flex-1"
                    [class.btn-primary]="tempFontSize() === 'large'"
                    (click)="tempFontSize.set('large')">
                    <span class="text-lg">{{ t('general.font.large') }}</span>
                  </button>
                </div>
              </fieldset>

              <!-- App Language -->
              <fieldset class="fieldset">
                <legend class="fieldset-legend font-semibold text-sm">{{ t('general.app_language') }}</legend>
                <div class="flex gap-2">
                  <button type="button" class="btn btn-sm btn-outline gap-2 flex-1"
                    [class.btn-primary]="tempAppLang() === 'en'"
                    (click)="tempAppLang.set('en')">
                    🇬🇧 English
                  </button>
                  <button type="button" class="btn btn-sm btn-outline gap-2 flex-1"
                    [class.btn-primary]="tempAppLang() === 'fr'"
                    (click)="tempAppLang.set('fr')">
                    🇫🇷 Français
                  </button>
                  <button type="button" class="btn btn-sm btn-outline gap-2 flex-1"
                    [class.btn-primary]="tempAppLang() === 'es'"
                    (click)="tempAppLang.set('es')">
                    🇪🇸 Español
                  </button>
                </div>
              </fieldset>
            </div>
            }

            <!-- ═══════ AI MODEL TAB ═══════ -->
            @if (activeTab() === 'ai_model') {
            <div class="space-y-6">
              <!-- Provider -->
              <fieldset class="fieldset">
                <legend class="fieldset-legend font-semibold text-sm flex items-center justify-between w-full">
                  <span>{{ t('ai.provider') }}</span>
                  <span class="text-xs badge badge-accent badge-outline">{{ t('ai.provider.beta') }}</span>
                </legend>
                <div class="flex gap-2 mb-4">
                  <button type="button" class="flex-1 btn btn-sm btn-outline gap-2 normal-case"
                    [class.btn-primary]="tempProvider() === 'groq'"
                    (click)="onProviderSelect('groq')">
                    <svg lucideMessageSquare class="w-4 h-4"></svg>
                    Groq
                  </button>
                  <button type="button" class="flex-1 btn btn-sm btn-outline gap-2 normal-case"
                    [class.btn-primary]="tempProvider() === 'gemini'"
                    (click)="onProviderSelect('gemini')">
                    <svg lucideSparkle class="w-4 h-4"></svg>
                    Gemini
                  </button>
                </div>
                <div class="space-y-2">
                  @for (model of filteredModels(); track model.id) {
                  <div class="flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer"
                    [class.border-primary]="tempModelId() === model.id"
                    [class.bg-primary/10]="tempModelId() === model.id"
                    [class.border-base-300]="tempModelId() !== model.id"
                    [class.bg-base-100/50]="tempModelId() !== model.id"
                    (click)="onModelSelect(model.id)"
                    (keyup.enter)="onModelSelect(model.id)"
                    tabindex="0" role="button">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <p class="text-sm font-semibold">{{ model.name }}</p>
                        @if (tempModelId() === model.id) {
                        <span class="badge badge-primary badge-xs">Selected</span>
                        }
                      </div>
                      <p class="text-xs text-base-content/60 truncate">{{ model.id }} · {{ model.description }}</p>
                    </div>
                    @if (model.size) {
                    <div class="badge badge-sm badge-ghost">{{ model.size }}</div>
                    }
                  </div>
                  }
                </div>
              </fieldset>

              <!-- API Keys -->
              <fieldset class="fieldset">
                <legend class="fieldset-legend font-semibold text-sm flex items-center justify-between w-full">
                  <span class="flex items-center gap-2">
                    <svg lucideKey class="w-4 h-4"></svg>
                    {{ t('ai.custom_keys') }}
                  </span>
                  <span class="text-xs badge badge-ghost">{{ t('ai.custom_keys.optional') }}</span>
                </legend>

                <div class="space-y-1 mb-3">
                  <div class="flex items-center justify-between">
                    <label class="text-xs text-base-content/60">{{ t('ai.keys.groq') }}</label>
                    @if (tempGroqKey()) {
                    <span class="badge badge-primary badge-xs">{{ t('ai.keys.custom') }}</span>
                    } @else {
                    <span class="badge badge-ghost badge-xs">{{ t('ai.keys.server_default') }}</span>
                    }
                  </div>
                  <div class="join w-full">
                    <input [type]="showGroqKey() ? 'text' : 'password'"
                      class="input input-sm input-bordered join-item flex-1 font-mono text-xs"
                      placeholder="gsk_..." [ngModel]="tempGroqKey()" (ngModelChange)="tempGroqKey.set($event)" />
                    <button type="button" class="btn btn-sm btn-ghost join-item" (click)="showGroqKey.set(!showGroqKey())">
                      @if (showGroqKey()) { <svg lucideEyeOff class="w-4 h-4"></svg>
                      } @else { <svg lucideEye class="w-4 h-4"></svg> }
                    </button>
                    @if (tempGroqKey()) {
                    <button type="button" class="btn btn-sm btn-ghost join-item text-error" (click)="tempGroqKey.set('')">
                      {{ t('ai.keys.clear') }}
                    </button>
                    }
                  </div>
                </div>

                <div class="space-y-1 mb-3">
                  <div class="flex items-center justify-between">
                    <label class="text-xs text-base-content/60">{{ t('ai.keys.gemini') }}</label>
                    @if (tempGeminiKey()) {
                    <span class="badge badge-primary badge-xs">{{ t('ai.keys.custom') }}</span>
                    } @else {
                    <span class="badge badge-ghost badge-xs">{{ t('ai.keys.server_default') }}</span>
                    }
                  </div>
                  <div class="join w-full">
                    <input [type]="showGeminiKey() ? 'text' : 'password'"
                      class="input input-sm input-bordered join-item flex-1 font-mono text-xs"
                      placeholder="AIza..." [ngModel]="tempGeminiKey()" (ngModelChange)="tempGeminiKey.set($event)" />
                    <button type="button" class="btn btn-sm btn-ghost join-item" (click)="showGeminiKey.set(!showGeminiKey())">
                      @if (showGeminiKey()) { <svg lucideEyeOff class="w-4 h-4"></svg>
                      } @else { <svg lucideEye class="w-4 h-4"></svg> }
                    </button>
                    @if (tempGeminiKey()) {
                    <button type="button" class="btn btn-sm btn-ghost join-item text-error" (click)="tempGeminiKey.set('')">
                      {{ t('ai.keys.clear') }}
                    </button>
                    }
                  </div>
                </div>

                <div class="collapse collapse-arrow bg-base-100/50 border border-base-300">
                  <input type="checkbox" />
                  <div class="collapse-title text-xs font-medium text-base-content/70">
                    {{ t('ai.keys.tutorial') }}
                  </div>
                  <div class="collapse-content text-xs text-base-content/60 space-y-3">
                    <div>
                      <p class="font-semibold text-base-content/80 mb-1">1. Groq (fast inference)</p>
                      <ol class="list-decimal list-inside space-y-0.5 mb-1.5">
                        <li>Go to <a href="https://console.groq.com/keys" target="_blank" rel="noopener" class="link link-primary">console.groq.com/keys</a></li>
                        <li>Sign in or create a free account</li>
                        <li>Click "Create API Key" and copy it</li>
                      </ol>
                    </div>
                    <div>
                      <p class="font-semibold text-base-content/80 mb-1">2. Gemini (Google AI)</p>
                      <ol class="list-decimal list-inside space-y-0.5">
                        <li>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener" class="link link-primary">aistudio.google.com/app/apikey</a></li>
                        <li>Sign in with your Google account</li>
                        <li>Click "Create API Key" and copy it</li>
                      </ol>
                    </div>
                    <p class="text-base-content/50 italic">Keys are stored locally in your browser and sent only to the AI provider.</p>
                  </div>
                </div>
              </fieldset>
            </div>
            }

            <!-- ═══════ VOICES TAB ═══════ -->
            @if (activeTab() === 'voices') {
            <fieldset class="fieldset">
              <legend class="fieldset-legend font-semibold text-sm flex items-center justify-between w-full">
                <span>{{ t('voices.title') }}</span>
                <span class="text-xs badge badge-primary badge-outline">{{ t('voices.hd') }}</span>
              </legend>
              <div class="space-y-1.5 max-h-[50vh] overflow-y-auto rounded-box border border-base-300 p-2 bg-base-100/50">
                @for (voice of availableVoicesList(); track voice.id) {
                <div class="flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer border border-transparent"
                  [class.bg-primary/20]="tempVoiceId() === voice.id"
                  [class.border-primary/50]="tempVoiceId() === voice.id"
                  [class.hover:bg-base-300/60]="tempVoiceId() !== voice.id"
                  (click)="tempVoiceId.set(voice.id)"
                  (keyup.enter)="tempVoiceId.set(voice.id)"
                  tabindex="0" role="button">
                  <div class="flex-1 min-w-0 pr-2">
                    <div class="flex items-center gap-2">
                      <p class="text-sm font-semibold truncate">{{ voice.name }}</p>
                      @if (tempVoiceId() === voice.id) {
                      <span class="badge badge-primary badge-xs">{{ t('voices.selected') }}</span>
                      }
                    </div>
                    @if (voice.description) {
                    <p class="text-xs text-base-content/60 truncate">{{ voice.description }}</p>
                    }
                  </div>
                  <button type="button" class="btn btn-circle btn-sm shrink-0"
                    [class.btn-primary]="playingVoiceId() === voice.id"
                    [class.btn-ghost]="playingVoiceId() !== voice.id"
                    (click)="previewVoice(voice); $event.stopPropagation()"
                    [attr.aria-label]="playingVoiceId() === voice.id ? 'Stop' : 'Preview'">
                    @if (playingVoiceId() === voice.id) {
                    <svg lucideSquare class="w-4 h-4"></svg>
                    } @else {
                    <svg lucidePlay class="w-4 h-4"></svg>
                    }
                  </button>
                </div>
                }
              </div>
            </fieldset>
            }

            <!-- ═══════ LANGUAGE TAB ═══════ -->
            @if (activeTab() === 'language') {
            <div class="space-y-4">
              <fieldset class="fieldset">
                <legend class="fieldset-legend font-semibold text-sm">{{ t('language.learning') }}</legend>
                <p class="text-xs text-base-content/50 mb-3">{{ t('language.learning_hint') }}</p>
                <div class="grid grid-cols-3 gap-2">
                  @for (lang of languagesList; track lang.code) {
                  <button type="button" class="btn btn-outline justify-start gap-2 h-auto py-2.5 px-3"
                    [class.btn-primary]="tempLanguage() === lang.code"
                    (click)="onLanguageSelect(lang.code)">
                    <span class="text-xl leading-none">{{ lang.flag }}</span>
                    <span class="text-xs font-medium">{{ lang.name }}</span>
                  </button>
                  }
                </div>
              </fieldset>
            </div>
            }
          </div>

          <!-- Footer -->
          <div class="modal-action px-6 py-4 border-t border-base-300 shrink-0 bg-base-300/30">
            <form method="dialog" class="flex gap-2">
              <button type="submit" class="btn btn-ghost" (click)="handleCancel()">{{ t('settings.cancel') }}</button>
              <button type="submit" class="btn btn-primary" (click)="handleSave()">{{ t('settings.save') }}</button>
            </form>
          </div>
        </div>
      </div>

      <form method="dialog" class="modal-backdrop">
        <button (click)="handleCancel()">close</button>
      </form>
    </dialog>
  `,
})
export class SettingsDialogComponent {
  private readonly elevenLabs = inject(ElevenLabsVoiceService);
  private readonly aiConfig = inject(AiConfigService);
  private readonly apiKeyService = inject(ApiKeyService);
  private readonly themeService = inject(ThemeService);
  private readonly i18n = inject(I18nService);

  readonly dialogEl = viewChild<ElementRef<HTMLDialogElement>>('dialogEl');

  readonly isOpen = input<boolean>(false);
  readonly languages = input<Language[]>([]);
  readonly selectedLanguage = input<string>('en');
  readonly selectedVoiceName = input<string>('');

  readonly closed = output<void>();
  readonly languageChange = output<string>();
  readonly voiceChange = output<string>();

  // i18n helper - expose as method for template
  t(key: string): string {
    return this.i18n.t()(key);
  }

  // Tab state
  readonly activeTab = signal<SettingsTab>('general');

  // General tab
  readonly tempTheme = signal<Theme>(this.themeService.theme());
  readonly tempFontSize = signal<string>('medium');
  readonly tempAppLang = signal<AppLanguage>(this.i18n.lang());

  // AI Model tab
  readonly tempProvider = signal<AiProvider>(this.aiConfig.provider());
  readonly tempModelId = signal<string>(this.aiConfig.selectedModelId());
  readonly tempGroqKey = signal<string>(this.apiKeyService.customGroqKey());
  readonly tempGeminiKey = signal<string>(this.apiKeyService.customGeminiKey());
  readonly showGroqKey = signal<boolean>(false);
  readonly showGeminiKey = signal<boolean>(false);

  // Voices tab
  readonly tempVoiceId = signal<string>('JBFqnCBsd6RMkjVDRZzb');
  readonly playingVoiceId = signal<string | null>(null);

  // Language tab
  readonly tempLanguage = signal<string>('en');

  private audioPreview: HTMLAudioElement | null = null;

  readonly availableVoicesList = computed<TtsVoice[]>(() => this.elevenLabs.voices());
  readonly filteredModels = computed<AiModel[]>(() => this.aiConfig.getModelsForProvider(this.tempProvider()));

  private readonly defaultLanguages: Language[] = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'French', flag: '🇫🇷' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'de', name: 'German', flag: '🇩🇪' },
    { code: 'it', name: 'Italian', flag: '🇮🇹' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  ];

  get languagesList(): Language[] {
    const langs = this.languages();
    return langs.length > 0 ? langs : this.defaultLanguages;
  }

  private readonly sampleTexts: Record<string, string> = {
    en: 'Hello! I am your AI English tutor. How can I help you improve today?',
    fr: 'Bonjour ! Je suis votre tuteur IA. Comment puis-je vous aider aujourd\'hui ?',
    es: '¡Hola! Soy tu tutor de IA. ¿Cómo puedo ayudarte hoy?',
    de: 'Hallo! Ich bin dein KI-Tutor. Wie kann ich dir heute helfen?',
    it: 'Ciao! Sono il tuo tutor AI. Come posso aiutarti oggi?',
    ja: 'こんにちは！あなたのAIチューターです。よろしくお願いします！',
  };

  constructor() {
    effect(() => {
      const dialog = this.dialogEl()?.nativeElement;
      if (!dialog) return;
      if (this.isOpen()) {
        this.tempLanguage.set(this.selectedLanguage());
        this.tempVoiceId.set(this.elevenLabs.selectedVoiceId());
        this.tempProvider.set(this.aiConfig.provider());
        this.tempModelId.set(this.aiConfig.selectedModelId());
        this.tempGroqKey.set(this.apiKeyService.customGroqKey());
        this.tempGeminiKey.set(this.apiKeyService.customGeminiKey());
        this.tempTheme.set(this.themeService.theme());
        this.tempAppLang.set(this.i18n.lang());
        this.showGroqKey.set(false);
        this.showGeminiKey.set(false);
        this.activeTab.set('general');
        if (!dialog.open) dialog.showModal();
      } else {
        this.stopAudioPreview();
        if (dialog.open) dialog.close();
      }
    });
  }

  onLanguageSelect(code: string): void {
    this.tempLanguage.set(code);
  }

  onProviderSelect(provider: AiProvider): void {
    this.tempProvider.set(provider);
    const models = this.aiConfig.getModelsForProvider(provider);
    if (models.length > 0 && !models.some((m) => m.id === this.tempModelId())) {
      this.tempModelId.set(models[0].id);
    }
  }

  onModelSelect(modelId: string): void {
    this.tempModelId.set(modelId);
  }

  async previewVoice(voice: TtsVoice): Promise<void> {
    if (this.playingVoiceId() === voice.id) {
      this.stopAudioPreview();
      return;
    }

    this.stopAudioPreview();
    this.playingVoiceId.set(voice.id);

    const langCode = this.tempLanguage();
    const text = this.sampleTexts[langCode] ?? this.sampleTexts['en'];

    try {
      const audioResult = await this.elevenLabs.generateSpeechAudio(text, voice.id, langCode);
      if (audioResult) {
        const byteCharacters = atob(audioResult.audioData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([new Uint8Array(byteNumbers)], { type: audioResult.mimeType });
        const url = URL.createObjectURL(blob);
        this.audioPreview = new Audio(url);
        this.audioPreview.onended = () => { this.playingVoiceId.set(null); URL.revokeObjectURL(url); };
        this.audioPreview.onerror = () => { this.playingVoiceId.set(null); URL.revokeObjectURL(url); };
        await this.audioPreview.play();
        return;
      }
    } catch (e) {
      console.warn('Voice preview error:', e);
    }
    this.playingVoiceId.set(null);
  }

  private stopAudioPreview(): void {
    if (this.audioPreview) {
      this.audioPreview.pause();
      this.audioPreview = null;
    }
    this.playingVoiceId.set(null);
  }

  handleSave(): void {
    this.stopAudioPreview();
    this.elevenLabs.selectedVoiceId.set(this.tempVoiceId());
    this.aiConfig.provider.set(this.tempProvider());
    this.aiConfig.selectedModelId.set(this.tempModelId());
    this.apiKeyService.setGroqKey(this.tempGroqKey());
    this.apiKeyService.setGeminiKey(this.tempGeminiKey());
    this.themeService.setTheme(this.tempTheme());
    this.i18n.setLang(this.tempAppLang());
    this.languageChange.emit(this.tempLanguage());
    this.voiceChange.emit(this.tempVoiceId());
    this.closed.emit();
  }

  handleCancel(): void {
    this.stopAudioPreview();
    this.tempLanguage.set(this.selectedLanguage());
    this.tempVoiceId.set(this.elevenLabs.selectedVoiceId());
    this.tempProvider.set(this.aiConfig.provider());
    this.tempModelId.set(this.aiConfig.selectedModelId());
    this.tempGroqKey.set(this.apiKeyService.customGroqKey());
    this.tempGeminiKey.set(this.apiKeyService.customGeminiKey());
    this.tempTheme.set(this.themeService.theme());
    this.tempAppLang.set(this.i18n.lang());
    this.closed.emit();
  }
}
