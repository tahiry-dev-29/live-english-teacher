import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { MemoryService } from './memory.service';
// @ts-expect-error - Vite ?raw import (vitest only, specs excluded from tsc)
import serviceSource from './memory.service.ts?raw';
import { MemoryMutationsService } from './memory-mutations';
import { MemoryOwnerService } from './memory-owner.service';
import { NotificationService } from './notification.service';
import { AiConfigService } from '@features/settings/services/ai-config.service';
import { CookieService } from 'ngx-cookie-service';
import { LoggingService } from '@core/services/logging.service';
import { SHARED_MESSAGES } from '@shared/constants';
import { API_URLS } from '@shared/constants/api-config';
import { apiErrorInterceptor } from '@core/interceptors/http-error.interceptor';

/**
 * Lets a resource settle after an HttpTestingController flush.
 * `TestBed.tick()` alone is not enough: resources resolve the response on a
 * real timer, so a macrotask has to elapse between flush and re-derivation.
 */
async function settle(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
  TestBed.tick();
}

/**
 * MemoryService (task 105): scoped GET envelope, intent mutations, pure
 * linkedSignal merge — reads go through HttpClient, mocked with
 * HttpTestingController (never `fetch`).
 */
describe('MemoryService (scoped, intent-driven)', () => {
  let service: MemoryService;
  let mutations: MemoryMutationsService;
  let owner: MemoryOwnerService;
  let notifications: NotificationService;
  let http: HttpTestingController;
  let selectedModelId: ReturnType<typeof signal<string>>;

  const row = (id: string, text: string, modelScope: string | null = null) => ({
    id,
    text,
    modelScope,
    createdAt: '',
    updatedAt: '',
  });

  const flushList = async (items: ReturnType<typeof row>[]) => {
    await settle();
    const req = http.expectOne(
      (r) => r.url === API_URLS.memories && r.method === 'GET',
    );
    req.flush({ items, maxMemories: 50 });
    await settle();
    return req;
  };

  beforeEach(() => {
    selectedModelId = signal('');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        MemoryService,
        {
          provide: AiConfigService,
          useValue: { provider: signal('groq'), selectedModelId },
        },
        {
          provide: CookieService,
          useValue: {
            check: vi.fn().mockReturnValue(false),
            get: vi.fn().mockReturnValue(''),
            set: vi.fn(),
          },
        },
        {
          provide: LoggingService,
          useValue: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
        },
      ],
    });
    service = TestBed.inject(MemoryService);
    mutations = TestBed.inject(MemoryMutationsService);
    owner = TestBed.inject(MemoryOwnerService);
    notifications = TestBed.inject(NotificationService);
    http = TestBed.inject(HttpTestingController);
    owner.ownerId.set('u1');
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    http.verify();
  });

  it('fires zero requests on construction (lazy gate)', () => {
    expect(service.memories()).toEqual([]);
    http.expectNone(() => true);
  });

  it('leaves every mutation idle until an intent is set', () => {
    expect(mutations.addResult.status()).toBe('idle');
    expect(mutations.updateResult.status()).toBe('idle');
    expect(mutations.removeResult.status()).toBe('idle');
    expect(mutations.clearResult.status()).toBe('idle');
    http.expectNone(
      (r) =>
        r.method === 'POST' || r.method === 'PATCH' || r.method === 'DELETE',
    );
  });

  it('loads globals + current model with the server-exposed max', async () => {
    owner.scopeTab.set('model');
    selectedModelId.set('gpt-4o');
    service.ensureLoaded();
    const req = await flushList([
      row('1', 'global fact'),
      row('2', 'model fact', 'groq:gpt-4o'),
    ]);
    expect(req.request.params.get('model')).toBe('groq:gpt-4o');
    expect(service.memories().length).toBe(2);
    expect(service.maxMemories()).toBe(50);
    expect(service.count()).toBe(2);
  });

  it('reloads when the selected model changes', async () => {
    owner.scopeTab.set('model');
    selectedModelId.set('gpt-4o');
    service.ensureLoaded();
    await flushList([
      row('1', 'global fact'),
      row('2', 'old model', 'groq:gpt-4o'),
    ]);
    expect(service.memories().length).toBe(2);

    selectedModelId.set('llama-3');
    const req = await flushList([
      row('1', 'global fact'),
      row('3', 'new model', 'groq:llama-3'),
    ]);
    expect(req.request.params.get('model')).toBe('groq:llama-3');
    expect(
      service
        .memories()
        .map((m) => m.id)
        .sort(),
    ).toEqual(['1', '3']);
  });

  it('refuses guest writes with a warning and zero requests', () => {
    owner.ownerId.set(null);
    service.add('x');
    service.update('1', 'y');
    service.remove('1');
    service.clear();
    http.expectNone(
      (r) =>
        r.method === 'POST' || r.method === 'PATCH' || r.method === 'DELETE',
    );
    const warnings = notifications
      .notifications()
      .filter((n) => n.type === 'warning');
    expect(warnings.length).toBe(4);
    expect(warnings[0].message).toBe(SHARED_MESSAGES.error.authRequired);
  });

  it('warns on a full list without firing a request', async () => {
    service.ensureLoaded();
    await flushList(Array.from({ length: 50 }, (_, i) => row(`${i}`, `m${i}`)));
    expect(service.isFull()).toBe(true);
    service.add('extra');
    http.expectNone((r) => r.method === 'POST');
    const warnings = notifications
      .notifications()
      .filter((n) => n.type === 'warning');
    expect(warnings.length).toBe(1);
    expect(warnings[0].message).toBe(
      SHARED_MESSAGES.error.memoryQuotaReached(50, 50),
    );
  });

  it('posts text + scope and merges the created row', async () => {
    service.ensureLoaded();
    await flushList([row('1', 'global fact')]);

    service.add('  fresh  ');
    await settle();
    const req = http.expectOne(API_URLS.memories);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ text: 'fresh', scope: 'global' });
    req.flush(row('9', 'fresh'));
    await settle();

    expect(service.memories()[0].id).toBe('9');
    expect(mutations.addResult.status()).toBe('resolved');
  });

  it('restores an optimistic remove and toasts on DELETE 500', async () => {
    service.ensureLoaded();
    await flushList([row('1', 'keep me')]);

    service.remove('1');
    expect(service.memories()).toEqual([]);

    await settle();
    const req = http.expectOne(
      (r) => r.method === 'DELETE' && r.url.endsWith('/user/memories/1'),
    );
    req.flush('boom', { status: 500, statusText: 'Server Error' });
    await settle();

    expect(service.memories().map((m) => m.id)).toEqual(['1']);
    const errors = notifications
      .notifications()
      .filter((n) => n.type === 'error');
    expect(errors.length).toBe(1);
  });

  it('merges a patched row in place', async () => {
    service.ensureLoaded();
    await flushList([row('1', 'old')]);

    service.update('1', 'new');
    await settle();
    const req = http.expectOne(
      (r) => r.method === 'PATCH' && r.url.endsWith('/user/memories/1'),
    );
    expect(req.request.body).toEqual({ text: 'new' });
    req.flush(row('1', 'new'));
    await settle();

    expect(service.memories()[0].text).toBe('new');
  });

  it('derives the list with linkedSignal — no merge effects or subscriptions', () => {
    const source = serviceSource as string;
    expect(source).toMatch(/linkedSignal/);
    expect(source).not.toMatch(/[^a-zA-Z]effect\s*\(/);
    expect(source).not.toMatch(/\.subscribe\s*\(/);
    expect(source).not.toMatch(/ngOnChanges|OnDestroy/);
  });
});
