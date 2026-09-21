/**
 * Unit tests — UserProfileService (task 86, enterprise DB).
 * Inline re-implementation without NestJS decorators (repo pattern).
 * Covers: null default, upsert create/update, trim, scoped isolation,
 *         buildContext rendering.
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MockPrismaService } from '../testing/mock-prisma.service.ts';

class UserProfileService {
  constructor(private readonly prisma: MockPrismaService) {}

  get(scope: { userId?: string; deviceKey: string }) {
    return (this.prisma as any).userProfile.findFirst({
      where: scope.userId
        ? { userId: scope.userId }
        : { deviceKey: scope.deviceKey },
    });
  }

  async update(
    scope: { userId?: string; deviceKey: string },
    partial: {
      displayName?: string;
      profession?: string;
      specialization?: string;
    },
  ) {
    const existing = await this.get(scope);
    const pick = (next: string | undefined, current: string) =>
      next !== undefined ? next.trim() : current;
    const data = {
      displayName: pick(partial.displayName, existing?.displayName ?? ''),
      profession: pick(partial.profession, existing?.profession ?? ''),
      specialization: pick(
        partial.specialization,
        existing?.specialization ?? '',
      ),
    };
    if (existing) {
      return (this.prisma as any).userProfile.update({
        where: { id: existing.id },
        data,
      });
    }
    return (this.prisma as any).userProfile.create({
      data: { userId: scope.userId, deviceKey: scope.deviceKey, ...data },
    });
  }

  async buildContext(scope: {
    userId?: string;
    deviceKey: string;
  }): Promise<string> {
    const profile = await this.get(scope);
    if (!profile) return '';
    const parts: string[] = [];
    if (profile.displayName.trim())
      parts.push(`User: ${profile.displayName.trim()}`);
    if (profile.profession.trim())
      parts.push(`profession: ${profile.profession.trim()}`);
    if (profile.specialization.trim())
      parts.push(`specialised in ${profile.specialization.trim()}`);
    return parts.join(', ');
  }
}

describe('UserProfileService', () => {
  let prisma: MockPrismaService;
  let service: UserProfileService;
  const scope = { deviceKey: 'dev-1' };

  beforeEach(() => {
    prisma = new MockPrismaService();
    prisma.reset();
    service = new UserProfileService(prisma);
  });

  it('returns null when no profile exists', async () => {
    assert.equal(await service.get(scope), null);
    assert.equal(await service.buildContext(scope), '');
  });

  it('creates then updates a single row per device', async () => {
    await service.update(scope, { displayName: '  Tahiry  ' });
    await service.update(scope, { profession: 'Teacher' });
    const profile = await service.get(scope);
    assert.equal(profile.displayName, 'Tahiry');
    assert.equal(profile.profession, 'Teacher');
    assert.equal(prisma.profiles.length, 1);
  });

  it('isolates profiles per device', async () => {
    await service.update(scope, { displayName: 'A' });
    assert.equal(await service.get({ deviceKey: 'other' }), null);
  });

  it('builds a compact prompt context', async () => {
    await service.update(scope, {
      displayName: 'Tahiry',
      profession: 'Teacher',
      specialization: 'kids',
    });
    const ctx = await service.buildContext(scope);
    assert.match(ctx, /User: Tahiry/);
    assert.match(ctx, /profession: Teacher/);
    assert.match(ctx, /specialised in kids/);
  });
});
