import { signal } from '@angular/core';
import { PromptTag, PromptTagService } from '@core/services/prompt-tag.service';
import { findTagToken, insertTagAtToken } from './chat-input.util';

/** Host hooks the autocomplete needs from the composer field. */
export interface TagAutocompleteHost {
  caretPosition(): number;
  focusAt(caret: number): void;
  value(): string;
}

const MAX_SUGGESTIONS = 8;

/**
 * `#tag` autocomplete (task 87) extracted from the composer component so the
 * component stays a thin view layer. Pure state + keyboard handling.
 */
export class TagAutocomplete {
  readonly suggestions = signal<PromptTag[]>([]);
  readonly activeIndex = signal<number>(0);

  private tokenStart = -1;

  constructor(
    private readonly tags: PromptTagService,
    private readonly host: TagAutocompleteHost,
  ) {}

  /** Detects an in-progress #token before the caret and suggests tags. */
  onInput(text: string): void {
    const caret = this.host.caretPosition();
    const token = findTagToken(text.slice(0, caret));
    if (!token) {
      this.clear();
      return;
    }
    this.tokenStart = token.start;
    // Server-backed tags: load once, then suggest synchronously.
    void this.tags.ensureLoaded().then(() => {
      const list =
        token.query.length === 0
          ? this.tags.allTags()
          : this.tags.suggest(token.query);
      this.suggestions.set(list.slice(0, MAX_SUGGESTIONS));
      this.activeIndex.set(0);
    });
  }

  /** Handles list navigation keys. Returns true when the event is consumed. */
  onKeydown(event: KeyboardEvent): boolean {
    if (this.suggestions().length === 0) return false;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex.update((i) =>
        Math.min(this.suggestions().length - 1, i + 1),
      );
      return true;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex.update((i) => Math.max(0, i - 1));
      return true;
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      const tag = this.suggestions()[this.activeIndex()];
      if (tag) {
        event.preventDefault();
        this.insert(tag.name, () => undefined);
        return true;
      }
    }
    if (event.key === 'Escape') {
      this.clear();
      return true;
    }
    return false;
  }

  /** Inserts `name ` at the token position, notifying the value emitter. */
  insert(name: string, emitValue: (text: string) => void): void {
    if (this.tokenStart < 0) return;
    const caret = this.host.caretPosition();
    const { text, caret: caretPos } = insertTagAtToken(
      this.host.value(),
      this.tokenStart,
      caret,
      name,
    );
    emitValue(text);
    this.clear();
    this.host.focusAt(caretPos);
  }

  clear(): void {
    this.suggestions.set([]);
    this.tokenStart = -1;
  }
}
