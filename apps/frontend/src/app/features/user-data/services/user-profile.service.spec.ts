import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { untracked } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { UserProfileService } from './user-profile.service';
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

/** GET via httpResource, PUT via rxResource — mocked with HttpTestingController. */
describe('UserProfileService (server-backed)', () => {
  let service: UserProfileService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
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
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Destroy the module first: live rxResources keep firing into the shared
    // testing backend otherwise, and the next test inherits their requests.
    TestBed.resetTestingModule();
    http.verify();
  });

  it('loads the profile once and exposes signals', async () => {
    service.ensureLoaded();
    await settle();
    const req = http.expectOne(API_URLS.profile);
    expect(req.request.method).toBe('GET');
    req.flush({
      displayName: 'Tahiry',
      profession: 'Teacher',
      specialization: 'kids',
    });
    await settle();

    service.ensureLoaded();
    http.verify();
    expect(service.displayName()).toBe('Tahiry');
    expect(service.hasProfile()).toBe(true);
    expect(service.buildProfileContext()).toContain('Tahiry');
  });

  it('stages instantly and persists on save', async () => {
    service.stageProfile({ displayName: 'Aina' });
    expect(service.displayName()).toBe('Aina');

    service.saveProfile();
    await settle();
    const req = http.expectOne(API_URLS.profile);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.displayName).toBe('Aina');
    req.flush(null);
    await settle();
  });

  it('returns empty context without a profile', () => {
    expect(service.buildProfileContext()).toBe('');
  });

  it('surfaces backend-down as error without throwing', async () => {
    service.ensureLoaded();
    await settle();
    http
      .expectOne(API_URLS.profile)
      .flush('boom', { status: 500, statusText: 'Server Error' });
    await settle();

    // Read the error untracked: `error()` on an errored resource re-throws when
    // consumed from a reactive context.
    expect(untracked(() => service.error())).toMatch(/500/);
    expect(service.displayName()).toBe('');
  });
});
