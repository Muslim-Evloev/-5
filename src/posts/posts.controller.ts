import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Authenticate, CurrentUser } from '@nestjs/authentication';
import { Can } from '@nestjs/authorization';
import type { User } from '../users/entities/user.entity.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';
import { PostPolicy } from './post.policy.js';
import { PostsService } from './posts.service.js';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @ApiBearerAuth()
  @Can(PostPolicy, 'create')
  create(@CurrentUser() user: User, @Body() dto: CreatePostDto) {
    return this.postsService.create(user, dto);
  }

  @Get()
  @Authenticate({ optional: true })
  @Can.Anyone()
  @ApiQuery({
    name: 'order',
    required: false,
    enum: ['desc', 'asc'],
    description: 'Сортировка по дате создания: desc (сначала новые), asc (сначала старые)',
  })
  findAll(
    @CurrentUser() user: User | null,
    @Query('order') order: 'asc' | 'desc' = 'desc',
  ) {
    return this.postsService.findAll(user, order);
  }

  @Get(':id')
  @Authenticate({ optional: true })
  @Can.Anyone()
  findOne(@CurrentUser() user: User | null, @Param('id') id: string) {
    return this.postsService.findOne(user, id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Can.Anyone()
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.postsService.update(user, id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(204)
  @Can.Anyone()
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.postsService.remove(user, id);
  }
}
