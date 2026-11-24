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
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { UpdateCommentDto } from './dto/update-comment.dto.js';
import { CommentsService } from './comments.service.js';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @ApiBearerAuth()
  @Can.Anyone()
  create(@CurrentUser() user: User, @Body() dto: CreateCommentDto) {
    return this.commentsService.create(user, dto);
  }

  @Get()
  @Authenticate({ optional: true })
  @Can.Anyone()
  @ApiQuery({ name: 'postId', required: false, description: 'Фильтр по ID поста' })
  @ApiQuery({
    name: 'order',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Сортировка по дате создания: asc (сначала старые), desc (сначала новые)',
  })
  findAll(
    @Query('postId') postId?: string,
    @Query('order') order: 'asc' | 'desc' = 'asc',
  ) {
    return this.commentsService.findAll(postId, order);
  }

  @Get('stats')
  @Authenticate({ optional: true })
  @Can.Anyone()
  @ApiQuery({ name: 'postId', required: false, description: 'Фильтр статистики по ID поста' })
  getStats(@Query('postId') postId?: string) {
    return this.commentsService.getStatsByAuthor(postId);
  }

  @Get(':id')
  @Authenticate({ optional: true })
  @Can.Anyone()
  findOne(@Param('id') id: string) {
    return this.commentsService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Can.Anyone()
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.commentsService.update(user, id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(204)
  @Can.Anyone()
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.commentsService.remove(user, id);
  }
}
