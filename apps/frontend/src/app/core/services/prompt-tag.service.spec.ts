import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PromptTagService } from './prompt-tag.service';
import { CookieService } from 'ngx-cookie-service';

function jsonResponse(data: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(data),
  } as Response;
}

const DEFAULTS = [
  { name: 'exam', description: 'Exam prep', systemPrompt: 'Grade strictly.' },
  { name: 'spoken', description: 'Casual chat', systemPrompt: 'Be friendly.' },
];

describe('PromptTagService (server-backed)', () => {
  let service: PromptTagService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PromptTagService,
        {
          provide: CookieService,
          useValue: { check: vi.fn().mockReturnValue(true), get: vi.fn().mockReturnValue('dev-test'), set: vi.fn() },
        },
      ],
    });
    service = TestBed.inject(PromptTagService);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads defaults and custom tags once', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        defaults: DEFAULTS,
        custom: [{ name: 'mine', description: 'd', systemPrompt: 'd' }],
      }),
    );
    await service.ensureLoaded();
    await service.ensureLoaded();
    expect(service.allTags().length).toBe(3);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('suggests and extracts tags from loaded state', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ defaults: DEFAULTS, custom: [] }),
    );
    await service.ensureLoaded();
    expect(service.suggest('ex').map((t) => t.name)).toEqual(['exam']);
    expect(service.extractTags('hello #spoken world')).toEqual(['spoken']);
    expect(service.buildSystemPrompt('go #exam')).toContain('Grade strictly.');
  });

  it('adds a custom tag and flags it', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ defaults: DEFAULTS, custom: [] }))
      .mockResolvedValueOnce(
        jsonResponse({ name: 'foo', description: 'bar', systemPrompt: 'bar' }),
      );
    await service.ensureLoaded();
    const created = await service.addCustom('#foo', 'bar');
    expect(created?.custom).toBe(true);
    expect(service.customTags().length).toBe(1);
  });
});
