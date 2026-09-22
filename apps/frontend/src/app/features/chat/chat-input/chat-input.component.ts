import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { LanguageService } from '@features/settings/services/language.service';
import { PromptTagService } from '@core/services/prompt-tag.service';
import { TagAutocomplete } from './chat-tag-autocomplete';
import { ChatAttachmentsComponent } from './chat-attachments.component';
import { ChatComposerFieldComponent } from './chat-composer-field.component';
import { ChatInputToolbarComponent } from './chat-input-toolbar.component';
import { toAttachments, type PromptAttachment } from './chat-input.util';

export type { PromptAttachment } from './chat-input.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-chat-input',
  standalone: true,
  imports: [
    ChatAttachmentsComponent,
    ChatInputToolbarComponent,
    ChatComposerFieldComponent,
  ],
  template: `
    <div class="mx-auto w-full max-w-4xl min-w-0">
      <div
        class="min-w-0 rounded-[20px] border border-base-300/60 bg-base-200 px-4 pt-3 pb-2.5 shadow-lg transition-colors focus-within:border-base-content/25"
      >
        <app-chat-attachments
          [attachments]="attachments()"
          (remove)="removeAttachment($event)"
        />

        <app-chat-composer-field
          [value]="value()"
          [disabled]="disabled()"
          [isRecording]="isRecording()"
          [suggestions]="tags.suggestions()"
          [activeIndex]="tags.activeIndex()"
          (valueChange)="onInputChange($event)"
          (composerKeydown)="onComposerKeydown($event)"
          (tagPicked)="insertTag($event)"
          (activeIndexChange)="tags.activeIndex.set($event)"
        />

        <app-chat-input-toolbar
          [languages]="languages"
          [selectedLang]="selectedLangCode()"
          [currentFlag]="currentFlag()"
          [currentName]="currentLangName()"
          [disabled]="disabled()"
          [isLoading]="isLoading()"
          [isPlaying]="isPlaying()"
          [isRecording]="isRecording()"
          [isLiveActive]="isLiveActive()"
          [canSend]="canSend()"
          (filesSelected)="onFilesSelected($event)"
          (audioRecorded)="audioRecorded.emit($event)"
          (recordingStateChange)="recordingStateChange.emit($event)"
          (languageChange)="onLanguageChange($event)"
          (stop)="stop.emit()"
          (liveToggled)="liveToggled.emit()"
          (submitted)="onSubmit()"
        />
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
    `,
  ],
})
export class ChatInputComponent {
  private readonly languageService = inject(LanguageService);

  readonly languages = this.languageService.languages;
  readonly selectedLangCode = this.languageService.selectedLanguageCode;

  readonly value = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly isLoading = input<boolean>(false);
  readonly isPlaying = input<boolean>(false);
  readonly isRecording = input<boolean>(false);
  readonly isLiveActive = input<boolean>(false);

  readonly valueChange = output<string>();
  readonly messageSent = output<void>();
  readonly audioRecorded = output<{ base64: string }>();
  readonly stop = output<void>();
  readonly recordingStateChange = output<boolean>();
  readonly liveToggled = output<void>();
  readonly filesSelected = output<File[]>();

  private readonly field = viewChild(ChatComposerFieldComponent);

  readonly attachments = signal<PromptAttachment[]>([]);

  /** #tag autocomplete (task 87) — logic in chat-tag-autocomplete.ts. */
  readonly tags = new TagAutocomplete(inject(PromptTagService), {
    caretPosition: () => this.field()?.caretPosition() ?? this.value().length,
    focusAt: (caret) => this.field()?.focusAt(caret),
    value: () => this.value(),
  });

  readonly canSend = computed<boolean>(() => this.value().trim().length > 0);
  readonly currentFlag = signal<string>('🇬🇧');
  readonly currentLangName = computed<string>(() => {
    const code = this.selectedLangCode();
    return this.languages.find((l) => l.code === code)?.name ?? 'Language';
  });

  constructor() {
    effect(() => {
      const code = this.languageService.selectedLanguageCode();
      const lang = this.languages.find((l) => l.code === code);
      if (lang) this.currentFlag.set(lang.flag);
    });
  }

  onLanguageChange(code: string): void {
    this.languageService.setLanguage(code);
    const lang = this.languages.find((l) => l.code === code);
    if (lang) this.currentFlag.set(lang.flag);
    // Close the popover after selection
    (
      document.getElementById('lang-picker') as HTMLElement | null
    )?.hidePopover?.();
  }

  onInputChange(text: string): void {
    this.valueChange.emit(text);
    this.tags.onInput(text);
  }

  onComposerKeydown(event: KeyboardEvent): void {
    if (this.tags.onKeydown(event)) return;
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSubmit();
    }
  }

  /** Insert the chosen tag at the #token position. */
  insertTag(name: string): void {
    this.tags.insert(name, (text) => this.valueChange.emit(text));
  }

  onSubmit(): void {
    if (this.value().trim() && !this.disabled() && !this.isLoading()) {
      this.attachments.set([]);
      this.messageSent.emit();
    }
  }

  onFilesSelected(files: File[]): void {
    this.attachments.update((current) => [...current, ...toAttachments(files)]);
    this.filesSelected.emit(files);
  }

  removeAttachment(index: number): void {
    this.attachments.update((current) => current.filter((_, i) => i !== index));
  }
}
