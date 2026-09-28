import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Put,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { OwnerScope } from './user-memory.service';
import { UserProfileService } from './user-profile.service';
import { PromptTagService } from './prompt-tag.service';
import { UpdateProfileDto, CreateTagDto, UpdateTagDto } from './user-data.dto';
import { toHttp, toScope } from './user-data-validation.pipe';

/**
 * Enterprise user data (tasks 85/86/87): profile + prompt tags.
 * Memory routes live in `UserMemoryController` (task 105 split).
 * GET /api/user/profile — fetch · PUT /api/user/profile — upsert
 * GET /api/user/tags — defaults + custom
 * POST /api/user/tags — add · PATCH /:name — edit · DELETE /:name — remove
 * POST /api/user/tags/reset — drop all custom tags
 */
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@Controller('user')
export class UserDataController {
  constructor(
    private readonly profile: UserProfileService,
    private readonly tags: PromptTagService,
  ) {}

  private scope(deviceKey?: string, userId?: string): OwnerScope {
    return toScope(deviceKey, userId);
  }

  @Get('profile')
  getProfile(
    @Headers('x-device-key') deviceKey?: string,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.profile.get(this.scope(deviceKey, userId));
  }

  @Put('profile')
  updateProfile(
    @Body() dto: UpdateProfileDto,
    @Headers('x-device-key') deviceKey?: string,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.profile.update(this.scope(deviceKey, userId), dto);
  }

  @Get('tags')
  listTags(
    @Headers('x-device-key') deviceKey?: string,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.tags.list(this.scope(deviceKey, userId));
  }

  @Post('tags')
  async addTag(
    @Body() dto: CreateTagDto,
    @Headers('x-device-key') deviceKey?: string,
    @Headers('x-user-id') userId?: string,
  ) {
    try {
      return await this.tags.add(this.scope(deviceKey, userId), dto);
    } catch (error) {
      throw toHttp(error);
    }
  }

  @Patch('tags/:name')
  async updateTag(
    @Param('name') name: string,
    @Body() dto: UpdateTagDto,
    @Headers('x-device-key') deviceKey?: string,
    @Headers('x-user-id') userId?: string,
  ) {
    try {
      return await this.tags.update(
        this.scope(deviceKey, userId),
        name,
        dto.description,
      );
    } catch (error) {
      throw toHttp(error);
    }
  }

  @Delete('tags/reset')
  resetTags(
    @Headers('x-device-key') deviceKey?: string,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.tags.reset(this.scope(deviceKey, userId));
  }

  @Delete('tags/:name')
  removeTag(
    @Param('name') name: string,
    @Headers('x-device-key') deviceKey?: string,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.tags.remove(this.scope(deviceKey, userId), name);
  }
}
