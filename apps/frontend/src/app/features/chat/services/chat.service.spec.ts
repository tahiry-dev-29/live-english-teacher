import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ChatService } from './chat.service';
import { MessageService } from './message.service';
import { Apollo } from 'apollo-angular';
import { LoggingService } from '@core/services/logging.service';
import { throwError, of } from 'rxjs';

const SESSIONS = [
  {
    id: 's1',
    title: 'Hello',
    learningLanguage: 'en',
    isPinned: false,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    lastMessage: 'hi',
  },
];

function flushMicrotasks(times = 5): Promise<void> {
  let p = Promise.resolve();
  for (let i = 0; i < times; i++) {
    p = p.then(() => undefined);
  }
  return p;
}

async function settle(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await flushMicrotasks(3);
    TestBed.flushEffects?.();
  }
}

describe('ChatService sessionsResource', () => {
  let apolloMock: { query: ReturnType<typeof vi.fn>; mutate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    apolloMock = {
      query: vi.fn().mockReturnValue(of({ data: { getSessions: SESSIONS } })),
      mutate: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ChatService,
        { provide: Apollo, useValue: apolloMock },
        { provide: MessageService, useValue: {} },
        {
          provide: LoggingService,
          useValue: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
        },
      ],
    });
  });

  it('clears isLoading and keeps sessions when a reload fails (no CD-breaking throw)', async () => {
    const service = TestBed.inject(ChatService);

    service.loadSessions();
    await settle();

    expect(service.sessionsResource.isLoading()).toBe(false);
    expect(service.sessions()).toEqual(SESSIONS);

    apolloMock.query.mockReturnValueOnce(
      throwError(() => new Error('network down')),
    );

    service.sessionsResource.reload();
    await settle();

    expect(service.sessionsResource.isLoading()).toBe(false);
    expect(service.sessionsResource.status()).toBe('error');
    // Regression: value() throws ResourceValueError on error — sessions must not.
    expect(() => service.sessions()).not.toThrow();
    expect(service.sessions()).toEqual(SESSIONS);
  });

  it('clears isLoading after a successful reload', async () => {
    const service = TestBed.inject(ChatService);

    service.loadSessions();
    await settle();

    service.sessionsResource.reload();
    await settle();

    expect(service.sessionsResource.isLoading()).toBe(false);
    expect(service.sessionsResource.status()).toBe('resolved');
    expect(service.sessions()).toEqual(SESSIONS);
  });
});
