import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { AuthorizationService } from '@nestjs/authorization';
import { Repository } from 'typeorm';
import { Model } from 'mongoose';
import type { User } from '../users/entities/user.entity.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';
import { Post } from './entities/post.entity.js';
import {
  Comment,
  CommentDocument,
} from '../comments/entities/comment.entity.js';
import { PostPolicy } from './post.policy.js';

export type PostResponse = Omit<Post, 'author'> & {
  createdLabel: string;
  updatedLabel?: string;
};

type CommentWithLabels = Comment & {
  createdLabel: string;
  updatedLabel?: string;
};

const definedOnly = <T extends object>(dto: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(dto).filter(([, value]) => value !== undefined),
  ) as Partial<T>;

const isInvalidUuidError = (error: unknown): boolean =>
  (error as { code?: string })?.code === '22P02';

function pluralizeRu(
  n: number,
  one: string,
  few: string,
  many: string,
): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14))
    return `${n} ${few}`;
  return `${n} ${many}`;
}

function formatRelativeTime(prefix: 'Создан' | 'Обновлён', date: Date): string {
  const diffSec = Math.max(
    1,
    Math.floor((Date.now() - new Date(date).getTime()) / 1000),
  );

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

function formatPost(post: Post): PostResponse {
  const createdMs = new Date(post.createdAt).getTime();
  const updatedMs = post.updatedAt
    ? new Date(post.updatedAt).getTime()
    : createdMs;
  const isEdited = updatedMs - createdMs >= 1000;

  return {
    id: post.id,
    content: post.content,
    published: post.published,
    authorId: post.authorId,
    createdAt: post.createdAt,
    createdLabel: formatRelativeTime('Создан', post.createdAt),
    updatedAt: post.updatedAt,
    ...(isEdited
      ? { updatedLabel: formatRelativeTime('Обновлён', post.updatedAt) }
      : {}),
  };
}

function formatComment(comment: Comment): CommentWithLabels {
  const createdMs = new Date(comment.createdAt).getTime();
  const updatedMs = comment.updatedAt
    ? new Date(comment.updatedAt).getTime()
    : createdMs;
  const isEdited = updatedMs - createdMs >= 1000;

  return {
    id: comment.id,
    content: comment.content,
    postId: comment.postId,
    authorId: comment.authorId,
    createdAt: comment.createdAt,
    createdLabel: formatRelativeTime('Создан', comment.createdAt),
    updatedAt: comment.updatedAt,
    ...(isEdited
      ? { updatedLabel: formatRelativeTime('Обновлён', comment.updatedAt) }
      : {}),
  };
}

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postsRepository: Repository<Post>,
    @InjectModel(Comment.name)
    private readonly commentModel: Model<CommentDocument>,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async create(user: User, dto: CreatePostDto): Promise<PostResponse> {
    const created = this.postsRepository.create({ ...dto, authorId: user.id });
    const saved = await this.postsRepository.save(created);
    return formatPost(saved);
  }

  async findAll(user: User | null, order: 'asc' | 'desc' = 'desc') {
    const sortDirection = order === 'asc' ? 'ASC' : 'DESC';

    const qb = this.postsRepository
      .createQueryBuilder('post')
      .orderBy('post.createdAt', sortDirection);

    if (user) {
      qb.where('post.published = :published OR post.authorId = :authorId', {
        published: true,
        authorId: user.id,
      });
    } else {
      qb.where('post.published = :published', { published: true });
    }

    const posts = await qb.getMany();

    const postIds = posts.map((p) => p.id);
    const commentDocs =
      postIds.length > 0
        ? await this.commentModel
            .find({ postId: { $in: postIds } })
            .sort({ createdAt: 1 })
            .exec()
        : [];

    const commentsByPost = new Map<string, CommentWithLabels[]>();
    for (const cDoc of commentDocs) {
      const comment = formatComment(cDoc.toJSON() as Comment);
      const list = commentsByPost.get(comment.postId) ?? [];
      list.push(comment);
      commentsByPost.set(comment.postId, list);
    }

    return posts.map((post) => ({
      ...formatPost(post),
      comments: commentsByPost.get(post.id) ?? [],
    }));
  }

  async findOne(user: User | null, id: string) {
    const post = await this.find(id);
    await this.authorizationService.authorize(PostPolicy, 'view', user, post);

    const commentDocs = await this.commentModel
      .find({ postId: post.id })
      .sort({ createdAt: 1 })
      .exec();

    return {
      ...formatPost(post),
      comments: commentDocs.map((c) => formatComment(c.toJSON() as Comment)),
    };
  }

  async update(
    user: User,
    id: string,
    dto: UpdatePostDto,
  ): Promise<PostResponse> {
    const post = await this.find(id);
    await this.authorizationService.authorize(PostPolicy, 'update', user, post);

    Object.assign(post, definedOnly(dto));
    const saved = await this.postsRepository.save(post);
    return formatPost(saved);
  }

  async remove(user: User, id: string) {
    const post = await this.find(id);
    await this.authorizationService.authorize(PostPolicy, 'delete', user, post);
    await this.postsRepository.delete({ id });
    await this.commentModel.deleteMany({ postId: id }).exec();
  }

  async find(id: string): Promise<Post> {
    try {
      const post = await this.postsRepository.findOne({ where: { id } });
      if (!post) throw new NotFoundException();
      return post;
    } catch (error: unknown) {
      if (isInvalidUuidError(error)) throw new NotFoundException();
      throw error;
    }
  }
}