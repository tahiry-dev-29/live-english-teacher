/**
 * Chat title derivation (Task 82): first-message auto-title, pure function.
 */
export function generateChatTitle(text: string): string {
  if (!text) return 'New Chat';
  let title = text.replace(/[\r\n]+/g, ' ').trim();
  if (title.length > 50) {
    title = title.substring(0, 47) + '...';
  }
  if (title.length > 0) {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }
  return title || 'New Chat';
}
