import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MessageService } from './message.service';
import { Apollo } from 'apollo-angular';
import { ChatStreamService } from './chat-stream.service';
import { ChatAudioService } from './chat-audio.service';
import { PromptTagService } from '@features/user-data/services/prompt-tag.service';
import { MemoryService } from '@features/user-data/services/memory.service';
import { UserProfileService } from '@features/user-data/services/user-profile.service';
import { of } from 'rxjs';

interface MockApollo {
  query: ReturnType<typeof vi.fn>;
  mutate: ReturnType<typeof vi.fn>;
}

interface MockChatStream {
  streamChat: ReturnType<typeof vi.fn>;
}

interface MockChatAudio {
  sendAudio: ReturnType<typeof vi.fn>;
}

describe('MessageService', () => {
  let service: MessageService;
  let apolloMock: MockApollo;
  let chatStreamMock: MockChatStream;
  let chatAudioMock: MockChatAudio;

  beforeEach(() => {
    apolloMock = {
      query: vi.fn().mockReturnValue(of({ data: { sessionMessages: [] } })),
      mutate: vi.fn(),
    };

    chatStreamMock = {
      streamChat: vi.fn().mockResolvedValue({
        text: 'Hello from AI',
        sessionId: 'session-123',
      }),
    };

    chatAudioMock = {
      sendAudio: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        MessageService,
        { provide: Apollo, useValue: apolloMock },
        { provide: ChatStreamService, useValue: chatStreamMock },
        { provide: ChatAudioService, useValue: chatAudioMock },
        {
          provide: PromptTagService,
          useValue: {
            ensureLoaded: vi.fn().mockResolvedValue(undefined),
            buildSystemPrompt: vi.fn().mockReturnValue(''),
          },
        },
        {
          provide: MemoryService,
          useValue: {
            ensureLoaded: vi.fn().mockResolvedValue(undefined),
            buildMemoryContext: vi.fn().mockReturnValue(''),
          },
        },
        {
          provide: UserProfileService,
          useValue: {
            ensureLoaded: vi.fn().mockResolvedValue(undefined),
            buildProfileContext: vi.fn().mockReturnValue(''),
          },
        },
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
    // Raw text on the wire: no context block is ever mixed into `message`.
    const [req] = chatStreamMock.streamChat.mock.calls[0] as [
      { message: string; context: string },
    ];
    expect(req.message).toBe('Hi AI!');
    expect(req.message).not.toContain('user context');
    const messages = service.messages();
    expect(messages.some((m) => m.role === 'user' && m.text === 'Hi AI!')).toBe(
      true,
    );
  });

  it('sends profile/memory/tag context in a separate invisible field', async () => {
    const tags = TestBed.inject(PromptTagService);
    const memories = TestBed.inject(MemoryService);
    const profile = TestBed.inject(UserProfileService);
    vi.mocked(tags.buildSystemPrompt).mockReturnValue('[correction: …]');
    vi.mocked(memories.buildMemoryContext).mockReturnValue('likes tea');
    vi.mocked(profile.buildProfileContext).mockReturnValue('About: Tahiry');

    await service.sendTextMessage('#correction teste', null, 'en');

    const [req] = chatStreamMock.streamChat.mock.calls[0] as [
      { message: string; context: string },
    ];
    // Bubble + stored message stay exactly what the user typed.
    expect(req.message).toBe('#correction teste');
    expect(service.messages().some((m) => m.text === '#correction teste')).toBe(
      true,
    );
    // Context travels apart and carries every invisible block.
    expect(req.context).toContain('About: Tahiry');
    expect(req.context).toContain('likes tea');
    expect(req.context).toContain('[correction: …]');
  });

  it('handles stream errors by displaying error message', async () => {
    chatStreamMock.streamChat.mockResolvedValueOnce({
      text: '',
      sessionId: null,
      error: { code: 'unknown', message: 'Rate limit exceeded' },
    });

    const res = await service.sendTextMessage('Hello', null, 'en');
    // The formatted API error is surfaced to the caller and pushed as an
    // error bubble in the thread (kind: 'error').
    expect(res.text).toBe('Rate limit exceeded');
    expect(
      service.messages().some((m) => m.role === 'ai' && m.kind === 'error'),
    ).toBe(true);
  });

  it('streams tokens into a live bubble and clears streaming at the end', async () => {
    chatStreamMock.streamChat.mockImplementationOnce(
      async (
        _req: unknown,
        onToken: (token: string) => void,
      ): Promise<{ text: string; sessionId: string | null }> => {
        onToken('Hel');
        expect(service.streaming()).toBe(true);
        onToken('lo');
        return { text: 'Hello', sessionId: 'session-123' };
      },
    );

    const res = await service.sendTextMessage('Hi AI!', null, 'en');

    expect(res.text).toBe('Hello');
    expect(service.streaming()).toBe(false);
    expect(service.loading()).toBe(false);
    const ai = service.messages().filter((m) => m.role === 'ai');
    expect(ai.some((m) => m.text === 'Hello')).toBe(true);
  });
});
