/**
 * Pure helpers for AI-generated session titles.
 * No NestJS dependency — unit-testable in isolation.
 */
export function buildTitlePrompt(message: string): string {
  const snippet = message
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, 500);
  return (
    'Generate a short chat title (max 6 words, no quotes, no emoji, ' +
    'same language as the message) for this first user message: ' +
    `"""${snippet}"""`
  );
}

export function sanitizeTitle(raw: string, fallback: string): string {
  let title = (raw ?? '').replace(/[\r\n]+/g, ' ').trim();
  title = title.replace(/^["'«»“”‘’]+|["'«»“”‘’.,;:!…]+$/g, '').trim();
  if (title.length > 60) title = title.slice(0, 57).trimEnd() + '...';
  return title || fallback;
}

export function fallbackTitle(message: string): string {
  const clean = message.replace(/[\r\n]+/g, ' ').trim();
  if (!clean) return 'New Conversation';
  return clean.length > 50 ? clean.slice(0, 47).trimEnd() + '...' : clean;
}
