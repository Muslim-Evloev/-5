import { ConflictException, Injectable } from '@nestjs/common';
import { PasswordHasher } from '@nestjs/authentication';
import { UsersService } from '../users/users.service.js';
import { User } from '../users/entities/user.entity.js';
import { SignUpDto } from './dto/auth.dto.js';

const normalizeEmail = (email: string) =>
  email.trim().normalize('NFC').toLowerCase();

@Injectable()
export class CredentialsService {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async register(signUpDto: SignUpDto): Promise<User> {
    const email = normalizeEmail(signUpDto.email);
    const { username, password } = signUpDto;
    if (await this.usersService.findByEmail(email)) {
      throw new ConflictException('Email already registered');
    }
    if (await this.usersService.findByUsername(username)) {
      throw new ConflictException('Username already registered');
    }
    try {
      const { id } = await this.usersService.create({
        email,
        username,
        firstName: signUpDto.firstName,
        lastName: signUpDto.lastName,
        passwordHash: await this.passwordHasher.hash(password),
      });
      return (await this.usersService.findOne(id))!;
    } catch (error: unknown) {
      // Код 23505 — ошибка нарушения уникального ограничения (unique_violation) в PostgreSQL
      if ((error as { code?: string })?.code === '23505') {
        throw new ConflictException('Email or username already registered');
      }
      throw error;
    }
  }

  async verify(email: string, password: string): Promise<User | null> {
    const found = await this.usersService.findCredentials(
      normalizeEmail(email),
    );
    const valid = await this.passwordHasher.verify(
      password,
      found?.passwordHash,
    );
    if (!valid || !found) {
      return null;
    }
    if (this.passwordHasher.needsRehash(found.passwordHash)) {
      await this.usersService.updatePasswordHash(
        found.user.id,
        await this.passwordHasher.hash(password),
      );
    }
    return found.user;
  }
}