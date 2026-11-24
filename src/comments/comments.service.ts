import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { AuthorizationService } from '@nestjs/authorization';
import { Repository } from 'typeorm';
import { isValidObjectId, Model, PipelineStage } from 'mongoose';
import type { User } from '../users/entities/user.entity.js';
import { Post } from '../posts/entities/post.entity.js';
import { Comment, CommentDocument } from './entities/comment.entity.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { UpdateCommentDto } from './dto/update-comment.dto.js';
import { CommentPolicy } from './comment.policy.js';

export type CommentResponse = Comment & {
  createdLabel: string;
  updatedLabel?: string;
};

const isInvalidUuidError = (error: unknown): boolean =>
  (error as { code?: string })?.code === '22P02';

function pluralizeRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} ${few}`;
  return `${n} ${many}`;
}

function formatRelativeTime(prefix: 'Создан' | 'Обновлён', date: Date): string {
  const diffSec = Math.max(1, Math.floor((Date.now() - new Date(date).getTime()) / 1000));

  if (diffSec < 60) {
    return `${prefix} ${pluralizeRu(diffSec, 'секунду', 'секунды', 'секунд')} назад`;
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${prefix} ${pluralizeRu(diffMin, 'минуту', 'минуты', 'минут')} назад`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `${prefix} ${pluralizeRu(diffHours, 'час', 'часа', 'часов')} назад`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return `${prefix} ${pluralizeRu(diffDays, 'день', 'дня', 'дней')} назад`;
  }
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `${prefix} ${pluralizeRu(diffMonths, 'месяц', 'месяца', 'месяцев')} назад`;
  }
  const diffYears = Math.floor(diffDays / 365);
  return `${prefix} ${pluralizeRu(diffYears, 'год', 'года', 'лет')} назад`;
}

function formatComment(comment: Comment): CommentResponse {
  const createdMs = new Date(comment.createdAt).getTime();
  const updatedMs = new Date(comment.updatedAt).getTime();
  const isEdited = updatedMs - createdMs >= 1000;

  return {
    id: comment.id,
    content: comment.content,
    postId: comment.postId,
    authorId: comment.authorId,
    createdAt: comment.createdAt,
    createdLabel: formatRelativeTime('Создан', comment.createdAt),
    updatedAt: comment.updatedAt,
    ...(isEdited ? { updatedLabel: formatRelativeTime('Обновлён', comment.updatedAt) } : {}),
  };
}

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name) private readonly commentModel: Model<CommentDocument>,
    @InjectRepository(Post) private readonly postsRepository: Repository<Post>,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async create(user: User, dto: CreateCommentDto): Promise<CommentResponse> {
    let post: Post | null = null;
    try {
      post = await this.postsRepository.findOne({ where: { id: dto.postId } });
    } catch (error: unknown) {
      if (!isInvalidUuidError(error)) throw error;
    }

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    await this.authorizationService.authorize(CommentPolicy, 'create', user, post);

    const created = await this.commentModel.create({
      content: dto.content,
      postId: dto.postId,
      authorId: user.id,
    });
    return formatComment(created.toJSON() as Comment);
  }

  async findAll(postId?: string, order: 'asc' | 'desc' = 'asc'): Promise<CommentResponse[]> {
    const sortDirection = order === 'desc' ? -1 : 1;
    const pipeline: PipelineStage[] = [];

    if (postId) {
      pipeline.push({ $match: { postId } });
    }

    pipeline.push(
      { $sort: { createdAt: sortDirection } },
      {
        $project: {
          _id: 0,
          id: { $toString: '$_id' },
          content: 1,
          postId: 1,
          authorId: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    );

    const comments = await this.commentModel.aggregate<Comment>(pipeline).exec();
    return comments.map(formatComment);
  }

  async getStatsByAuthor(postId?: string) {
    const pipeline: PipelineStage[] = [];

    if (postId) {
      pipeline.push({ $match: { postId } });
    }

    pipeline.push(
      {
        $group: {
          _id: '$authorId',
          commentsCount: { $sum: 1 },
          lastCommentAt: { $max: '$createdAt' },
        },
      },
      { $sort: { commentsCount: -1 } },
      {
        $project: {
          _id: 0,
          authorId: '$_id',
          commentsCount: 1,
          lastCommentAt: 1,
        },
      },
    );

    return this.commentModel.aggregate(pipeline).exec();
  }

  async findOne(id: string): Promise<CommentResponse> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Comment not found');
    }
    const doc = await this.commentModel.findById(id).exec();
    if (!doc) {
      throw new NotFoundException('Comment not found');
    }
    return formatComment(doc.toJSON() as Comment);
  }

  async update(user: User, id: string, dto: UpdateCommentDto): Promise<CommentResponse> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Comment not found');
    }
    const existing = await this.commentModel.findById(id).exec();
    if (!existing) {
      throw new NotFoundException('Comment not found');
    }

    const comment = existing.toJSON() as Comment;
    await this.authorizationService.authorize(CommentPolicy, 'update', user, comment);

    const updated = await this.commentModel
      .findByIdAndUpdate(
        id,
        { ...(dto.content !== undefined ? { content: dto.content } : {}) },
        { new: true },
      )
      .exec();

    return formatComment(updated!.toJSON() as Comment);
  }

  async remove(user: User, id: string): Promise<void> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Comment not found');
    }
    const existing = await this.commentModel.findById(id).exec();
    if (!existing) {
      throw new NotFoundException('Comment not found');
    }

    const comment = existing.toJSON() as Comment;
    await this.authorizationService.authorize(CommentPolicy, 'delete', user, comment);

    await this.commentModel.findByIdAndDelete(id).exec();
  }
}
