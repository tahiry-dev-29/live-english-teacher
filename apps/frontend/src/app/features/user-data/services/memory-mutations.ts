import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { API_URLS, DYNAMIC_ENDPOINTS } from '@shared/constants/api-config';
import type { UserMemory } from './memory-merge.util';

export interface AddMemoryIntent {
  text: string;
  /** Null = global memory, otherwise the `provider:modelId` scope. */
  modelScope: string | null;
  headers: Record<string, string>;
}

export interface UpdateMemoryIntent {
  id: string;
  text: string;
  modelScope: string | null;
  headers: Record<string, string>;
}

export interface RemoveMemoryIntent {
  id: string;
  modelScope: string | null;
  headers: Record<string, string>;
}

export interface ClearMemoriesIntent {
  modelScope: string | null;
  headers: Record<string, string>;
}

/**
 * Intent-driven memory mutations (task 105). `HttpClient` lives ONLY here —
 * always inside an `rxResource` `stream` loader, never called directly.
 * A null intent means idle: no mutation self-executes on inject, each one
 * fires exactly once per explicit `request*()` call.
 */
@Injectable({ providedIn: 'root' })
export class MemoryMutationsService {
  private readonly http = inject(HttpClient);

  private readonly addIntentSignal = signal<AddMemoryIntent | null>(null);
  readonly addIntent = this.addIntentSignal.asReadonly();
  readonly addResult = rxResource({
    // Null params would read as a request and POST on init — force undefined.
    params: () => this.addIntentSignal() ?? undefined,
    stream: ({ params }) =>
      this.http.post<UserMemory>(
        API_URLS.memories,
        {
          text: params.text,
          scope: params.modelScope ? 'model' : 'global',
        },
        { headers: params.headers },
      ),
  });

  private readonly updateIntentSignal = signal<UpdateMemoryIntent | null>(null);
  readonly updateIntent = this.updateIntentSignal.asReadonly();
  readonly updateResult = rxResource({
    params: () => this.updateIntentSignal() ?? undefined,
    stream: ({ params }) =>
      this.http.patch<UserMemory>(
        DYNAMIC_ENDPOINTS.memoryById(params.id),
        { text: params.text },
        { headers: params.headers },
      ),
  });

  private readonly removeIntentSignal = signal<RemoveMemoryIntent | null>(null);
  readonly removeIntent = this.removeIntentSignal.asReadonly();
  readonly removeResult = rxResource({
    params: () => this.removeIntentSignal() ?? undefined,
    stream: ({ params }) =>
      this.http.delete<void>(DYNAMIC_ENDPOINTS.memoryById(params.id), {
        headers: params.headers,
      }),
  });

  private readonly clearIntentSignal = signal<ClearMemoriesIntent | null>(null);
  private readonly clearNonceSignal = signal(0);
  readonly clearIntent = this.clearIntentSignal.asReadonly();
  readonly clearNonce = this.clearNonceSignal.asReadonly();
  readonly clearResult = rxResource({
    params: () => {
      const intent = this.clearIntentSignal();
      const nonce = this.clearNonceSignal();
      return intent && nonce > 0 ? { ...intent, nonce } : undefined;
    },
    stream: ({ params }) =>
      this.http.delete<void>(API_URLS.memories, {
        headers: params.headers,
      }),
  });

  requestAdd(intent: AddMemoryIntent): void {
    this.dismissClear();
    this.addIntentSignal.set(intent);
  }

  requestUpdate(intent: UpdateMemoryIntent): void {
    this.dismissClear();
    this.updateIntentSignal.set(intent);
  }

  requestRemove(intent: RemoveMemoryIntent): void {
    this.dismissClear();
    this.removeIntentSignal.set(intent);
  }

  requestClear(intent: ClearMemoriesIntent): void {
    this.clearIntentSignal.set(intent);
    this.clearNonceSignal.update((n) => n + 1);
  }

  /** Any new item supersedes a pending clear-all view. */
  private dismissClear(): void {
    this.clearIntentSignal.set(null);
    this.clearNonceSignal.set(0);
  }
}
