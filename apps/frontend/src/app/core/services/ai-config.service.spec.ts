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

  it('initializes with default provider and model signals', () => {
    expect(service.provider()).toBeTruthy();
    expect(service.selectedModel()).toBeTruthy();
    expect(service.models().length).toBeGreaterThan(0);
  });

  it('filters models by provider', () => {
    const groqModels = service.getModelsForProvider('groq');
    expect(groqModels.length).toBeGreaterThan(0);
    expect(groqModels.every((m) => m.provider === 'groq')).toBe(true);

    const geminiModels = service.getModelsForProvider('gemini');
    expect(geminiModels.length).toBeGreaterThan(0);
    expect(geminiModels.every((m) => m.provider === 'gemini')).toBe(true);
  });

  it('allows updating provider and selectedModelId signals', () => {
    service.provider.set('gemini');
    service.selectedModelId.set('gemini-2.5-flash');
    TestBed.flushEffects();

    expect(service.provider()).toBe('gemini');
    expect(service.selectedModelId()).toBe('gemini-2.5-flash');
    expect(service.selectedModel().provider).toBe('gemini');
  });
});
