/**
 * Pure helpers for the chat message bubble (Task 92 split):
 * action-bar styling, clipboard, 5-line overflow measurement (task 83).
 */

/** Max visible lines for a collapsed user bubble. */
export const COLLAPSED_LINE_COUNT = 5;

/** Tailwind classes for the hover-revealed AI action bar. */
export function actionBarClasses(
  feedbackActive: boolean,
  isPlaying: boolean,
): string {
  const isVisible = feedbackActive || isPlaying;
  return [
    'mt-2 flex min-w-0 flex-wrap items-center gap-0.5 text-base-content/60',
    'opacity-0 pointer-events-none transition-opacity duration-200',
    'group-hover:opacity-100 group-hover:pointer-events-auto',
    'focus-within:opacity-100 focus-within:pointer-events-auto',
    'pointer-coarse:opacity-100 pointer-coarse:pointer-events-auto',
    isVisible ? 'opacity-100 pointer-events-auto' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

/** Copies text with a clipboard fallback for insecure contexts. */
export async function copyText(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand?.('copy');
  document.body.removeChild(textarea);
  return true;
}

export interface OverflowMeasurement {
  overflowing: boolean;
  /** Measured scrollHeight — cached to skip redundant re-measures. */
  height: number;
  /** False when nothing changed and the signal must not be written. */
  changed: boolean;
}

/**
 * Measures whether `el` overflows `maxLines`. Returns `changed: false`
 * when the height is identical to the previous measurement (avoids
 * signal write loops inside ngAfterViewChecked).
 */
export function measureOverflow(
  el: HTMLElement,
  previousHeight: number,
  maxLines = COLLAPSED_LINE_COUNT,
): OverflowMeasurement {
  const height = el.scrollHeight;
  if (height === previousHeight) {
    return { overflowing: false, height, changed: false };
  }
  const lineHeight = parseFloat(getComputedStyle(el).lineHeight || '0');
  const overflowing =
    lineHeight > 0
      ? height > lineHeight * maxLines + 2
      : height > el.clientHeight + 2;
  return { overflowing, height, changed: true };
}
