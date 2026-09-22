import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';
import { CookieService } from 'ngx-cookie-service';
import { DOCUMENT } from '@angular/common';

describe('ThemeService', () => {
  let service: ThemeService;
  let cookieServiceMock: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let mockDoc: Document;

  beforeEach(() => {
    cookieServiceMock = {
      get: vi.fn().mockReturnValue(''),
      set: vi.fn(),
      delete: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ThemeService,
        { provide: CookieService, useValue: cookieServiceMock },
      ],
    });

    service = TestBed.inject(ThemeService);
    mockDoc = TestBed.inject(DOCUMENT);
    TestBed.flushEffects();
  });

  it('initializes with default values', () => {
    expect(['light', 'dark', 'system']).toContain(service.theme());
    expect(['small', 'medium', 'large', 'custom']).toContain(
      service.fontSize(),
    );
  });

  it('updates theme signal and root attribute when setTheme is called', () => {
    service.setTheme('dark');
    TestBed.flushEffects();
    expect(service.theme()).toBe('dark');
    expect(mockDoc.documentElement.getAttribute('data-theme')).toContain(
      'dark',
    );

    service.setTheme('light');
    TestBed.flushEffects();
    expect(service.theme()).toBe('light');
    expect(mockDoc.documentElement.getAttribute('data-theme')).toContain(
      'light',
    );
  });

  it('updates font size signal and document style', () => {
    service.setFontSize('large');
    TestBed.flushEffects();
    expect(service.fontSize()).toBe('large');

    service.setFontSize('small');
    TestBed.flushEffects();
    expect(service.fontSize()).toBe('small');
  });

  it('updates font family signal', () => {
    service.setFontFamily('serif');
    TestBed.flushEffects();
    expect(service.fontFamily()).toBe('serif');

    service.setFontFamily('mono');
    TestBed.flushEffects();
    expect(service.fontFamily()).toBe('mono');
  });
});
