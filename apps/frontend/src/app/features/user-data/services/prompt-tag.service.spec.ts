import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { untracked } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { PromptTagService } from './prompt-tag.service';
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

const DEFAULTS = [
  { name: 'exam', description: 'Exam prep', systemPrompt: 'Grade strictly.' },
  { name: 'spoken', description: 'Casual chat', systemPrompt: 'Be friendly.' },
];

/** GET via httpResource, POST via rxResource — mocked with HttpTestingController. */
describe('PromptTagService (server-backed)', () => {
  let service: PromptTagService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PromptTagService,
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
    service = TestBed.inject(PromptTagService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Destroy the module first: live rxResources keep firing into the shared
    // testing backend otherwise, and the next test inherits their requests.
    TestBed.resetTestingModule();
    http.verify();
  });

  const load = async (custom: unknown[] = []) => {
    service.ensureLoaded();
    await settle();
    http.expectOne(API_URLS.tags).flush({ defaults: DEFAULTS, custom });
    await settle();
  };

  it('loads defaults and custom tags once', async () => {
    await load([{ name: 'mine', description: 'd', systemPrompt: 'd' }]);
    service.ensureLoaded();
    http.verify();
    expect(service.allTags().length).toBe(3);
    expect(service.customTags().length).toBe(1);
  });

  it('suggests and extracts tags from loaded state', async () => {
    await load();
    expect(service.suggest('ex').map((t) => t.name)).toEqual(['exam']);
    expect(service.extractTags('hello #spoken world')).toEqual(['spoken']);
    expect(service.buildSystemPrompt('go #exam')).toContain('Grade strictly.');
  });

  it('surfaces backend-down as error without throwing', async () => {
    service.ensureLoaded();
    await settle();
    http
      .expectOne(API_URLS.tags)
      .flush('boom', { status: 500, statusText: 'Server Error' });
    await settle();

    // Read the error untracked: `error()` on an errored resource re-throws when
    // consumed from a reactive context.
    expect(untracked(() => service.error())).toMatch(/500/);
    expect(service.allTags()).toEqual([]);
  });

  it('adds a custom tag and flags it', async () => {
    await load();
    service.addCustom('foo', 'bar');
    await settle();
    const req = http.expectOne(API_URLS.tags);
    expect(req.request.method).toBe('POST');
    req.flush({ name: 'foo', description: 'bar', systemPrompt: 'bar' });
    await settle();

    expect(service.customTags().length).toBe(1);
    expect(service.customTags()[0].custom).toBe(true);
  });
});
