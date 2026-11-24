import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Authenticate, CurrentUser } from '@nestjs/authentication';
import { Can } from '@nestjs/authorization';
import { UpdateUserDto } from './dto/update-user.dto.js';
import type { User } from './entities/user.entity.js';
import { UserPolicy } from './user.policy.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Только для role === 'admin', обычному пользователю вернёт 403
  @Get()
  @ApiBearerAuth()
  @Can(UserPolicy, 'list')
  findAll(@CurrentUser() user: User | null) {
    return this.usersService.listProfiles(user);
  }

  @Get(':id')
  @Authenticate({ optional: true })
  @Can.Anyone()
  findOne(
    @CurrentUser() user: User | null,
    @Param('id') id: string,
  ) {
    return this.usersService.getProfile(user, id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Can.Anyone()
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateProfile(user, id, dto);
  }

  // Только для role === 'admin', обычному пользователю вернёт 403
  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(204)
  @Can.Anyone()
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.usersService.removeProfile(user, id);
  }
}
