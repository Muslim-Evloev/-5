import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { Comment, CommentSchema } from './entities/comment.entity.js';
import { Post } from '../posts/entities/post.entity.js';
import { CommentPolicy } from './comment.policy.js';
import { CommentsController } from './comments.controller.js';
import { CommentsService } from './comments.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Comment.name, schema: CommentSchema }]),
    TypeOrmModule.forFeature([Post]),
  ],
  controllers: [CommentsController],
  providers: [CommentsService, CommentPolicy],
  exports: [MongooseModule],
})
export class CommentsModule {}