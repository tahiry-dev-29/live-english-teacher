import { describe, it, expect } from 'vitest';
import { formatMessage, base64ToBlob } from './text.util';

describe('text.util', () => {
  describe('formatMessage', () => {
    it('replaces markdown bold with strong tags', () => {
      expect(formatMessage('Hello **world**')).toBe(
        'Hello <strong>world</strong>',
      );
    });

    it('replaces markdown italic with em tags', () => {
      expect(formatMessage('Hello *world*')).toBe('Hello <em>world</em>');
    });

    it('replaces backticks with code tags', () => {
      expect(formatMessage('Use `npm test` here')).toBe(
        'Use <code>npm test</code> here',
      );
    });

    it('replaces newlines with br tags', () => {
      expect(formatMessage('line1\nline2')).toBe('line1<br>line2');
    });
  });

  describe('base64ToBlob', () => {
    it('converts base64 encoded text to Blob', async () => {
      const originalText = 'Hello World';
      const base64 = btoa(originalText);
      const blob = base64ToBlob(base64, 'text/plain');

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/plain');
      const text = await blob.text();
      expect(text).toBe(originalText);
    });
  });
});
