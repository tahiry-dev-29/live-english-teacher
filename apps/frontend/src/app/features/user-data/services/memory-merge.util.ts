import { HttpErrorResponse } from '@angular/common/http';
import { MESSAGES } from '@core/constants/messages';
import { formatHttpError } from '@core/utils/api-error.util';

export interface UserMemory {
  id: string;
  text: string;
  modelScope: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryListResponse {
  items: UserMemory[];
  maxMemories: number;
}

export interface MutationOutcome<TIntent, TValue> {
  intent: TIntent;
  value: TValue;
}

export interface RemoveIntentView {
  id: string;
  modelScope: string | null;
}

/**
 * Pure list merge for `MemoryService.memories` (task 105): server items plus
 * confirmed mutation outcomes plus optimistic remove/clear intents — only
 * when they belong to the currently viewed scope. No `effect()`, no signal
 * writes: the `linkedSignal` in the service re-derives from this alone, so a
 * failed DELETE (error set) automatically restores the row.
 */
export function mergeMemories(
  server: UserMemory[],
  scope: string | null,
  added: MutationOutcome<{ modelScope: string | null }, UserMemory> | null,
  updated: MutationOutcome<
    { id: string; modelScope: string | null },
    UserMemory
  > | null,
  removed: RemoveIntentView | null,
  removeFailed: boolean,
  clearHidden: boolean,
): UserMemory[] {
  if (clearHidden) return [];
  let list = server;
  if (
    added &&
    added.intent.modelScope === scope &&
    !list.some((m) => m.id === added.value.id)
  ) {
    list = [added.value, ...list];
  }
  if (updated && updated.intent.modelScope === scope) {
    const id = updated.intent.id;
    list = list.map((m) => (m.id === id ? updated.value : m));
  }
  if (removed && !removeFailed && removed.modelScope === scope) {
    list = list.filter((m) => m.id !== removed.id);
  }
  return list;
}

/**
 * Reads a mutation result only when safe: `value()` throws while the
 * resource is in the error state, so error reads return null and the list
 * falls back to the server truth (rollback).
 */
export function readMutationResult<
  TIntent extends { modelScope: string | null },
  TValue,
>(
  resource: { status: () => string; value: () => TValue | undefined },
  intent: TIntent | null,
): MutationOutcome<TIntent, TValue> | null {
  if (!intent || resource.status() === 'error') return null;
  const value = resource.value();
  return value === undefined ? null : { intent, value };
}

/** Shared-message error text for a failed GET (never hardcoded here). */
export function readResourceError(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof HttpErrorResponse) return formatHttpError(error);
  return error instanceof Error
    ? error.message || MESSAGES.error.aiServiceError
    : MESSAGES.error.aiServiceError;
}
