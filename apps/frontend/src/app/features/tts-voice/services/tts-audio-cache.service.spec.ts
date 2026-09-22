import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TtsAudioCacheService } from './tts-audio-cache.service';

/* jsdom ships no IndexedDB — the service must degrade to L1-only. */
const blobOf = (text: string): Blob => new Blob([text], { type: 'audio/mpeg' });

describe('TtsAudioCacheService', () => {
  let service: TtsAudioCacheService;

  beforeEach(() => {
    vi.restoreAllMocks();
    service = new TtsAudioCacheService();
  });

  describe('buildKey', () => {
    it('is deterministic and order-sensitive', async () => {
      const a = await service.buildKey(['hello', 'v1', 'm1', 'p1']);
      const b = await service.buildKey(['hello', 'v1', 'm1', 'p1']);
      const c = await service.buildKey(['hello', 'v2', 'm1', 'p1']);
      expect(a).toBe(b);
      expect(a).not.toBe(c);
    });

    it('treats null/undefined parts as empty strings', async () => {
      const a = await service.buildKey(['x', undefined, 'p']);
      const b = await service.buildKey(['x', null, 'p']);
      expect(a).toBe(b);
    });
  });

  describe('L1 memory tier', () => {
    it('returns the same Blob instance on repeat gets', async () => {
      const blob = blobOf('audio-a');
      await service.put('k1', blob);
      expect(await service.get('k1')).toBe(blob);
    });

    it('returns null for unknown keys (L2 read must not throw)', async () => {
      expect(await service.get('missing')).toBeNull();
    });
  });

  describe('getOrFetch', () => {
    it('calls the fetcher on miss and caches the result', async () => {
      const fetcher = vi.fn().mockResolvedValue(blobOf('fresh'));
      const first = await service.getOrFetch('k2', fetcher);
      const second = await service.getOrFetch('k2', fetcher);

      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(first).toBe(second);
    });

    it('collapses concurrent identical requests into one fetch', async () => {
      let release!: (b: Blob) => void;
      const gate = new Promise<Blob>((resolve) => (release = resolve));
      const fetcher = vi.fn().mockReturnValue(gate);

      const p1 = service.getOrFetch('k3', fetcher);
      const p2 = service.getOrFetch('k3', fetcher);
      const blob = blobOf('shared');
      release(blob);

      expect(await p1).toBe(blob);
      expect(await p2).toBe(blob);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('never caches a rejected fetch and clears the in-flight entry', async () => {
      const fetcher = vi
        .fn()
        .mockRejectedValueOnce(new Error('api down'))
        .mockResolvedValueOnce(blobOf('recovered'));

      await expect(service.getOrFetch('k4', fetcher)).rejects.toThrow(
        'api down',
      );
      await expect(service.getOrFetch('k4', fetcher)).resolves.toMatchObject({
        type: 'audio/mpeg',
      });
      expect(fetcher).toHaveBeenCalledTimes(2);
    });
  });
});
