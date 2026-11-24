import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { Post } from './entities/post.entity.js';
import { Comment, CommentSchema } from '../comments/entities/comment.entity.js';
import { PostPolicy } from './post.policy.js';
import { PostsController } from './posts.controller.js';
import { PostsService } from './posts.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post]),
    MongooseModule.forFeature([{ name: Comment.name, schema: CommentSchema }]),
  ],
  controllers: [PostsController],
  providers: [PostsService, PostPolicy],
  exports: [PostsService],
})
export class PostsModule {}