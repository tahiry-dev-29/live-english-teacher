/**
 * Invisible enterprise context (tasks 85/86/87): pure function.
 * Returns ONLY the context block (profile + memories + #skill tags) —
 * never the user text. The bubble and the DB store the raw message;
 * this block travels in a separate `context` transport field and is
 * seen by the LLM only, like ChatGPT/Gemini/Claude memories.
 */
export function buildInvisibleContext(
  profileCtx: string,
  memoryCtx: string,
  tagCtx: string,
): string {
  const blocks: string[] = [];
  if (profileCtx) blocks.push(profileCtx);
  if (memoryCtx)
    blocks.push(`Things to remember about the user:\n${memoryCtx}`);
  if (tagCtx) blocks.push(`[chat-skills context:]\n${tagCtx}`);
  if (blocks.length === 0) return '';
  return `[user context — apply for this chat only:]\n${blocks.join('\n\n')}`;
}
