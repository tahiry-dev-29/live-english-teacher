import { describe, it, expect } from 'vitest';
import { formatTime } from './time.util';

describe('time.util', () => {
  it('formats zero seconds as 0:00', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('formats single digit seconds with leading zero', () => {
    expect(formatTime(9)).toBe('0:09');
  });

  it('formats multi-digit seconds correctly', () => {
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(125)).toBe('2:05');
    expect(formatTime(3600)).toBe('60:00');
  });
});
