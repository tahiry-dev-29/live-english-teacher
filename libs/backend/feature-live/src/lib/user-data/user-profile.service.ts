import { Injectable } from '@nestjs/common';
import { PrismaService } from '@live-languages-teacher/data-access-prisma';
import type { OwnerScope } from './user-memory.service';

export interface ProfileUpdate {
  displayName?: string;
  profession?: string;
  specialization?: string;
}

/**
 * Server-side user profile (task 86, enterprise: DB is the source of truth).
 * One row per owner (unique deviceKey, unique userId).
 */
@Injectable()
export class UserProfileService {
  constructor(private readonly prisma: PrismaService) {}

  get(scope: OwnerScope) {
    return this.prisma.userProfile.findFirst({
      where: scope.userId
        ? { userId: scope.userId }
        : { deviceKey: scope.deviceKey },
    });
  }

  async update(scope: OwnerScope, partial: ProfileUpdate) {
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
      return this.prisma.userProfile.update({
        where: { id: existing.id },
        data,
      });
    }
    return this.prisma.userProfile.create({
      data: {
        userId: scope.userId,
        deviceKey: scope.deviceKey,
        ...data,
      },
    });
  }

  async buildContext(scope: OwnerScope): Promise<string> {
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
