/**
 * Enterprise message enrichment (tasks 85/86/87): pure function.
 * Bubble keeps raw text; the backend receives profile + memories + tags.
 */
export function buildEnrichedMessage(
  content: string,
  profileCtx: string,
  memoryCtx: string,
  tagCtx: string,
): string {
  const blocks: string[] = [];
  if (profileCtx) blocks.push(profileCtx);
  if (memoryCtx)
    blocks.push(`Things to remember about the user:\n${memoryCtx}`);
  if (tagCtx) blocks.push(`[chat-skills context:]\n${tagCtx}`);
  if (blocks.length === 0) return content;
  return `${content}\n\n[user context — apply for this chat only:]\n${blocks.join('\n\n')}`;
}
