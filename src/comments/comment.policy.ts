import { Policy } from '@nestjs/authorization';
import type { User } from '../users/entities/user.entity.js';
import type { Post } from '../posts/entities/post.entity.js';
import type { Comment } from './entities/comment.entity.js';

@Policy()
export class CommentPolicy {
  create(user: User | null, post: Post) {
    if (!user) return false;
    return post.published || user.role === 'admin' || post.authorId === user.id;
  }

  update(user: User | null, comment: Comment) {
    if (!user) return false;
    return user.role === 'admin' || comment.authorId === user.id;
  }

  delete(user: User | null, comment: Comment) {
    if (!user) return false;
    return user.role === 'admin' || comment.authorId === user.id;
  }
}
