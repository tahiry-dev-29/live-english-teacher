import { httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { API_URLS } from '@shared/constants/api-config';
import { MemoryOwnerService } from './memory-owner.service';

interface MemoryContextResponse {
  context: string;
  maxMemories: number;
}

/**
 * Prompt-ready memory string for the chat (task 105): the backend merges
 * the global memories with the current model's and formats once — the
 * frontend never formats memory text itself anymore.
 */
@Injectable({ providedIn: 'root' })
export class MemoryContextService {
  private readonly owner = inject(MemoryOwnerService);

  /** Lazy GET gate: zero requests until the chat actually needs context. */
  private readonly loadGate = signal(0);
  private readonly contextGet = httpResource<MemoryContextResponse>(() => {
    if (this.loadGate() === 0) return undefined;
    const scope = this.owner.effectiveScope();
    return {
      url: API_URLS.memoryContext,
      headers: this.owner.headers(),
      params: scope ? { model: scope } : undefined,
    };
  });

  readonly context = computed(() => this.contextGet.value()?.context ?? '');

  ensureLoaded(): void {
    if (this.loadGate() === 0) this.loadGate.set(1);
  }
}
