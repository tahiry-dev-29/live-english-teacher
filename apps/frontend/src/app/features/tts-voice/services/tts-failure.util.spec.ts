import { describe, it, expect } from 'vitest';
import { toTtsFailure, ttsFailureText } from './tts-failure.util';

describe('ttsFailureText', () => {
  it('maps a known code to the shared curated text', () => {
    const text = ttsFailureText('QUOTA_EXCEEDED', 'elevenlabs');
    expect(text.startsWith('ELEVENLABS: ')).toBe(true);
    expect(text).toContain('Settings > Voices');
  });

  it('falls back to the generic message for an unknown code', () => {
    expect(ttsFailureText('SOMETHING_NEW', 'openai')).toContain(
      'AI service is currently unavailable',
    );
  });

  it('falls back when no code is provided (network failure)', () => {
    expect(ttsFailureText(undefined)).toContain(
      'AI service is currently unavailable',
    );
  });
});

describe('toTtsFailure', () => {
  it('prefers the server message (never hides the real cause)', () => {
    const failure = toTtsFailure({
      statusCode: 429,
      code: 'QUOTA_EXCEEDED',
      provider: 'elevenlabs',
      message: 'ELEVENLABS: quota exhausted, 1 credit left',
    });
    expect(failure.ok).toBe(false);
    expect(failure.code).toBe('QUOTA_EXCEEDED');
    expect(failure.provider).toBe('elevenlabs');
    expect(failure.message).toBe('ELEVENLABS: quota exhausted, 1 credit left');
  });

  it('rebuilds a message from the code when the server omits it', () => {
    const failure = toTtsFailure({
      code: 'MISSING_API_KEY',
      provider: 'openai',
    });
    expect(failure.message.startsWith('OPENAI: ')).toBe(true);
    expect(failure.message).toContain('Settings > Voices');
  });

  it('uses the interceptor text when the payload was already normalized', () => {
    const failure = toTtsFailure(
      null,
      'elevenlabs',
      'ELEVENLABS: The voice quota for this provider is exhausted.',
    );
    expect(failure.message).toContain('voice quota');
    expect(failure.code).toBeUndefined();
  });

  it('uses the caller provider when the payload has none', () => {
    const failure = toTtsFailure({ code: 'VOICE_UNAVAILABLE' }, 'azure');
    expect(failure.provider).toBe('azure');
    expect(failure.message.startsWith('AZURE: ')).toBe(true);
  });

  it('degrades safely on a non-object body', () => {
    const failure = toTtsFailure('503 Service Unavailable');
    expect(failure.code).toBeUndefined();
    expect(failure.provider).toBe('tts');
    expect(failure.message).toContain('AI service is currently unavailable');
  });

  it('ignores blank provider/message values', () => {
    const failure = toTtsFailure(
      { provider: '   ', message: '  ', code: 'INVALID_API_KEY' },
      'google',
    );
    expect(failure.provider).toBe('google');
    expect(failure.message.startsWith('GOOGLE: ')).toBe(true);
  });
});
