import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { User } from './entities/user.entity.js';
import { Post } from '../posts/entities/post.entity.js';
import { Comment, CommentSchema } from '../comments/entities/comment.entity.js';
import { UserPolicy } from './user.policy.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Post]),
    MongooseModule.forFeature([{ name: Comment.name, schema: CommentSchema }]),
  ],
  controllers: [UsersController],
  providers: [UsersService, UserPolicy],
  exports: [UsersService],
})
export class UsersModule {}
