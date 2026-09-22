import { describe, it, expect, beforeEach } from 'vitest';
import { ApiKeyService } from './api-key.service';

describe('ApiKeyService', () => {
  let service: ApiKeyService;

  beforeEach(() => {
    localStorage.clear();
    service = new ApiKeyService();
  });

  it('sets and gets custom api keys for providers', () => {
    service.setKey('groq', 'gsk_test123');
    expect(service.getKey('groq')).toBe('gsk_test123');
    expect(service.hasCustomGroqKey()).toBe(true);

    service.setKey('gemini', 'gem_test456');
    expect(service.getKey('gemini')).toBe('gem_test456');
    expect(service.hasCustomGeminiKey()).toBe(true);
  });

  it('clears custom api key properly', () => {
    service.setKey('groq', 'gsk_test123');
    expect(service.getKey('groq')).toBe('gsk_test123');

    service.clearKey('groq');
    expect(service.getKey('groq')).toBe('');
    expect(service.hasCustomGroqKey()).toBe(false);
  });

  it('trims whitespace when setting api keys', () => {
    service.setKey('openai', '   sk-test-spaces   ');
    expect(service.getKey('openai')).toBe('sk-test-spaces');
  });
});
