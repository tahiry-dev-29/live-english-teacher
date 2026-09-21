import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { UserProfileService } from './user-profile.service';
import { CookieService } from 'ngx-cookie-service';

function jsonResponse(data: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(data),
  } as Response;
}

describe('UserProfileService (server-backed)', () => {
  let service: UserProfileService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UserProfileService,
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
    service = TestBed.inject(UserProfileService);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads the profile once and exposes signals', async () => {
    const fetchMock = vi
      .mocked(fetch)
      .mockResolvedValue(
        jsonResponse({
          displayName: 'Tahiry',
          profession: 'Teacher',
          specialization: 'kids',
        }),
      );
    await service.ensureLoaded();
    await service.ensureLoaded();
    expect(service.displayName()).toBe('Tahiry');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(service.buildProfileContext()).toContain('Tahiry');
  });

  it('stages instantly and persists on save', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}));
    service.stageProfile({ displayName: 'Aina' });
    expect(service.displayName()).toBe('Aina');
    await service.saveProfile();
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/user/profile'),
      expect.objectContaining({ method: 'PUT' }),
    );
  });

  it('returns empty context without a profile', () => {
    expect(service.buildProfileContext()).toBe('');
  });
});
