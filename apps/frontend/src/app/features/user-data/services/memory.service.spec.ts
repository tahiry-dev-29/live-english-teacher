import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { untracked } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { MemoryService } from './memory.service';
import { CookieService } from 'ngx-cookie-service';
import { API_URLS } from '@shared/constants/api-config';

/**
 * Lets a resource settle after an HttpTestingController flush.
 * `TestBed.tick()` alone is not enough: rxResource/httpResource resolve the
 * response on a real timer, and their effects only re-run on the next tick —
 * so a macrotask has to elapse between the flush and the effect pass.
 */
async function settle(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
  TestBed.tick();
}

/**
 * MemoryService is httpResource/rxResource based: reads go through HttpClient,
 * so the transport is mocked with HttpTestingController (never `fetch`).
 */
describe('MemoryService (server-backed)', () => {
  let service: MemoryService;
  let http: HttpTestingController;

  const memory = (id: string, text: string) => ({
    id,
    text,
    createdAt: '',
    updatedAt: '',
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MemoryService,
        {
          provide: CookieService,
          useValue: {
            check: vi.fn().mockReturnValue(true),
            get: vi.fn().mockReturnValue('dev-test'),
            set: vi.fn(),
          },
        },
      ],
    });
    service = TestBed.inject(MemoryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Destroy the module first: live rxResources keep firing into the shared
    // testing backend otherwise, and the next test inherits their requests.
    TestBed.resetTestingModule();
    http.verify();
  });

  it('stays idle until ensureLoaded() flips the gate', () => {
    expect(service.memories()).toEqual([]);
    http.expectNone(() => true);
  });

  it('loads memories from the API once', async () => {
    service.ensureLoaded();
    await settle();
    const req = http.expectOne(API_URLS.memories);
    expect(req.request.method).toBe('GET');
    req.flush([memory('1', 'likes tea')]);
    await settle();

    service.ensureLoaded();
    http.verify();
    expect(service.memories().length).toBe(1);
    expect(service.buildMemoryContext()).toContain('likes tea');
  });

  it('prepends a memory created by the POST action', async () => {
    service.ensureLoaded();
    await settle();
    http.expectOne(API_URLS.memories).flush([]);
    await settle();

    service.add('  new  ');
    await settle();
    const req = http.expectOne(API_URLS.memories);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ text: 'new' });
    req.flush(memory('9', 'new'));
    await settle();

    expect(service.memories()[0].id).toBe('9');
  });

  it('blocks adds when the local quota is full', () => {
    service.memories.set(
      Array.from({ length: 50 }, (_, i) => memory(`${i}`, `m${i}`)),
    );
    service.add('extra');
    http.verify();
    expect(service.isFull()).toBe(true);
  });

  it('surfaces backend-down as error without throwing', async () => {
    service.ensureLoaded();
    await settle();
    const req = http.expectOne(API_URLS.memories);
    req.flush('boom', { status: 500, statusText: 'Server Error' });
    await settle();

    // Read the error untracked: `error()` on an errored resource re-throws when
    // consumed from a reactive context.
    expect(untracked(() => service.error())).toMatch(/500/);
    expect(service.memories()).toEqual([]);
  });
});
