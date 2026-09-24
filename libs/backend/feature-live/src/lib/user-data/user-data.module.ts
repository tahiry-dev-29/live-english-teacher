import { Module } from '@nestjs/common';
import { DataAccessPrismaModule } from '@live-languages-teacher/data-access-prisma';
import { UserMemoryService } from './user-memory.service';
import { UserProfileService } from './user-profile.service';
import { PromptTagService } from './prompt-tag.service';
import { UserDataController } from './user-data.controller';

@Module({
  imports: [DataAccessPrismaModule],
  controllers: [UserDataController],
  providers: [UserMemoryService, UserProfileService, PromptTagService],
  exports: [UserMemoryService, UserProfileService, PromptTagService],
})
export class UserDataModule {}
