/**
 * Keeps stored/displayed history clean: the DB and the UI only ever see
 * the raw user message. The invisible context (profile/memories/#tags)
 * is appended for the LLM call alone — never persisted.
 */
export function combineMessageWithContext(
  message: string,
  context?: string,
): string {
  const ctx = (context ?? '').trim();
  if (!ctx) return message;
  return `${message}\n\n[user context — apply for this chat only:]\n${ctx}`;
}
