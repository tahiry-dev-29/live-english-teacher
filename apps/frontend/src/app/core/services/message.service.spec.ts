import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MessageService } from './message.service';
import { Apollo } from 'apollo-angular';
import { ChatStreamService } from './chat-stream.service';
import { ChatAudioService } from './chat-audio.service';
import { of } from 'rxjs';

describe('MessageService', () => {
  let service: MessageService;
  let apolloMock: any;
  let chatStreamMock: any;
  let chatAudioMock: any;

  beforeEach(() => {
    apolloMock = {
      query: vi.fn().mockReturnValue(of({ data: { sessionMessages: [] } })),
    };

    chatStreamMock = {
      streamChat: vi.fn().mockResolvedValue({
        text: 'Hello from AI',
        sessionId: 'session-123',
      }),
    };

    chatAudioMock = {
      sendAudioMessage: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        MessageService,
        { provide: Apollo, useValue: apolloMock },
        { provide: ChatStreamService, useValue: chatStreamMock },
        { provide: ChatAudioService, useValue: chatAudioMock },
      ],
    });

    service = TestBed.inject(MessageService);
  });

  it('starts with empty messages list and not loading', () => {
    expect(service.messages()).toEqual([]);
    expect(service.loading()).toBe(false);
    expect(service.currentSessionId()).toBeNull();
  });

  it('adds user message and calls streamChat on sendTextMessage', async () => {
    const res = await service.sendTextMessage('Hi AI!', null, 'en');

    expect(res.text).toBe('Hello from AI');
    expect(res.sessionId).toBe('session-123');
    expect(chatStreamMock.streamChat).toHaveBeenCalled();
    const messages = service.messages();
    expect(messages.some((m) => m.role === 'user' && m.text === 'Hi AI!')).toBe(
      true,
    );
  });

  it('handles stream errors by displaying error message', async () => {
    chatStreamMock.streamChat.mockResolvedValueOnce({
      text: '',
      sessionId: null,
      error: { code: 'unknown', message: 'Rate limit exceeded' },
    });

    const res = await service.sendTextMessage('Hello', null, 'en');
    expect(
      service.messages().some((m) => m.role === 'ai' && m.kind === 'error'),
    ).toBe(true);
  });
});
