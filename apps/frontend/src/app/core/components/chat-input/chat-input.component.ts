import {
  Component,
  input,
  output,
  viewChild,
  ElementRef,
  signal,
  computed,
  effect,
  untracked,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import {
  LucidePlus,
  LucideArrowUp,
  LucideSquare,
  LucideChevronDown,
  LucideExpand,
  LucideShrink,
  LucideX,
  LucideFileText,
  LucideAudioWaveform,
} from '@lucide/angular';
import { AudioRecorderComponent } from '@features/chat-room/components/audio-recorder/audio-recorder';
import { LanguageService } from '@core/services/language.service';

export interface PromptAttachment {
  name: string;
  size: number;
  kind: string;
}

const INPUT_LONG_TEXT_THRESHOLD_PX = 96;
const INPUT_MAX_HEIGHT_PX = 200;
const INPUT_EXPANDED_HEIGHT_PX = 320;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-chat-input',
  standalone: true,
  imports: [
    LucidePlus,
    LucideArrowUp,
    LucideSquare,
    LucideChevronDown,
    LucideExpand,
    LucideShrink,
    LucideX,
    LucideFileText,
    LucideAudioWaveform,
    AudioRecorderComponent,
  ],
  template: `
    <div class="mx-auto w-full max-w-3xl min-w-0">
      <div
        class="min-w-0 rounded-[20px] border border-base-300/60 bg-base-200 px-4 pt-3 pb-2.5 shadow-lg transition-colors focus-within:border-base-content/25"
      >
        @if (attachments().length > 0) {
          <div
            class="mb-2 flex flex-wrap gap-1.5"
            role="list"
            aria-label="Attachments"
          >
            @for (file of attachments(); track $index) {
              <span
                role="listitem"
                class="inline-flex max-w-55 items-center gap-1.5 rounded-xl border border-base-300 bg-base-100 py-1 pr-1.5 pl-2.5 text-xs"
              >
                <svg
                  lucideFileText
                  class="h-3.5 w-3.5 shrink-0 text-base-content/50"
                ></svg>
                <span class="truncate font-medium text-base-content/80">{{
                  file.name
                }}</span>
                <span class="shrink-0 text-base-content/40">{{
                  formatSize(file.size)
                }}</span>
                <button
                  type="button"
                  (click)="removeAttachment($index)"
                  class="btn btn-circle h-5 min-h-0 w-5 btn-ghost text-base-content/50 btn-xs hover:text-error"
                  [attr.aria-label]="'Remove ' + file.name"
                >
                  <svg lucideX class="h-3 w-3"></svg>
                </button>
              </span>
            }
          </div>
        }

        <div class="relative">
          @if (isRecording()) {
            <div class="flex min-h-12 items-center gap-2 text-error">
              <span class="loading loading-sm loading-dots"></span>
              <span class="text-sm font-medium">Recording…</span>
            </div>
          } @else {
            <textarea
              #composer
              rows="1"
              [value]="value()"
              (input)="onInputChange($any($event.target).value)"
              (keydown)="onComposerKeydown($event)"
              placeholder="Ask anything"
              [disabled]="disabled()"
              aria-label="Message input"
              class="max-h-80 min-h-12 w-full min-w-0 resize-none border-0 bg-transparent pr-8 text-[15px] leading-6 break-words text-base-content outline-none placeholder:text-base-content/40 focus:border-0 focus:ring-0 disabled:opacity-50"
            ></textarea>
            @if (canExpand() || expanded()) {
              <button
                type="button"
                (click)="toggleExpanded()"
                class="btn absolute top-0 right-0 btn-circle h-6 min-h-0 w-6 btn-ghost text-base-content/30 btn-xs hover:text-base-content"
                [attr.aria-label]="
                  expanded() ? 'Collapse input' : 'Expand input'
                "
                [attr.aria-expanded]="expanded()"
                [title]="expanded() ? 'Collapse' : 'Expand'"
              >
                @if (expanded()) {
                  <svg lucideShrink class="h-3.5 w-3.5"></svg>
                } @else {
                  <svg lucideExpand class="h-3.5 w-3.5"></svg>
                }
              </button>
            }
          }
        </div>

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
            <!-- Language selector – Popover API (top-layer, never clipped) -->
            <button
              type="button"
              popovertarget="lang-picker"
              style="anchor-name: --lang-picker"
              class="btn h-9 min-h-0 gap-0.5 rounded-full btn-ghost px-2.5 text-xs font-medium text-base-content/60 btn-sm hover:bg-base-300 hover:text-base-content"
              aria-label="Select learning language"
              aria-haspopup="listbox"
            >
              <span class="text-sm leading-none">{{ currentFlag() }}</span>
              <span class="max-w-24 truncate">{{ currentLangName() }}</span>
              <svg
                lucideChevronDown
                class="h-3.5 w-3.5 shrink-0 opacity-60"
              ></svg>
            </button>
            <ul
              id="lang-picker"
              popover
              role="listbox"
              style="position-anchor: --lang-picker"
              class="dropdown dropdown-top dropdown-end menu max-h-64 w-60 overflow-y-auto rounded-2xl border border-base-300 bg-base-200 p-1.5 shadow-2xl"
            >
              @for (lang of languages; track lang.code) {
                <li
                  role="option"
                  [attr.aria-selected]="lang.code === selectedLangCode()"
                >
                  <button
                    type="button"
                    (click)="onLanguageChange(lang.code)"
                    class="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left"
                  >
                    <span class="flex min-w-0 items-center gap-2">
                      <span class="shrink-0">{{ lang.flag }}</span>
                      <span class="truncate text-xs font-semibold">{{
                        lang.name
                      }}</span>
                    </span>
                    @if (lang.code === selectedLangCode()) {
                      <span class="badge shrink-0 badge-xs badge-primary"
                        >Active</span
                      >
                    }
                  </button>
                </li>
              }
            </ul>
            <app-audio-recorder
              (audioRecorded)="onAudioRecorded($event)"
              (recordingStateChange)="recordingStateChange.emit($event)"
              class="shrink-0"
            />

            @if (isLoading() || isPlaying()) {
              <button
                type="button"
                (click)="onStop()"
                class="btn btn-circle h-9 min-h-0 w-9 border-none bg-error text-error-content btn-sm hover:bg-error/85"
                title="Stop"
                aria-label="Stop generation"
              >
                <svg lucideSquare class="h-4 w-4"></svg>
              </button>
            } @else if (!audioRecorder()?.isRecording()) {
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
                  [title]="
                    isLiveActive() ? 'Stop live call' : 'Start live call'
                  "
                  aria-label="Toggle live call"
                >
                  <svg lucideAudioWaveform class="h-5 w-5"></svg>
                </button>
                <button
                  type="button"
                  (click)="onSubmit()"
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

  readonly audioRecorder = viewChild(AudioRecorderComponent);
  private readonly composer =
    viewChild<ElementRef<HTMLTextAreaElement>>('composer');

  readonly expanded = signal<boolean>(false);
  readonly canExpand = signal<boolean>(false);
  readonly attachments = signal<PromptAttachment[]>([]);

  readonly canSend = computed<boolean>(() => this.value().trim().length > 0);

  currentFlag = signal<string>('🇬🇧');

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
    effect(() => {
      // Track reactive deps (value + expanded) but run autosize outside
      // the reactive context to avoid canExpand.set() triggering a new cycle.
      this.value();
      this.expanded();
      untracked(() => {
        // rAF ensures DOM height is settled after Angular updates the template
        requestAnimationFrame(() => this.autosize());
      });
    });
  }

  onLanguageChange(code: string): void {
    this.languageService.setLanguage(code);
    const lang = this.languages.find((l) => l.code === code);
    if (lang) this.currentFlag.set(lang.flag);
    // Ferme le popover après sélection
    (document.getElementById('lang-picker') as HTMLElement | null)?.hidePopover?.();
  }

  onInputChange(text: string): void {
    this.valueChange.emit(text);
    this.autosize();
  }

  onComposerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSubmit();
    }
    if (event.key === 'Escape' && this.expanded()) {
      this.expanded.set(false);
    }
  }

  onSubmit(): void {
    if (this.value().trim() && !this.disabled() && !this.isLoading()) {
      this.attachments.set([]);
      this.messageSent.emit();
      this.expanded.set(false);
    }
  }

  onAudioRecorded(event: { base64: string }): void {
    this.audioRecorded.emit(event);
  }

  onStop(): void {
    this.stop.emit();
  }

  toggleExpanded(): void {
    this.expanded.update((v) => !v);
  }

  onFilesSelected(event: Event): void {
    const picker = event.target as HTMLInputElement;
    const files = picker.files ? Array.from(picker.files) : [];
    picker.value = '';
    if (files.length === 0) return;
    this.attachments.update((current) => [
      ...current,
      ...files.map((file) => ({
        name: file.name,
        size: file.size,
        kind: file.type,
      })),
    ]);
    this.filesSelected.emit(files);
  }

  removeAttachment(index: number): void {
    this.attachments.update((current) => current.filter((_, i) => i !== index));
  }

  formatSize(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes < 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  private autosize(): void {
    const el = this.composer()?.nativeElement;
    if (!el) return;
    el.style.height = 'auto';
    const contentHeight = el.scrollHeight;
    // Use untracked so this signal write doesn't re-trigger the effect
    untracked(() => this.canExpand.set(contentHeight > INPUT_LONG_TEXT_THRESHOLD_PX));
    if (this.expanded()) {
      el.style.height = `${Math.min(
        Math.max(contentHeight, 96),
        INPUT_EXPANDED_HEIGHT_PX,
      )}px`;
      return;
    }
    el.style.height = `${Math.min(contentHeight, INPUT_MAX_HEIGHT_PX)}px`;
  }
}
