import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { AuthorizationService } from '@nestjs/authorization';
import { Repository } from 'typeorm';
import { Model } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { User } from './entities/user.entity.js';
import { Post } from '../posts/entities/post.entity.js';
import { Comment, CommentDocument } from '../comments/entities/comment.entity.js';
import { UserPolicy } from './user.policy.js';

export type UserProfile = Omit<User, 'passwordHash' | 'email'> & {
  email?: string;
  stats: string[];
};

const definedOnly = <T extends object>(dto: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(dto).filter(([, value]) => value !== undefined),
  ) as Partial<T>;

const isInvalidUuidError = (error: unknown): boolean =>
  (error as { code?: string })?.code === '22P02';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Post)
    private readonly postsRepository: Repository<Post>,
    @InjectModel(Comment.name)
    private readonly commentModel: Model<CommentDocument>,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const entity = this.usersRepository.create(createUserDto);
    const saved = await this.usersRepository.save(entity);
    const { passwordHash: _ignored, ...safeUser } = saved;
    return safeUser as User;
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOne(id: string): Promise<User | null> {
    try {
      return await this.usersRepository.findOne({ where: { id } });
    } catch (error: unknown) {
      if (isInvalidUuidError(error)) return null;
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    return this.findOne(id);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async findCredentials(email: string) {
    const userWithHash = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();

    if (!userWithHash?.passwordHash) {
      return undefined;
    }

    const { passwordHash, ...user } = userWithHash;
    return { user: user as User, passwordHash };
  }

  async updatePasswordHash(id: string, passwordHash: string) {
    await this.usersRepository.update({ id }, { passwordHash });
  }

  async listProfiles(viewer: User | null): Promise<UserProfile[]> {
    const users = await this.findAll();
    return Promise.all(users.map((user) => this.toProfile(viewer, user)));
  }

  async getProfile(viewer: User | null, id: string): Promise<UserProfile> {
    const target = await this.getOrFail(id);
    await this.authorizationService.authorize(UserPolicy, 'view', viewer, target);
    return this.toProfile(viewer, target);
  }

  async updateProfile(viewer: User, id: string, dto: UpdateUserDto): Promise<UserProfile> {
    const target = await this.getOrFail(id);
    await this.authorizationService.authorize(UserPolicy, 'update', viewer, target);

    try {
      Object.assign(target, definedOnly(dto));
      const updated = await this.usersRepository.save(target);
      return this.toProfile(viewer, updated);
    } catch (error: unknown) {
      if ((error as { code?: string })?.code === '23505') {
        throw new ConflictException('Username already registered');
      }
      throw error;
    }
  }

  async removeProfile(viewer: User, id: string) {
    const target = await this.getOrFail(id);
    await this.authorizationService.authorize(UserPolicy, 'delete', viewer, target);
    await this.usersRepository.delete({ id });
    await this.postsRepository.delete({ authorId: id });
    await this.commentModel.deleteMany({ authorId: id }).exec();
  }

  private async getOrFail(id: string): Promise<User> {
    const user = await this.findOne(id);
    if (!user) throw new NotFoundException();
    return user;
  }

  private async toProfile(viewer: User | null, user: User): Promise<UserProfile> {
    const [postsCount, commentsCount] = await Promise.all([
      this.postsRepository.count({ where: { authorId: user.id } }),
      this.commentModel.countDocuments({ authorId: user.id }).exec(),
    ]);

    const stats = [
      `Создано постов: ${postsCount}`,
      `Написано комментариев: ${commentsCount}`,
    ];

    if (viewer?.id === user.id) {
      return { ...user, stats };
    }
    const { email, ...profile } = user;
    return { ...profile, stats };
  }
}