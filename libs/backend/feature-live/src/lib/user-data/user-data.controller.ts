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
import { UserMemoryService, type OwnerScope } from './user-memory.service';
import { UserProfileService } from './user-profile.service';
import { PromptTagService } from './prompt-tag.service';
import {
  CreateMemoryDto,
  UpdateMemoryDto,
  UpdateProfileDto,
  CreateTagDto,
  UpdateTagDto,
} from './user-data.dto';
import { toScope, toHttp } from './user-data-validation.pipe';

/**
 * Enterprise user data (tasks 85/86/87):
 * GET+POST /api/user/memories — list / add (50 max, server-enforced)
 * PATCH /api/user/memories/:id — edit
 * DELETE /api/user/memories/:id — remove · DELETE /api/user/memories — clear
 * GET /api/user/profile — fetch · PUT /api/user/profile — upsert
 * GET /api/user/tags — defaults + custom
 * POST /api/user/tags — add · PATCH /:name — edit · DELETE /:name — remove
 * POST /api/user/tags/reset — drop all custom tags
 */
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@Controller('user')
export class UserDataController {
  constructor(
    private readonly memories: UserMemoryService,
    private readonly profile: UserProfileService,
    private readonly tags: PromptTagService,
  ) {}

  private scope(deviceKey?: string, userId?: string): OwnerScope {
    return toScope(deviceKey, userId);
  }

  @Get('memories')
  listMemories(
    @Headers('x-device-key') deviceKey?: string,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.memories.list(this.scope(deviceKey, userId));
  }

  @Post('memories')
  async addMemory(
    @Body() dto: CreateMemoryDto,
    @Headers('x-device-key') deviceKey?: string,
    @Headers('x-user-id') userId?: string,
  ) {
    try {
      return await this.memories.add(this.scope(deviceKey, userId), dto.text);
    } catch (error) {
      throw toHttp(error);
    }
  }

  @Patch('memories/:id')
  async updateMemory(
    @Param('id') id: string,
    @Body() dto: UpdateMemoryDto,
    @Headers('x-device-key') deviceKey?: string,
    @Headers('x-user-id') userId?: string,
  ) {
    try {
      return await this.memories.update(
        this.scope(deviceKey, userId),
        id,
        dto.text,
      );
    } catch (error) {
      throw toHttp(error);
    }
  }

  @Delete('memories/:id')
  removeMemory(
    @Param('id') id: string,
    @Headers('x-device-key') deviceKey?: string,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.memories.remove(this.scope(deviceKey, userId), id);
  }

  @Delete('memories')
  clearMemories(
    @Headers('x-device-key') deviceKey?: string,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.memories.clear(this.scope(deviceKey, userId));
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
