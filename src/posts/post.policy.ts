import { Policy } from '@nestjs/authorization';
import type { User } from '../users/entities/user.entity.js';
import type { Post } from './entities/post.entity.js';

@Policy()
export class PostPolicy {
  view(user: User | null, post: Post) {
    return post.published || user?.role === 'admin' || post.authorId === user?.id;
  }

  create(user: User | null) {
    return !!user;
  }

  update(user: User | null, post: Post) {
    if (!user) return false;
    return user.role === 'admin' || post.authorId === user.id;
  }

  delete(user: User | null, post: Post) {
    if (!user) return false;
    return user.role === 'admin' || post.authorId === user.id;
  }
}
