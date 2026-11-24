import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CommentDocument = HydratedDocument<Comment>;

@Schema({
  timestamps: { createdAt: true, updatedAt: true },
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: Record<string, unknown>) => {
      ret.id = String(ret._id);
      delete ret._id;
    },
  },
})
export class Comment {
  id: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true, index: true })
  postId: string;

  @Prop({ required: true, index: true })
  authorId: string;

  createdAt: Date;
  updatedAt: Date;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);