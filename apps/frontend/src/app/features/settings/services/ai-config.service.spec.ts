import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AiConfigService } from './ai-config.service';
import { ApiKeyService } from './api-key.service';
import { CookieService } from 'ngx-cookie-service';

describe('AiConfigService', () => {
  let service: AiConfigService;
  let cookieServiceMock: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let apiKeyServiceMock: {
    hasKey: ReturnType<typeof vi.fn>;
    getKey: ReturnType<typeof vi.fn>;
    customKeys: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    cookieServiceMock = {
      get: vi.fn().mockReturnValue(''),
      set: vi.fn(),
      delete: vi.fn(),
    };

    apiKeyServiceMock = {
      hasKey: vi.fn().mockReturnValue(false),
      getKey: vi.fn().mockReturnValue(null),
      customKeys: vi.fn().mockReturnValue({}),
    };

    TestBed.configureTestingModule({
      providers: [
        AiConfigService,
        { provide: CookieService, useValue: cookieServiceMock },
        { provide: ApiKeyService, useValue: apiKeyServiceMock },
      ],
    });

    service = TestBed.inject(AiConfigService);
    TestBed.flushEffects();
  });

  it('initializes live-only: empty models until API fetch', () => {
    expect(service.provider()).toBeTruthy();
    // Live-only: no hardcoded models, starts empty, no selection yet.
    expect(service.models().length).toBe(0);
    expect(service.selectedModel()).toBeNull();
  });

  it('filters live models by provider once loaded', () => {
    service.models.set([
      {
        id: 'live-groq-1',
        name: 'Groq Live 1',
        provider: 'groq',
        description: 'Live',
      },
      {
        id: 'live-gemini-1',
        name: 'Gemini Live 1',
        provider: 'gemini',
        description: 'Live',
      },
    ]);
    const groqModels = service.getModelsForProvider('groq');
    expect(groqModels.length).toBe(1);
    expect(groqModels.every((m) => m.provider === 'groq')).toBe(true);

    const geminiModels = service.getModelsForProvider('gemini');
    expect(geminiModels.length).toBe(1);
    expect(geminiModels.every((m) => m.provider === 'gemini')).toBe(true);
  });

  it('allows updating provider and selectedModelId signals', () => {
    service.models.set([
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        provider: 'gemini',
        description: 'Live',
      },
    ]);
    service.provider.set('gemini');
    service.selectedModelId.set('gemini-2.5-flash');
    TestBed.flushEffects();

    expect(service.provider()).toBe('gemini');
    expect(service.selectedModelId()).toBe('gemini-2.5-flash');
    expect(service.selectedModel()?.provider).toBe('gemini');
  });
});
