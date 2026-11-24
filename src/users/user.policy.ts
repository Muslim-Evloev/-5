import { Policy } from '@nestjs/authorization';
import type { User } from './entities/user.entity.js';

@Policy()
export class UserPolicy {
  list(user: User | null) {
    return user?.role === 'admin';
  }

  view(_user: User | null, _target: User) {
    return true;
  }

  update(user: User, target: User) {
    return user.role === 'admin' || user.id === target.id;
  }

  delete(user: User, _target: User) {
    return user.role === 'admin';
  }
}
