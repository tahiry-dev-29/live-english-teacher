import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MemoryService } from './memory.service';
import { CookieService } from 'ngx-cookie-service';

function jsonResponse(data: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(data),
  } as Response;
}

describe('MemoryService (server-backed)', () => {
  let service: MemoryService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
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
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads memories from the API once', async () => {
    const fetchMock = vi
      .mocked(fetch)
      .mockResolvedValue(
        jsonResponse([
          { id: '1', text: 'likes tea', createdAt: '', updatedAt: '' },
        ]),
      );
    await service.ensureLoaded();
    await service.ensureLoaded();
    expect(service.memories().length).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(service.buildMemoryContext()).toContain('likes tea');
  });

  it('adds a memory and prepends it locally', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ id: '9', text: 'new', createdAt: '', updatedAt: '' }),
    );
    const created = await service.add('  new  ');
    expect(created?.text).toBe('new');
    expect(service.memories()[0].id).toBe('9');
  });

  it('blocks adds when the local quota is full', async () => {
    service.memories.set(
      Array.from({ length: 50 }, (_, i) => ({
        id: `${i}`,
        text: `m${i}`,
        createdAt: '',
        updatedAt: '',
      })),
    );
    expect(await service.add('extra')).toBeNull();
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });
});
