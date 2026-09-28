import { Session } from '@models/session.model';

/** Sort criterion for the sidebar session list. */
export type SessionSortBy = 'activity' | 'created' | 'name';

/** Returns a new array sorted by the active criterion (never mutates input). */
export function sortSessions(list: Session[], sort: SessionSortBy): Session[] {
  return [...list].sort((a, b) => {
    if (sort === 'name') return a.title.localeCompare(b.title);
    if (sort === 'created') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    const dateA = new Date(a.updatedAt || a.createdAt).getTime();
    const dateB = new Date(b.updatedAt || b.createdAt).getTime();
    return dateB - dateA;
  });
}

/** Case-insensitive title filter for the command-palette search modal. */
export function filterSessionsByTitle(
  list: Session[],
  term: string,
): Session[] {
  const needle = term.trim().toLowerCase();
  if (!needle) return list;
  return list.filter((session) => session.title.toLowerCase().includes(needle));
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Highlights `term` matches inside a session title (escaped HTML + mark). */
export function highlightSessionTitle(title: string, term: string): string {
  const needle = term.trim().toLowerCase();
  if (!needle) return escapeHtml(title);
  const lower = title.toLowerCase();
  let out = '';
  let i = 0;
  for (;;) {
    const idx = lower.indexOf(needle, i);
    if (idx < 0) return out + escapeHtml(title.slice(i));
    out += escapeHtml(title.slice(i, idx));
    out += `<mark class="rounded-sm bg-primary/30 text-inherit">${escapeHtml(title.slice(idx, idx + needle.length))}</mark>`;
    i = idx + needle.length;
  }
}
