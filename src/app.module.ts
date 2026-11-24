import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthenticationModule } from '@nestjs/authentication';
import { AuthorizationModule } from '@nestjs/authorization';
import { UsersModule } from './users/users.module.js';
import { PostsModule } from './posts/posts.module.js';
import { CommentsModule } from './comments/comments.module.js';
import { AuthModule } from './auth/auth.module.js';
import { User } from './users/entities/user.entity.js';
import { Post } from './posts/entities/post.entity.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthenticationModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        session: {
          absoluteTtl: '14d',
          idleTtl: '3d',
        },
        accessToken: {
          key: config.getOrThrow<string>('JWT_SECRET'),
          issuer: config.get<string>('JWT_ISSUER', 'social-network'),
          audience: config.get<string>('JWT_AUDIENCE', 'social-network-app'),
          ttl: '15m',
        },
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: Number(config.get<string>('DB_PORT', '5432')),
        username: config.getOrThrow<string>('DB_USERNAME'),
        password: config.getOrThrow<string>('DB_PASSWORD'),
        database: config.getOrThrow<string>('DB_DATABASE'),
        entities: [User, Post],
        synchronize: true,
      }),
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
      }),
    }),
    UsersModule,
    PostsModule,
    CommentsModule,
    AuthorizationModule.forRoot(),
    AuthModule,
  ],
})
export class AppModule {}