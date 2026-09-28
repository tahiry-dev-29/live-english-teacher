import { SHARED_MESSAGES } from '@shared/constants';

export type MemoryScopeTab = 'global' | 'model';

/** Tab + selected model → the scope actually listed (model falls back). */
export function normalizeScope(
  tab: MemoryScopeTab,
  modelScope: string | null,
): 'global' | 'model' {
  return tab === 'model' && modelScope ? 'model' : 'global';
}

/** Human label: 'Gemini 2.5 Pro' for a model scope, 'All models' otherwise. */
export function scopeLabel(modelScope: string | null): string {
  return SHARED_MESSAGES.templates.memoryScopeLabel(modelScope);
}

/** Draft + visible tab → submittable (auth is enforced by the caller). */
export function canAddMemory(draft: string, tab: string): boolean {
  return draft.trim().length > 0 && tab.length > 0;
}

export function isEditing(editingId: string | null, itemId: string): boolean {
  return editingId !== null && editingId === itemId;
}

export function counterLabel(count: number, max: number): string {
  return `${count}/${max}`;
}
