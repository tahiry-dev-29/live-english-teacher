import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  viewChild,
} from '@angular/core';
import {
  LucideAudioWaveform,
  LucidePlus,
  LucideSquare,
  LucideArrowUp,
} from '@lucide/angular';
import { Language } from '@features/settings/services/language.service';
import { AudioRecorderComponent } from './audio-recorder';
import { ChatLanguagePickerComponent } from './chat-language-picker.component';

/** Composer toolbar: attach, language, recorder, live/send buttons. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-chat-input-toolbar',
  standalone: true,
  imports: [
    LucidePlus,
    LucideSquare,
    LucideArrowUp,
    LucideAudioWaveform,
    AudioRecorderComponent,
    ChatLanguagePickerComponent,
  ],
  template: `
    <div class="mt-1 flex items-center justify-between gap-2">
      <div class="flex items-center gap-1">
        <button
          type="button"
          (click)="filePicker.click()"
          class="btn btn-circle h-9 min-h-0 w-9 btn-ghost text-base-content/60 btn-sm hover:bg-base-300 hover:text-base-content"
          aria-label="Add attachment"
          title="Attach a file"
          [disabled]="disabled()"
        >
          <svg lucidePlus class="h-5 w-5"></svg>
        </button>
        <input
          #filePicker
          type="file"
          class="hidden"
          multiple
          (change)="onFilesSelected($event)"
          aria-hidden="true"
          tabindex="-1"
        />
      </div>

      <div class="flex shrink-0 items-center gap-1.5">
        <app-chat-language-picker
          [languages]="languages()"
          [selected]="selectedLang()"
          [currentFlag]="currentFlag()"
          [currentName]="currentName()"
          (pick)="languageChange.emit($event)"
        />

        <app-audio-recorder
          (audioRecorded)="audioRecorded.emit($event)"
          (recordingStateChange)="recordingStateChange.emit($event)"
          class="shrink-0"
        />

        @if (isLoading() || isPlaying()) {
          <button
            type="button"
            (click)="stop.emit()"
            class="btn btn-circle h-9 min-h-0 w-9 border-none bg-error text-error-content btn-sm hover:bg-error/85"
            title="Stop"
            aria-label="Stop generation"
          >
            <svg lucideSquare class="h-4 w-4"></svg>
          </button>
        } @else if (!recorderActive()) {
          <div class="relative h-9 w-9">
            <button
              type="button"
              (click)="liveToggled.emit()"
              class="btn absolute inset-0 btn-circle h-9 min-h-0 w-9 btn-ghost text-base-content/60 transition-all duration-200 btn-sm hover:bg-base-300 hover:text-base-content"
              [class.pointer-events-none]="canSend()"
              [class.scale-50]="canSend()"
              [class.opacity-0]="canSend()"
              [class.text-success]="isLiveActive()"
              [attr.aria-hidden]="canSend()"
              [attr.tabindex]="canSend() ? -1 : 0"
              [title]="isLiveActive() ? 'Stop live call' : 'Start live call'"
              aria-label="Toggle live call"
            >
              <svg lucideAudioWaveform class="h-5 w-5"></svg>
            </button>
            <button
              type="button"
              (click)="submitted.emit()"
              [disabled]="disabled() || isRecording()"
              class="btn absolute inset-0 btn-circle h-9 min-h-0 w-9 border-none bg-primary text-primary-content shadow-md transition-all duration-200 btn-sm hover:bg-primary/85 disabled:border disabled:border-base-300 disabled:bg-base-300 disabled:text-base-content/30 disabled:shadow-none"
              [class.pointer-events-none]="!canSend()"
              [class.scale-50]="!canSend()"
              [class.opacity-0]="!canSend()"
              [attr.aria-hidden]="!canSend()"
              [attr.tabindex]="canSend() ? 0 : -1"
              aria-label="Send message"
              title="Send (Enter)"
            >
              <svg lucideArrowUp class="h-[18px] w-[18px]"></svg>
            </button>
          </div>
        }
      </div>
    </div>
  `,
})
export class ChatInputToolbarComponent {
  readonly languages = input.required<Language[]>();
  readonly selectedLang = input.required<string>();
  readonly currentFlag = input.required<string>();
  readonly currentName = input.required<string>();
  readonly disabled = input.required<boolean>();
  readonly isLoading = input.required<boolean>();
  readonly isPlaying = input.required<boolean>();
  readonly isRecording = input.required<boolean>();
  readonly isLiveActive = input.required<boolean>();
  readonly canSend = input.required<boolean>();

  readonly filesSelected = output<File[]>();
  readonly audioRecorded = output<{ base64: string }>();
  readonly recordingStateChange = output<boolean>();
  readonly languageChange = output<string>();
  readonly stop = output<void>();
  readonly liveToggled = output<void>();
  readonly submitted = output<void>();

  private readonly recorder = viewChild(AudioRecorderComponent);

  /** True while the recorder child is capturing audio. */
  protected readonly recorderActive = computed<boolean>(
    () => this.recorder()?.isRecording() ?? false,
  );

  protected onFilesSelected(event: Event): void {
    const picker = event.target as HTMLInputElement;
    const files = picker.files ? Array.from(picker.files) : [];
    picker.value = '';
    if (files.length === 0) return;
    this.filesSelected.emit(files);
  }
}
