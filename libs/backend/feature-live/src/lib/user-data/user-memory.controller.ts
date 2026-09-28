import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { UserMemoryService, type OwnerScope } from './user-memory.service';
import {
  CreateMemoryDto,
  MemoryContextQueryDto,
  UpdateMemoryDto,
} from './user-data.dto';
import {
  requireOwner,
  toHttp,
  toScope,
  toWriteScope,
} from './user-data-validation.pipe';

/**
 * Memory routes (task 105 model scoping, split from UserDataController):
 * GET /api/user/memories?model=… — globals + model ({ items, maxMemories })
 * GET /api/user/memories/context?model=… — prompt-ready string for the chat
 * POST /api/user/memories — add (scope global|model, owner-only)
 * PATCH /api/user/memories/:id — edit (owner-only)
 * DELETE /api/user/memories/:id — remove (owner-only)
 * DELETE /api/user/memories — clear the visible scope (owner-only)
 */
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@Controller('user')
export class UserMemoryController {
  constructor(private readonly memories: UserMemoryService) {}

  private scope(
    deviceKey?: string,
    userId?: string,
    aiModel?: string,
  ): OwnerScope {
    return toScope(deviceKey, userId, aiModel);
  }

  @Get('memories')
  async listMemories(
    @Query() query: MemoryContextQueryDto,
    @Headers('x-device-key') deviceKey?: string,
    @Headers('x-user-id') userId?: string,
  ) {
    const items = await this.memories.list(
      this.scope(deviceKey, userId, query.model),
    );
    return { items, maxMemories: UserMemoryService.MAX_MEMORIES };
  }

  @Get('memories/context')
  async memoryContext(
    @Query() query: MemoryContextQueryDto,
    @Headers('x-device-key') deviceKey?: string,
    @Headers('x-user-id') userId?: string,
  ) {
    const scope = this.scope(deviceKey, userId, query.model);
    const context = await this.memories.buildPromptContext(scope);
    return { context, maxMemories: UserMemoryService.MAX_MEMORIES };
  }

  @Post('memories')
  async addMemory(
    @Body() dto: CreateMemoryDto,
    @Headers('x-device-key') deviceKey?: string,
    @Headers('x-user-id') userId?: string,
    @Headers('x-ai-model') aiModel?: string,
  ) {
    const scope = this.scope(deviceKey, userId, aiModel);
    requireOwner(scope);
    try {
      return await this.memories.add(toWriteScope(scope, dto.scope), dto.text);
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
    const scope = this.scope(deviceKey, userId);
    requireOwner(scope);
    try {
      return await this.memories.update(scope, id, dto.text);
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
    const scope = this.scope(deviceKey, userId);
    requireOwner(scope);
    return this.memories.remove(scope, id);
  }

  @Delete('memories')
  clearMemories(
    @Headers('x-device-key') deviceKey?: string,
    @Headers('x-user-id') userId?: string,
    @Headers('x-ai-model') aiModel?: string,
  ) {
    const scope = this.scope(deviceKey, userId, aiModel);
    requireOwner(scope);
    return this.memories.clear(scope);
  }
}
