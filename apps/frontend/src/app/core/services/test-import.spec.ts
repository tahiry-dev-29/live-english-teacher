import { describe, it, expect } from 'vitest';
import { GEMINI_CONFIG } from '@shared/constants';

describe('Import test', () => {
  it('should have GEMINI_CONFIG defined', () => {
    console.log('GEMINI_CONFIG:', GEMINI_CONFIG);
    console.log('GEMINI_CONFIG.apiBaseUrl:', GEMINI_CONFIG?.apiBaseUrl);
    expect(GEMINI_CONFIG).toBeDefined();
    expect(GEMINI_CONFIG.apiBaseUrl).toBeDefined();
  });
});
