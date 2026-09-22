/**
 * Pure helpers for the chat composer (Task 92 split):
 * attachments, size formatting, autosize and #tag token detection.
 */
export interface PromptAttachment {
  name: string;
  size: number;
  kind: string;
}

export const INPUT_LONG_TEXT_THRESHOLD_PX = 96;
export const INPUT_MAX_HEIGHT_PX = 200;
export const INPUT_EXPANDED_HEIGHT_PX = 320;
export const INPUT_MIN_EXPANDED_HEIGHT_PX = 96;

/** Human-readable file size ('' for invalid input). */
export function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Maps File objects to display-only attachments. */
export function toAttachments(files: File[]): PromptAttachment[] {
  return files.map((file) => ({
    name: file.name,
    size: file.size,
    kind: file.type,
  }));
}

export interface TagToken {
  /** Index of the '#' char in the raw text. */
  start: number;
  /** Text typed after '#' (may be empty). */
  query: string;
}

/** Detects an in-progress `#tag` token ending at the caret, else null. */
export function findTagToken(textBeforeCaret: string): TagToken | null {
  const match = /(?:^|\s)#([A-Za-z0-9_-]*)$/.exec(textBeforeCaret);
  if (!match) return null;
  const query = match[1] ?? '';
  return { start: textBeforeCaret.length - query.length - 1, query };
}

/** Replaces the `#token` with `name ` and returns the new caret position. */
export function insertTagAtToken(
  text: string,
  tokenStart: number,
  caret: number,
  name: string,
): { text: string; caret: number } {
  const next = text.slice(0, tokenStart + 1) + name + ' ' + text.slice(caret);
  return { text: next, caret: tokenStart + name.length + 2 };
}

/** Target textarea height for a given content height. */
export function computeInputHeight(
  contentHeight: number,
  expanded: boolean,
): number {
  if (expanded) {
    return Math.min(
      Math.max(contentHeight, INPUT_MIN_EXPANDED_HEIGHT_PX),
      INPUT_EXPANDED_HEIGHT_PX,
    );
  }
  return Math.min(contentHeight, INPUT_MAX_HEIGHT_PX);
}
