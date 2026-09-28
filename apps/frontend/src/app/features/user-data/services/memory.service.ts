import { httpResource } from '@angular/common/http';
import {
  Injectable,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { API_URLS } from '@shared/constants/api-config';
import {
  mergeMemories,
  readMutationResult,
  readResourceError,
  type MemoryListResponse,
} from './memory-merge.util';
import { MemoryMutationsService } from './memory-mutations';
import { MemoryOwnerService } from './memory-owner.service';

/** Server-backed memories (tasks 85/105): GET resource, intent mutations,
 * pure `linkedSignal` list — no state-sync effects, no local quota constant. */
@Injectable({ providedIn: 'root' })
export class MemoryService {
  private readonly owner = inject(MemoryOwnerService);
  private readonly mutations = inject(MemoryMutationsService);

  /** Lazy GET gate: resource stays idle until ensureLoaded() flips it. */
  private readonly loadGate = signal(0);
  private readonly memoriesGet = httpResource<MemoryListResponse>(() => {
    if (this.loadGate() === 0) return undefined;
    const scope = this.owner.effectiveScope();
    return {
      url: API_URLS.memories,
      headers: this.owner.headers(),
      params: scope ? { model: scope } : undefined,
    };
  });

  readonly error = computed<string | null>(() =>
    readResourceError(this.memoriesGet.error()),
  );
  readonly maxMemories = computed(
    () => this.memoriesGet.value()?.maxMemories ?? 0,
  );
  readonly count = computed(() => this.memories().length);
  readonly isFull = computed(
    () => this.maxMemories() > 0 && this.count() >= this.maxMemories(),
  );

  /** Server list + confirmed results + optimistic intents, scope-matched. */
  readonly memories = linkedSignal(() =>
    mergeMemories(
      this.memoriesGet.value()?.items ?? [],
      this.owner.effectiveScope(),
      readMutationResult(this.mutations.addResult, this.mutations.addIntent()),
      readMutationResult(
        this.mutations.updateResult,
        this.mutations.updateIntent(),
      ),
      this.mutations.removeIntent(),
      this.mutations.removeResult.error() !== undefined,
      this.clearHidden(),
    ),
  );

  /** Flip the gate: first call fires the GET, later calls are no-ops. */
  ensureLoaded(): void {
    if (this.loadGate() === 0) this.loadGate.set(1);
  }

  /** Reload the GET resource (retry button). */
  load(): void {
    this.ensureLoaded();
    this.memoriesGet.reload();
  }

  add(text: string): void {
    const clean = text.trim();
    if (!clean || !this.owner.checkWrite()) return;
    if (this.isFull()) {
      this.owner.notifyQuotaReached(this.count(), this.maxMemories());
      return;
    }
    this.mutations.requestAdd({ text: clean, ...this.intentBase() });
  }

  update(id: string, text: string): void {
    const clean = text.trim();
    if (!clean || !this.owner.checkWrite()) return;
    this.mutations.requestUpdate({ id, text: clean, ...this.intentBase() });
  }

  remove(id: string): void {
    if (!this.owner.checkWrite()) return;
    this.mutations.requestRemove({ id, ...this.intentBase() });
  }

  clear(): void {
    if (!this.owner.checkWrite()) return;
    this.mutations.requestClear(this.intentBase());
  }

  private intentBase() {
    return {
      modelScope: this.owner.effectiveScope(),
      headers: this.owner.headers(),
    };
  }

  private clearHidden(): boolean {
    const intent = this.mutations.clearIntent();
    return (
      this.mutations.clearNonce() > 0 &&
      this.mutations.clearResult.error() === undefined &&
      intent?.modelScope === this.owner.effectiveScope()
    );
  }
}
